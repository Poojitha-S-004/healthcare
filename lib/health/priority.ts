import { evaluateTriageFlags, triagePriorityRank } from "@/shared/triage";
import type { Priority, PriorityInput, PriorityReason } from "./types";

/**
 * Client-side adapter over the shared triage rule engine.
 * Keeps this file as the single client entry point so existing screens and
 * workflows keep working, while the rules themselves live in shared/triage.
 */
export const priorityRank = triagePriorityRank;

export function evaluatePriority(input: PriorityInput): { priority: Priority; reason: PriorityReason } {
  return evaluateTriageFlags(input);
}
