import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueueRealtime, type QueueRealtimeEvent } from "@/lib/health/useQueueRealtime";
import { portalFetch, portalLogin, getPortalToken, clearPortalToken } from "@/lib/health/portalAuth";
import type { Priority } from "@/lib/health/types";

type ServerQueueRow = Record<string, unknown> & {
  patientId: string | number;
  serviceType?: string;
  careCategory?: string;
  priorityReason?: string;
  status?: string;
  enteredAt?: number;
};

type ServerPatient = {
  id: number;
  name: string;
  localId: string;
  careCategory?: string;
  gender?: string;
  age?: number;
  contactPhone?: string;
  allergies?: string;
  currentMedicines?: string;
};

const priorityTone: Record<Priority, { bg: string; fg: string }> = {
  emergency: { bg: "#FDECEC", fg: "#B42318" },
  urgent: { bg: "#FFF4E5", fg: "#9A5B00" },
  priority: { bg: "#EAF4FF", fg: "#2369A5" },
  routine: { bg: "#EEF6F0", fg: "#198754" },
};

const statusText: Record<string, string> = {
  waiting: "Waiting",
  called: "In consultation",
  completed: "Completed",
  paused: "Paused",
  transferred: "Transferred",
};

export default function PortalScreen() {
  const isWeb = Platform.OS === "web";
  const [openId, setOpenId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getPortalToken());
  }, []);

  const handleLogin = useCallback(async () => {
    if (!openId.trim()) {
      setLoginError("Enter your staff Open ID.");
      return;
    }
    setBusy(true);
    setLoginError(null);
    try {
      await portalLogin(openId.trim());
      setToken(getPortalToken());
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }, [openId]);

  const handleLogout = useCallback(() => {
    clearPortalToken();
    setToken(null);
  }, []);

  if (!isWeb) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="language" size={40} color="#18332F" />
        <Text style={styles.centerTitle}>Doctor portal</Text>
        <Text style={styles.centerBody}>
          This console is designed for the web dashboard. On a mobile device, use the queue tab in the app instead.
        </Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.center, { backgroundColor: "#F7F8F5" }]}>
        <View style={styles.brandRow}>
          <MaterialIcons name="medical-services" size={26} color="#087E7B" />
          <Text style={styles.brandTitle}>Rural Health · Doctor Console</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Staff sign-in</Text>
          <Text style={styles.label}>Staff Open ID</Text>
          <TextInput
            value={openId}
            onChangeText={setOpenId}
            autoCapitalize="none"
            placeholder="e.g. dr.asha@pHC"
            style={styles.input}
            placeholderTextColor="#9AA8A3"
          />
          {loginError ? <Text style={styles.error}>{loginError}</Text> : null}
          <Pressable onPress={handleLogin} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.primaryText}>{busy ? "Signing in…" : "Sign in"}</Text>
          </Pressable>
          <Text style={styles.hint}>
            Portal sign-in is independent of the app OAuth flow. Any staff Open ID works for a local deployment.
          </Text>
        </View>
      </View>
    );
  }

  return <PortalBoard facilityId={facilityId} onFacilityId={setFacilityId} onLogout={handleLogout} />;
}

function PortalBoard({
  facilityId,
  onFacilityId,
  onLogout,
}: {
  facilityId: string;
  onFacilityId: (value: string) => void;
  onLogout: () => void;
}) {
  const facility = Number(facilityId) || 0;
  const { connectionState, lastEvent } = useQueueRealtime(facility);
  const [rows, setRows] = useState<ServerQueueRow[]>([]);
  const [patients, setPatients] = useState<ServerPatient[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);

  const loadSnapshot = useCallback(async (f: number) => {
    if (!f) {
      setRows([]);
      return;
    }
    try {
      const data = await portalFetch<{ entries: ServerQueueRow[] }>(`/api/queue/${f}`);
      setRows(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    }
  }, []);

  const loadPatients = useCallback(async (f: number) => {
    if (!f) return;
    try {
      const data = await portalFetch<ServerPatient[]>(`/api/patients?facilityId=${f}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch {
      setPatients([]);
    }
  }, []);

  useEffect(() => {
    if (!facility) {
      setRows([]);
      return;
    }
    void loadSnapshot(facility);
    void loadPatients(facility);
  }, [facility, loadSnapshot, loadPatients]);

  // Apply live events to the locally-held snapshot so the board stays in sync.
  const applyEvent = useCallback((event: QueueRealtimeEvent) => {
    setRows((previous) => {
      const pid = String(event.patientId);
      switch (event.type) {
        case "call_next":
          return previous.map((row) => String(row.patientId) === pid ? { ...row, status: "called" } : row);
        case "complete":
          return previous.filter((row) => String(row.patientId) !== pid);
        case "pause":
          return previous.map((row) => String(row.patientId) === pid ? { ...row, status: "paused" } : row);
        default:
          return previous;
      }
    });
  }, []);

  useEffect(() => {
    if (lastEvent) applyEvent(lastEvent);
  }, [lastEvent, applyEvent]);

  const sorted = useMemo(
    () =>
      [...rows]
        .filter((row) => row.status !== "completed")
        .sort((a, b) => {
          const order: Record<string, number> = { emergency: 0, urgent: 1, priority: 2, routine: 3 };
          const pa = order[String(a.careCategory)] ?? 4;
          const pb = order[String(b.careCategory)] ?? 4;
          if (pa !== pb) return pa - pb;
          return Number(a.enteredAt ?? 0) - Number(b.enteredAt ?? 0);
        }),
    [rows],
  );

  const patientName = (id: number) =>
    patients.find((p) => p.id === id)?.name ?? `#${id}`;

  const runAction = useCallback(async (method: string, path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await portalFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
      if (facility) await loadSnapshot(facility);
    }
  }, [facility, loadSnapshot]);

  const enqueue = useCallback(async () => {
    if (!selectedPatient || !facility) return;
    const patient = patients.find((p) => p.id === selectedPatient);
    const careCategory = (patient?.careCategory as Priority) || "routine";
    await runAction("POST", `/api/queue/enqueue`, {
      facilityId: facility,
      patientId: selectedPatient,
      serviceType: "General OPD",
      careCategory,
    });
  }, [selectedPatient, patients, facility, runAction]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialIcons name="medical-services" size={22} color="#087E7B" />
          <Text style={styles.brandTitle}>Doctor Console</Text>
        </View>
        <View style={styles.topBarRight}>
          <View style={[styles.connPill, { backgroundColor: connectionState === "open" ? "#EEF6F0" : "#FFF4E5" }]}>
            <View style={[styles.connDot, { backgroundColor: connectionState === "open" ? "#198754" : "#9A5B00" }]} />
            <Text style={[styles.connText, { color: connectionState === "open" ? "#198754" : "#9A5B00" }]}>
              {connectionState === "open" ? "Live" : connectionState === "connecting" ? "Connecting…" : "Reconnecting…"}
            </Text>
          </View>
          <Pressable onPress={onLogout} style={styles.linkButton}>
            <Text style={styles.linkText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.facilityRow}>
        <Text style={styles.label}>Facility ID</Text>
        <TextInput
          value={facilityId}
          onChangeText={onFacilityId}
          keyboardType="numeric"
          placeholder="e.g. 1"
          style={styles.input}
          placeholderTextColor="#9AA8A3"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {facility > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Admit to queue</Text>
          </View>
          <View style={styles.admitRow}>
            <View style={styles.patientPicker}>
              {patients.length === 0 && <Text style={styles.hint}>No registered patients for this facility.</Text>}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {patients.map((p) => {
                  const tone = priorityTone[String(p.careCategory) as Priority] ?? priorityTone.routine;
                  const active = selectedPatient === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelectedPatient(p.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <View style={[styles.chipTag, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.chipTagText, { color: tone.fg }]}>{(String(p.careCategory) || "routine").slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.chipLabel}>{p.name}</Text>
                      <Text style={styles.chipSub}>{p.localId}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <Pressable onPress={enqueue} disabled={!selectedPatient || busy} style={({ pressed }) => [styles.primary, { alignSelf: "flex-start" }, pressed && styles.pressed, (!selectedPatient || busy) && styles.disabled]} accessibilityRole="button">
              <Text style={styles.primaryText}>Add to queue</Text>
            </Pressable>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Live queue</Text>
            <Text style={styles.count}>{sorted.length} active</Text>
          </View>

          {sorted.length === 0 && <Text style={styles.hint}>The queue for this facility is empty. Add a patient above.</Text>}

          <View style={styles.board}>
            <View style={[styles.boardHeader, styles.boardRow]}>
              <Text style={[styles.cell, styles.colToken]}>#</Text>
              <Text style={[styles.cell, styles.colStatus]}>Status</Text>
              <Text style={[styles.cell, styles.colCat]}>Priority</Text>
              <Text style={[styles.cell, styles.colPatient]}>Patient</Text>
              <Text style={[styles.cell, styles.colService]}>Service</Text>
              <Text style={[styles.cell, styles.colActions]}>Actions</Text>
            </View>
            {sorted.map((row, index) => {
              const pid = Number(row.patientId);
              const tone = priorityTone[String(row.careCategory) as Priority] ?? priorityTone.routine;
              const status = String(row.status ?? "waiting");
              return (
                <View key={pid} style={[styles.boardRow, styles.boardBody]}>
                  <Text style={[styles.cell, styles.colToken, styles.tokenNum]}>{String(index + 1).padStart(2, "0")}</Text>
                  <View style={[styles.cell, styles.colStatus]}>
                    <Text style={styles.statusText}>{statusText[status] ?? status}</Text>
                  </View>
                  <View style={[styles.cell, styles.colCat]}>
                    <View style={[styles.catPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.catPillText, { color: tone.fg }]}>{String(row.careCategory ?? "routine")}</Text>
                    </View>
                  </View>
                  <View style={[styles.cell, styles.colPatient]}>
                    <Text style={styles.patientCell}>{patientName(pid)}</Text>
                    <Text style={styles.subCell}>#{pid}</Text>
                  </View>
                  <Text style={[styles.cell, styles.colService, styles.serviceCell]}>{row.serviceType ?? "General OPD"}</Text>
                  <View style={[styles.cell, styles.colActions, styles.actionCell]}>
                    {status === "waiting" && (
                      <Pressable onPress={() => runAction("POST", `/api/queue/call/${facility}/${pid}`)} disabled={busy} style={styles.actionButton}>
                        <MaterialIcons name="campaign" size={15} color="#087E7B" />
                        <Text style={styles.actionText}>Call</Text>
                      </Pressable>
                    )}
                    {(status === "called" || status === "in_progress") && (
                      <Pressable onPress={() => runAction("POST", `/api/queue/complete/${facility}/${pid}`)} disabled={busy} style={styles.actionButton}>
                        <MaterialIcons name="check" size={15} color="#198754" />
                        <Text style={styles.actionText}>Complete</Text>
                      </Pressable>
                    )}
                    {status === "waiting" && (
                      <Pressable onPress={() => runAction("POST", `/api/queue/pause/${facility}/${pid}`)} disabled={busy} style={styles.actionButton}>
                        <MaterialIcons name="pause" size={15} color="#9A5B00" />
                        <Text style={styles.actionText}>Pause</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8F5" },
  content: { padding: 22, paddingBottom: 48, maxWidth: 1080, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  centerTitle: { color: "#18332F", fontSize: 22, fontWeight: "800", marginTop: 8 },
  centerBody: { color: "#54716B", fontSize: 14, textAlign: "center", maxWidth: 400, lineHeight: 20 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  brandTitle: { color: "#18332F", fontSize: 20, fontWeight: "800" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, width: "100%", maxWidth: 420, marginTop: 24, shadowColor: "#18332F", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  eyebrow: { color: "#087E7B", fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 16 },
  label: { color: "#4A6560", fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D9E4E0", borderRadius: 12, borderWidth: 1, color: "#18332F", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  error: { color: "#B42318", fontSize: 13, fontWeight: "700", marginBottom: 10 },
  hint: { color: "#6C817C", fontSize: 12, lineHeight: 18, marginTop: 12 },
  primary: { alignItems: "center", backgroundColor: "#087E7B", borderRadius: 13, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 46, paddingHorizontal: 18 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  topBarRight: { alignItems: "center", flexDirection: "row", gap: 14 },
  connPill: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  connDot: { borderRadius: 5, height: 8, width: 8 },
  connText: { fontSize: 12, fontWeight: "800" },
  linkButton: { padding: 4 },
  linkText: { color: "#087E7B", fontSize: 13, fontWeight: "800" },
  facilityRow: { marginBottom: 8 },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
  sectionTitle: { color: "#18332F", fontSize: 17, fontWeight: "800" },
  count: { color: "#087E7B", fontSize: 13, fontWeight: "800" },
  admitRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, flexWrap: "wrap" },
  patientPicker: { flex: 1, minWidth: 260 },
  chip: { alignItems: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 12, borderColor: "#D9E4E0", borderWidth: 1, flexDirection: "row", gap: 8, padding: 10, width: 168 },
  chipActive: { borderColor: "#087E7B", borderWidth: 2 },
  chipTag: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  chipTagText: { fontSize: 10, fontWeight: "900" },
  chipLabel: { color: "#18332F", fontSize: 13, fontWeight: "800", flexShrink: 1 },
  chipSub: { color: "#6C817C", fontSize: 11 },
  board: { backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E3EBE7" },
  boardRow: { alignItems: "center", flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12 },
  boardHeader: { backgroundColor: "#F0F4F2" },
  boardBody: { borderTopColor: "#E7EEEB", borderTopWidth: 1 },
  cell: { paddingRight: 10 },
  colToken: { width: 36 },
  colStatus: { width: 120 },
  colCat: { width: 110 },
  colPatient: { flex: 1, minWidth: 140 },
  colService: { width: 140 },
  colActions: { width: 200, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tokenNum: { color: "#6C817C", fontSize: 13, fontWeight: "900" },
  statusText: { color: "#18332F", fontSize: 13, fontWeight: "700" },
  catPill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  catPillText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  patientCell: { color: "#18332F", fontSize: 14, fontWeight: "800" },
  subCell: { color: "#6C817C", fontSize: 11 },
  serviceCell: { color: "#54716B", fontSize: 13 },
  actionCell: { flexDirection: "row" },
  actionButton: { alignItems: "center", flexDirection: "row", gap: 4, padding: 6 },
  actionText: { color: "#18332F", fontSize: 12, fontWeight: "800" },
});
