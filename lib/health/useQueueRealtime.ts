import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import type { TranslationKey } from "./i18n";
import type { QueueEntry, Priority, PriorityReason } from "./types";

/**
 * Live queue event discriminated by server `type`.
 * Mirrors the shapes published by QueueRealtimeService.
 */
export type QueueRealtimeEvent =
  | { type: "enqueue"; facilityId: number; patientId: number; at: number }
  | { type: "call_next"; facilityId: number; patientId: number; at: number }
  | { type: "complete"; facilityId: number; patientId: number; at: number }
  | { type: "transfer"; facilityId: number; patientId: number; targetFacilityId: number; at: number }
  | { type: "pause"; facilityId: number; patientId: number; at: number };

export type QueueSnapshot = {
  facilityId: number;
  entries: Record<string, unknown>;
};

export type QueueConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "error";

type RawBlock = { event: string; data: string };

function parseBlock(block: string): RawBlock {
  let event = "";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue; // comment / heartbeat
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return { event, data: data.join("\n") };
}

/**
 * Web-only hook that subscribes to the SSE queue stream for a facility.
 *
 * Uses fetch-based streaming rather than the browser-native EventSource so the
 * Authorization header can be attached (EventSource cannot send headers), which
 * matches the JwtAuthGuard on the endpoint. On native platforms it is a no-op —
 * the offline store remains the source of truth for the mobile board.
 */
export function useQueueRealtime(facilityId: number) {
  const [connectionState, setConnectionState] = useState<QueueConnectionState>(facilityId ? "connecting" : "idle");
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [lastEvent, setLastEvent] = useState<QueueRealtimeEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !facilityId) {
      setConnectionState("idle");
      return;
    }

    let cancelled = false;
    let attempt = 0;
    let retryTimer: number | null = null;
    let controller: AbortController | null = null;

    const setAttemptState = (state: QueueConnectionState) => {
      if (!cancelled) setConnectionState(state);
    };

    const consume = (block: RawBlock) => {
      if (!block.data) return;
      try {
        const payload = JSON.parse(block.data) as unknown;
        if (block.event === "snapshot") setSnapshot(payload as QueueSnapshot);
        else setLastEvent(payload as QueueRealtimeEvent);
      } catch {
        /* ignore malformed payloads */
      }
    };

    const connect = async () => {
      if (cancelled) return;
      controller?.abort();
      const next = new AbortController();
      controller = next;

      setAttemptState(attempt === 0 ? "connecting" : "reconnecting");
      setError(null);

      const baseUrl = getApiBaseUrl();
      const token = await Auth.getSessionToken();
      const url = `${baseUrl}/api/queue/events/${facilityId}`;

      try {
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          signal: next.signal,
        });

        if (!response.ok || !response.body || !response.body.getReader) {
          throw new Error(response.ok ? "Streaming not supported in this browser" : `Live queue stream rejected (${response.status})`);
        }

        attempt = 0;
        setAttemptState("open");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (block) consume(parseBlock(block));
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (err: unknown) {
        if (next.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Live queue connection failed");
      }

      if (cancelled) return;
      setAttemptState("reconnecting");
      attempt += 1;
      retryTimer = window.setTimeout(connect, Math.min(1000 * 2 ** Math.min(attempt - 1, 4), 15000));
    };

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      controller?.abort();
    };
  }, [facilityId]);

  return { connectionState, snapshot, lastEvent, error };
}

/** Maps a live activity event to a short display label. */
export function queueActivityLabel(t: (key: TranslationKey) => string, event: QueueRealtimeEvent): string {
  switch (event.type) {
    case "enqueue": return `${t("activityEnqueued")} #${event.patientId}`;
    case "call_next": return `${t("activityCalled")} #${event.patientId}`;
    case "complete": return `${t("activityCompleted")} #${event.patientId}`;
    case "transfer": return `${t("activityTransferred")} #${event.patientId} → ${event.targetFacilityId}`;
    case "pause": return `${t("activityPaused")} #${event.patientId}`;
    default: return "";
  }
}

/** Maps a server queue-entry (as stored in the facility queue hash) to a client QueueEntry. */
export function queueEntryFromSnapshot(row: Record<string, unknown>): QueueEntry | null {
  const patientId = row.patientId;
  if (typeof patientId !== "string" && typeof patientId !== "number") return null;
  const statusRaw = String(row.status ?? "waiting");
  const status: QueueEntry["status"] =
    statusRaw === "called" || statusRaw === "in_progress" ? "called"
    : statusRaw === "completed" ? "completed"
    : statusRaw === "paused" ? "paused"
    : "waiting";
  const careRaw = String(row.careCategory ?? "routine") as Priority;
  return {
    id: String(patientId),
    patientId: String(patientId),
    service: typeof row.serviceType === "string" ? row.serviceType : "General OPD",
    arrivedAt: typeof row.enteredAt === "number" ? row.enteredAt : Date.now(),
    priority: careRaw === "emergency" || careRaw === "urgent" || careRaw === "priority" || careRaw === "routine" ? careRaw : "routine",
    priorityReason: (row.priorityReason as PriorityReason) || "routineCare",
    status,
    syncState: "synced",
  };
}
