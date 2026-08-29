import { describe, expect, it } from "vitest";
import { evaluatePriority } from "../lib/health/priority";
import { canTransitionReferral, nextReferralStatuses, sortQueue } from "../lib/health/workflows";
import { deduplicateOperations } from "../server/health-sync";
import { calculateRiskScore, mapRiskToCategory } from "../shared/triage";
import type { QueueEntry } from "../lib/health/types";

describe("priority workflow", () => {
  it("places maternal and child danger signs above other rule outcomes", () => {
    expect(evaluatePriority({ maternalDanger: true, chronicReview: true })).toEqual({ priority: "emergency", reason: "maternalDanger" });
    expect(evaluatePriority({ childDanger: true, vitalConcern: true })).toEqual({ priority: "emergency", reason: "childDanger" });
    expect(evaluatePriority({ chronicReview: true })).toEqual({ priority: "priority", reason: "chronicReview" });
  });

  it("sorts priority first and arrival time second", () => {
    const entries: QueueEntry[] = [
      { id: "routine", patientId: "a", service: "OPD", arrivedAt: 100, priority: "routine", priorityReason: "routineCare", status: "waiting", syncState: "synced" },
      { id: "urgent-late", patientId: "b", service: "OPD", arrivedAt: 300, priority: "urgent", priorityReason: "vitalConcern", status: "waiting", syncState: "synced" },
      { id: "urgent-early", patientId: "c", service: "OPD", arrivedAt: 200, priority: "urgent", priorityReason: "clinicianUrgent", status: "waiting", syncState: "synced" },
      { id: "emergency", patientId: "d", service: "OPD", arrivedAt: 400, priority: "emergency", priorityReason: "childDanger", status: "waiting", syncState: "synced" },
    ];
    expect(sortQueue(entries).map((entry) => entry.id)).toEqual(["emergency", "urgent-early", "urgent-late", "routine"]);
  });
});

describe("shared risk scorer", () => {
  it("scores inadequate oxygen saturation above a baseline healthy adult", () => {
    const baseline = calculateRiskScore({ age: 30 });
    const low = calculateRiskScore({ age: 30, vitalSigns: { oxygenSaturation: 85 } });
    expect(low).toBe(baseline + 4);
    expect(mapRiskToCategory(low)).toBe("priority");
  });

  it("caps the score at 15", () => {
    const score = calculateRiskScore({
      age: 3,
      vitalSigns: { oxygenSaturation: 80, heartRate: 140, systolicBP: 200, temperature: 40 },
      symptoms: ["severe_bleeding"],
    });
    expect(score).toBe(15);
  });

  it("returns routine for a low-risk healthy adult", () => {
    expect(mapRiskToCategory(calculateRiskScore({ age: 40 }))).toBe("routine");
  });
});

describe("referral workflow", () => {
  it("allows only explicit next referral statuses", () => {
    expect(canTransitionReferral("sent", "accepted")).toBe(true);
    expect(canTransitionReferral("sent", "completed")).toBe(false);
    expect(nextReferralStatuses("arrived")).toEqual(["completed", "followUpOverdue"]);
  });
});

describe("offline sync batches", () => {
  it("deduplicates retried operation IDs before server receipt", () => {
    const operations = deduplicateOperations([
      { id: "op-1", type: "queue.add", entityId: "q-1", createdAt: 1 },
      { id: "op-1", type: "queue.add", entityId: "q-1", createdAt: 1 },
      { id: "op-2", type: "referral.create", entityId: "r-1", createdAt: 2 },
    ]);
    expect(operations.map((operation) => operation.id)).toEqual(["op-1", "op-2"]);
  });
});
