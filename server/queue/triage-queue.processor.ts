import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CacheService } from "../redis/cache.service";
import { TriageResult } from "../database/entities";
import { TRIAGE_QUEUE } from "./queue.constants";
import { calculateRiskScore, mapRiskToCategory } from "../../shared/triage";
import { invokeLLM } from "../_core/llm";

export interface TriageJob {
  patientId: number;
  facilityId: number;
  serviceType: string;
  screeningData: Record<string, unknown>;
  /** Free-text symptom description for AI-assisted classification (optional). */
  symptomText?: string;
  clinicianOverride?: {
    careCategory: string;
    reason: string;
  };
}

const TRIAGE_PROMPT = (symptomText: string) =>
  `You are a rural healthcare triage assistant. Classify the patient's urgency into exactly one category: "emergency", "urgent", "priority", or "routine". Return ONLY a JSON object of the form {"category":"...","reason":"one short plain sentence"}. Use conservative judgement: danger signs (breathing difficulty, chest pain, severe bleeding, altered consciousness, high fever in young children/elderly) elevate to emergency or urgent. Do not diagnose the patient.`;

type LlmTriageResult = { category: "emergency" | "urgent" | "priority" | "routine"; reason?: string };

@Processor(TRIAGE_QUEUE)
export class TriageQueueProcessor {
  private readonly logger = new Logger(TriageQueueProcessor.name);

  constructor(
    private readonly cache: CacheService,
    @InjectRepository(TriageResult) private readonly triageRepo: Repository<TriageResult>,
  ) {}

  @Process("assess")
  async handleAssess(job: Job<TriageJob>) {
    const { patientId, facilityId, serviceType, screeningData, symptomText, clinicianOverride } = job.data;

    if (clinicianOverride) {
      const result = {
        patientId,
        facilityId,
        careCategory: clinicianOverride.careCategory,
        reason: clinicianOverride.reason,
        assessedBy: "clinician_override",
        assessedAt: Date.now(),
      };

      await this.cache.set(`triage:result:${patientId}`, result, 3600);

      try {
        const dbResult = this.triageRepo.create({
          patientId,
          facilityId,
          careCategory: clinicianOverride.careCategory,
          riskScore: 0,
          serviceType,
          reason: clinicianOverride.reason,
          assessedBy: "clinician_override",
          screeningData,
          assessedAt: new Date(),
        });
        await this.triageRepo.save(dbResult);
      } catch (error) {
        this.logger.error(`Failed to persist triage override for patient ${patientId}:`, error);
      }

      this.logger.log(`Triage override for patient ${patientId}: ${clinicianOverride.careCategory}`);
      return result;
    }

    // AI-assisted classification from free-text symptoms first, then rule scoring.
    const llm = symptomText && symptomText.trim().length > 0
      ? await this.classifyWithLLM(symptomText)
      : null;

    const riskScore = calculateRiskScore(screeningData);
    const ruleCategory = mapRiskToCategory(riskScore);

    const careCategory = llm?.category ?? ruleCategory;
    const reason = llm?.reason ?? (symptomText ? `Rule-based scoring (risk ${riskScore}).` : undefined);
    const assessedBy = llm ? "llm" : "rule_based";

    const result = {
      patientId,
      facilityId,
      careCategory,
      riskScore,
      serviceType,
      assessedAt: Date.now(),
    };

    await this.cache.set(`triage:result:${patientId}`, result, 3600);

    try {
      const dbResult = this.triageRepo.create({
        patientId,
        facilityId,
        careCategory,
        riskScore,
        serviceType,
        reason: reason ?? null,
        assessedBy,
        screeningData,
        assessedAt: new Date(),
      });
      await this.triageRepo.save(dbResult);
    } catch (error) {
      this.logger.error(`Failed to persist triage result for patient ${patientId}:`, error);
    }

    this.logger.log(`Triage assessed patient ${patientId}: ${careCategory} (risk: ${riskScore}, by: ${assessedBy})`);
    return result;
  }

  /**
   * Asks the LLM to classify free-text symptoms, safe to any failure
   * (returns null so callers fall back to the rule engine).
   */
  private async classifyWithLLM(symptomText: string): Promise<LlmTriageResult | null> {
    try {
      const result = await invokeLLM({
        messages: [
          { role: "system", content: TRIAGE_PROMPT(symptomText) },
          { role: "user", content: `Patient symptoms: "${symptomText}"` },
        ],
        responseFormat: { type: "json_object" },
        maxTokens: 120,
      });
      const content = result.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) return null;
      const parsed = JSON.parse(content) as Partial<LlmTriageResult>;
      if (!parsed.category || !["emergency", "urgent", "priority", "routine"].includes(parsed.category)) {
        return null;
      }
      return {
        category: parsed.category as LlmTriageResult["category"],
        reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
      };
    } catch (error) {
      this.logger.warn(`LLM triage unavailable, falling back to rules: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }
}
