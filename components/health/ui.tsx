import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useHealth } from "@/lib/health/store";
import { queueActivityLabel, useQueueRealtime, type QueueConnectionState } from "@/lib/health/useQueueRealtime";
import type { Priority, SyncState } from "@/lib/health/types";

const connectionTone: Record<QueueConnectionState, { background: string; text: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  idle: { background: "#EEF1EE", text: "#6C817C", icon: "cloud-off" },
  connecting: { background: "#EAF4FF", text: "#2369A5", icon: "cloud-sync" },
  open: { background: "#EEF6F0", text: "#198754", icon: "cloud-done" },
  reconnecting: { background: "#FFF4E5", text: "#9A5B00", icon: "cloud-sync" },
  error: { background: "#FDECEC", text: "#B42318", icon: "cloud-off" },
};

const priorityColors: Record<Priority, { background: string; text: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  emergency: { background: "#FDECEC", text: "#B42318", icon: "emergency" },
  urgent: { background: "#FFF4E5", text: "#9A5B00", icon: "priority-high" },
  priority: { background: "#EAF4FF", text: "#2369A5", icon: "health-and-safety" },
  routine: { background: "#EEF6F0", text: "#198754", icon: "schedule" },
};

export function PriorityBadge({ priority, compact = false }: { priority: Priority; compact?: boolean }) {
  const { priorityLabel } = useHealth();
  const color = priorityColors[priority];
  return (
    <View style={[styles.priorityBadge, { backgroundColor: color.background }, compact && styles.compactBadge]}>
      <MaterialIcons name={color.icon} size={compact ? 14 : 16} color={color.text} />
      <Text style={[styles.priorityText, { color: color.text }]}>{priorityLabel(priority)}</Text>
    </View>
  );
}

export function SyncPill({ state }: { state: SyncState }) {
  const { syncLabel } = useHealth();
  const tone = state === "synced" ? { background: "#EEF6F0", text: "#198754", icon: "cloud-done" as const } : state === "conflict" ? { background: "#FDECEC", text: "#B42318", icon: "error-outline" as const } : { background: "#EAF4FF", text: "#2369A5", icon: "sync" as const };
  return (
    <View style={[styles.syncPill, { backgroundColor: tone.background }]}>
      <MaterialIcons name={tone.icon} size={13} color={tone.text} />
      <Text style={[styles.syncText, { color: tone.text }]}>{syncLabel(state)}</Text>
    </View>
  );
}

export function LiveQueueBanner({ facilityId }: { facilityId: number }) {
  const { t } = useHealth();
  const { connectionState, lastEvent } = useQueueRealtime(facilityId);
  const tone = connectionTone[connectionState];
  const labelKey =
    connectionState === "open" ? "liveLive"
    : connectionState === "connecting" ? "liveConnecting"
    : connectionState === "reconnecting" ? "liveReconnecting"
    : "liveOffline";
  const activity = lastEvent ? ` · ${queueActivityLabel(t, lastEvent)}` : "";
  return (
    <View style={[styles.liveBanner, { backgroundColor: tone.background }]}>
      <MaterialIcons name={tone.icon} size={15} color={tone.text} />
      <Text style={[styles.liveText, { color: tone.text }]}>
        {t("liveQueue")}: {t(labelKey as "liveLive" | "liveConnecting" | "liveReconnecting" | "liveOffline")}
        {activity}
      </Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, icon = "arrow-forward", tone = "teal", disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; tone?: "teal" | "ink" | "outline"; disabled?: boolean }) {
  const background = tone === "teal" ? "#087E7B" : tone === "ink" ? "#18332F" : "#FFFFFF";
  const color = tone === "outline" ? "#087E7B" : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: tone === "outline" ? "#087E7B" : background, opacity: disabled ? 0.45 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
      <MaterialIcons name={icon} size={18} color={color} />
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>;
}

export const commonStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8F5" },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, shadowColor: "#18332F", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  eyebrow: { color: "#4A6560", fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  title: { color: "#18332F", fontSize: 27, lineHeight: 34, fontWeight: "800" },
  body: { color: "#54716B", fontSize: 14, lineHeight: 20 },
  tiny: { color: "#6C817C", fontSize: 12, lineHeight: 17 },
});

const styles = StyleSheet.create({
  priorityBadge: { alignItems: "center", alignSelf: "flex-start", borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  compactBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 12, fontWeight: "800" },
  syncPill: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  syncText: { fontSize: 11, fontWeight: "800" },
  liveBanner: { alignItems: "center", borderRadius: 11, flexDirection: "row", gap: 6, marginBottom: 12, paddingHorizontal: 11, paddingVertical: 8 },
  liveText: { flexShrink: 1, fontSize: 12, fontWeight: "800" },
  button: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontWeight: "800" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: "#18332F", fontSize: 17, fontWeight: "800" },
});
