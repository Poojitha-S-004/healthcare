import type { Priority, QueueEntry, ReferralStatus } from "./types";
import { priorityRank } from "./priority";

export function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    const priorityDifference =
      priorityRank[a.priority] - priorityRank[b.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return a.arrivedAt - b.arrivedAt;
  });
}

const referralTransitions: Record<ReferralStatus, ReferralStatus[]> = {
  draft: ["sent"],
  sent: ["accepted"],
  accepted: ["awaitingTransport"],
  awaitingTransport: ["inTransit"],
  inTransit: ["arrived"],
  arrived: ["completed", "followUpOverdue"],
  completed: [],
  followUpOverdue: [],
};

export function canTransitionReferral(
  from: ReferralStatus,
  to: ReferralStatus,
): boolean {
  return referralTransitions[from].includes(to);
}

export function nextReferralStatuses(
  status: ReferralStatus,
): ReferralStatus[] {
  return referralTransitions[status];
}