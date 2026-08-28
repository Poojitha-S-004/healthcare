/**
 * Unified triage rule engine.
 *
 * SINGLE SOURCE OF TRUTH for both the offline client (mobile/FHW) and the
 * backend triage processor. Any change to urgency rules lives here so the two
 * never drift apart.
 */

export type TriagePriority = "emergency" | "urgent" | "priority" | "routine";

export type TriagePriorityReason =
  | "maternalDanger"
  | "childDanger"
  | "vitalConcern"
  | "clinicianUrgent"
  | "chronicReview"
  | "routineCare";

/** Flag-based input used by the client during registration/screening. */
export type TriageFlagInput = {
  maternalDanger?: boolean;
  childDanger?: boolean;
  vitalConcern?: boolean;
  clinicianUrgent?: boolean;
  chronicReview?: boolean;
};

/** Vitals + symptoms input used by the backend risk scorer. */
export type VitalSigns = {
  heartRate?: number;
  systolicBP?: number;
  oxygenSaturation?: number;
  temperature?: number;
};

export type RiskScreeningInput = {
  age?: number;
  vitalSigns?: VitalSigns;
  symptoms?: string[];
  pregnancyStatus?: string;
};

export const triagePriorityRank: Record<TriagePriority, number> = {
  emergency: 0,
  urgent: 1,
  priority: 2,
  routine: 3,
};

/**
 * Highest-risk-first evaluation of the flag-based screening form.
 * Matches the clinical rule "maternal/child danger signs override everything".
 */
export function evaluateTriageFlags(input: TriageFlagInput): {
  priority: TriagePriority;
  reason: TriagePriorityReason;
} {
  if (input.maternalDanger) return { priority: "emergency", reason: "maternalDanger" };
  if (input.childDanger) return { priority: "emergency", reason: "childDanger" };
  if (input.vitalConcern) return { priority: "urgent", reason: "vitalConcern" };
  if (input.clinicianUrgent) return { priority: "urgent", reason: "clinicianUrgent" };
  if (input.chronicReview) return { priority: "priority", reason: "chronicReview" };
  return { priority: "routine", reason: "routineCare" };
}

/**
 * Numeric risk score (cap 15) combining age, vitals and present symptoms.
 * Shared with the backend triage processor.
 */
export function calculateRiskScore(data: RiskScreeningInput): number {
  let score = 0;

  if (data.age !== undefined) {
    const age = Number(data.age);
    if (age < 5) score += 3;
    else if (age > 65) score += 2;
  }

  if (data.vitalSigns) {
    const vitals = data.vitalSigns;
    if (vitals.heartRate !== undefined && (vitals.heartRate > 120 || vitals.heartRate < 50)) score += 3;
    if (vitals.systolicBP !== undefined && (vitals.systolicBP > 180 || vitals.systolicBP < 80)) score += 3;
    if (vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation < 90) score += 4;
    if (vitals.temperature !== undefined && (vitals.temperature > 39.5 || vitals.temperature < 35)) score += 2;
  }

  const symptoms = data.symptoms ?? [];
  if (symptoms.includes("chest_pain") || symptoms.includes("difficulty_breathing")) score += 4;
  if (symptoms.includes("severe_bleeding") || symptoms.includes("altered_consciousness")) score += 5;
  if (symptoms.includes("high_fever") || symptoms.includes("persistent_vomiting")) score += 1;

  if (data.pregnancyStatus === "pregnant") score += 2;

  return Math.min(score, 15);
}

/** Maps a risk score to a care category (clamped). */
export function mapRiskToCategory(score: number): TriagePriority {
  if (score >= 8) return "emergency";
  if (score >= 5) return "urgent";
  if (score >= 2) return "priority";
  return "routine";
}
