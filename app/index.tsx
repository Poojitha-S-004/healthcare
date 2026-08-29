import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { apiCall } from "@/lib/_core/api";
import type { TeleconsultSession } from "@/lib/health/teleconsultChat";
import { commonStyles } from "@/components/health/ui";

const facilityId = Number(process.env.EXPO_PUBLIC_FACILITY_ID ?? 0);

export default function TeleconsultListScreen() {
  const [sessions, setSessions] = useState<TeleconsultSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError("Set EXPO_PUBLIC_FACILITY_ID to view this facility's teleconsults.");
      setLoading(false);
      return;
    }
    try {
      const result = await apiCall<TeleconsultSession[]>(`/api/teleconsult?facilityId=${facilityId}`);
      setSessions(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load teleconsults");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <View style={commonStyles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={22} color="#18332F" />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Remote care</Text>
          <Text style={commonStyles.title}>Teleconsultation</Text>
          <Text style={commonStyles.body}>Open a secure chat with the remote care team.</Text>
        </View>
      </View>

      {error ? <View style={styles.errorCard}><MaterialIcons name="error-outline" size={18} color="#B42318" /><Text style={styles.errorText}>{error}</Text></View> : null}

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#087E7B" /></View> : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/teleconsult/${item.id}` as never)} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.72 : 1 }]}>
              <View style={styles.row}>
                <View style={styles.icon}><MaterialIcons name="medical-services" size={22} color="#087E7B" /></View>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>Patient #{item.patientId}</Text>
                  <Text style={styles.meta}>Session #{item.id} · {item.status}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#6C817C" />
              </View>
              <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt as string).toLocaleString() : ""}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="forum" size={32} color="#087E7B" /><Text style={styles.emptyTitle}>No teleconsults yet</Text><Text style={styles.emptyText}>Open a patient record and choose “Chat with doctor” to create the first consultation.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8 },
  back: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  eyebrow: { color: "#087E7B", fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 10, padding: 14 },
  row: { alignItems: "center", flexDirection: "row", gap: 10 },
  icon: { alignItems: "center", backgroundColor: "#E6F5F3", borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  cardTitle: { color: "#18332F", fontSize: 15, fontWeight: "900" },
  meta: { color: "#6C817C", fontSize: 12, fontWeight: "700", marginTop: 3, textTransform: "capitalize" },
  time: { color: "#8CA19B", fontSize: 10, fontWeight: "700", marginTop: 10 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  errorCard: { alignItems: "center", backgroundColor: "#FDECEC", borderRadius: 14, flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 8, padding: 12 },
  errorText: { color: "#B42318", flex: 1, fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 28, marginTop: 30 },
  emptyTitle: { color: "#18332F", fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyText: { color: "#6C817C", fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 440, textAlign: "center" },
});
