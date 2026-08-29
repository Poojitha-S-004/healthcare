import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton, PriorityBadge, SyncPill, commonStyles } from "@/components/health/ui";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useHealth } from "@/lib/health/store";
import type { Priority } from "@/lib/health/types";

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, t, addEncounter, getPatient, getPatientEncounters } = useHealth();
  const patient = getPatient(id);
  const [note, setNote] = useState("");

  if (!patient) {
    return (
      <View style={commonStyles.screen}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.55 : 1 }]}>
          <MaterialIcons name="arrow-back" size={21} color="#18332F" /><Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={[commonStyles.card, styles.missing]}>
          <Text style={commonStyles.title}>Record not found</Text>
          <Text style={[commonStyles.body, { marginTop: 6 }]}>This local patient record is no longer available.</Text>
        </View>
      </View>
    );
  }

  const queueEntry = state.queue.find((entry) => entry.patientId === patient.id && entry.status !== "completed");
  const encounters = getPatientEncounters(patient.id);
  const referrals = state.referrals
    .filter((referral) => referral.patientId === patient.id)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const saveEncounter = () => {
    if (!note.trim()) {
      Alert.alert("Add a note", "Type a note before recording this encounter.");
      return;
    }
    addEncounter(patient.id, note.trim());
    setNote("");
  };

  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.55 : 1 }]}>
          <MaterialIcons name="arrow-back" size={21} color="#18332F" /><Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{patient.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</Text></View>
          <View style={styles.flex}>
            <Text style={commonStyles.title}>{patient.name}</Text>
            <Text style={commonStyles.body}>{patient.localId} · {patient.age} years · {patient.sex[0].toUpperCase() + patient.sex.slice(1)}</Text>
          </View>
          <SyncPill state={patient.syncState} />
        </View>

        <View style={styles.tags}>{patient.careTags.length ? patient.careTags.map((tag) => <Text key={tag} style={styles.tag}>{t(tag)}</Text>) : <Text style={styles.tag}>{t("general")}</Text>}</View>
        {patient.contact ? <Text style={[commonStyles.tiny, { marginTop: 10 }]}>{t("contact")}: {patient.contact}</Text> : null}

        {queueEntry ? (
          <View style={[commonStyles.card, styles.card]}>
            <View style={styles.cardHeader}>
              <Text style={commonStyles.eyebrow}>Current queue</Text>
              <PriorityBadge priority={queueEntry.priority} compact />
            </View>
            <Text style={styles.queueService}>{queueEntry.service}</Text>
            <Text style={commonStyles.tiny}>{t(queueEntry.status)} · {Math.max(1, Math.round((Date.now() - queueEntry.arrivedAt) / 60000))} min waiting</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.flex}><PrimaryButton label={t("createReferral")} icon="send" onPress={() => router.push("/referral/new")} /></View>
        </View>

        <Section title={`${t("medication")} & ${t("safety")}`}>
          <View style={[commonStyles.card, styles.card]}>
            <Text style={styles.fieldLabel}>{t("medication")}</Text>
            <Text style={[commonStyles.body, { marginTop: 3 }]}>{patient.currentMedicines.length ? patient.currentMedicines.join(", ") : "None on record"}</Text>
            <Text style={[styles.fieldLabel, { marginTop: 13 }]}>{t("safety")}</Text>
            <Text style={[commonStyles.body, { marginTop: 3 }]}>{patient.allergies.length ? patient.allergies.join(", ") : "No allergies recorded"}</Text>
          </View>
        </Section>

        <Section title={t("referrals") + ` (${referrals.length})`}>
          {referrals.length ? referrals.map((referral) => (
            <View key={referral.id} style={[commonStyles.card, styles.card, styles.referralCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.referralDestination}>{referral.destination}</Text>
                <PriorityBadge priority={referral.urgency as Priority} compact />
              </View>
              <Text style={commonStyles.body}>{referral.reason}</Text>
              <Text style={[commonStyles.tiny, { marginTop: 8 }]}>{referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}</Text>
            </View>
          )) : <Text style={[commonStyles.body, styles.emptyText]}>No referrals recorded.</Text>}
        </Section>

        <Section title={t("recordEncounter")}>
          <View style={[commonStyles.card, styles.card]}>
            <TextInput value={note} onChangeText={setNote} placeholder="Notes from this visit…" placeholderTextColor="#8CA19B" style={styles.input} multiline />
            <PrimaryButton label={t("recordEncounter")} icon="edit" onPress={saveEncounter} disabled={!note.trim()} />
          </View>
        </Section>

        <Section title={`Longitudinal history (${encounters.length})`}>
          {encounters.length ? encounters.map((encounter) => (
            <View key={encounter.id} style={[commonStyles.card, styles.card]}>
              <View style={styles.cardHeader}>
                <Text style={styles.fieldLabel}>{encounter.type.charAt(0).toUpperCase() + encounter.type.slice(1)}</Text>
                <SyncPill state={encounter.syncState} />
              </View>
              <Text style={[commonStyles.body, { marginTop: 5 }]}>{encounter.note}</Text>
              <Text style={[commonStyles.tiny, { marginTop: 8 }]}>{new Date(encounter.createdAt).toLocaleDateString()}</Text>
            </View>
          )) : <Text style={[commonStyles.body, styles.emptyText]}>No encounters recorded yet.</Text>}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, marginBottom: 20, minHeight: 32 },
  backText: { color: "#18332F", fontSize: 14, fontWeight: "800" },
  headerRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  avatar: { alignItems: "center", backgroundColor: "#E6F5F3", borderRadius: 18, height: 58, justifyContent: "center", width: 58 },
  avatarText: { color: "#087E7B", fontSize: 18, fontWeight: "900" },
  flex: { flex: 1 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { color: "#087E7B", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  card: { marginTop: 9 },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  queueService: { color: "#18332F", fontSize: 16, fontWeight: "900", marginTop: 8 },
  actions: { flexDirection: "row", marginTop: 18 },
  section: { marginTop: 24 },
  sectionTitle: { color: "#18332F", fontSize: 16, fontWeight: "900", marginBottom: 5 },
  fieldLabel: { color: "#4A6560", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  referralDestination: { color: "#18332F", fontSize: 15, fontWeight: "900" },
  referralCard: { gap: 5 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 13, borderWidth: 1, color: "#18332F", fontSize: 16, minHeight: 84, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: "top", marginBottom: 12 },
  emptyText: { marginTop: 9, fontStyle: "italic" },
  missing: { alignItems: "center", padding: 24 },
});
