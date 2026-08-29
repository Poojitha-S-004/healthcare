import { apiCall } from "@/lib/_core/api";

export type TeleconsultMessage = {
  id: number;
  sessionId: number;
  senderUserId: number;
  senderRole: string;
  senderName: string;
  content: string;
  createdAt: string;
};

export async function getTeleconsultMessages(sessionId: number, afterId?: number) {
  const suffix = afterId ? `?afterId=${encodeURIComponent(afterId)}` : "";
  return apiCall<TeleconsultMessage[]>(`/api/teleconsult/${sessionId}/messages${suffix}`);
}

export async function sendTeleconsultMessage(sessionId: number, content: string) {
  return apiCall<TeleconsultMessage>(`/api/teleconsult/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export type TeleconsultSession = {
  id: number;
  patientId: number;
  facilityId: number;
  clinicianId: number | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  createdAt?: string;
};

export async function createTeleconsultSession(patientId: number, facilityId: number) {
  return apiCall<TeleconsultSession>("/api/teleconsult", {
    method: "POST",
    body: JSON.stringify({ patientId, facilityId }),
  });
}

export async function startTeleconsultSession(sessionId: number, clinicianId: number) {
  return apiCall<TeleconsultSession>(`/api/teleconsult/${sessionId}/start`, {
    method: "POST",
    body: JSON.stringify({ clinicianId }),
  });
}
