import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton, commonStyles } from "@/components/health/ui";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useHealth } from "@/lib/health/store";
import type { Patient, Priority } from "@/lib/health/types";

const destinations = ["Community Health Centre", "Primary Health Centre", "District Hospital", "District Women’s Hospital", "Sub-District Hospital"];
const urgencies: { value: Priority; label: string; hint: string }[] = [
  { value: "emergency", label: "Emergency", hint: "Needs an immediate transfer" },
  { value: "urgent", label: "Urgent / high-risk", hint: "Needs priority clinical review" },
  { value: "priority", label: "Priority", hint: "Scheduled specialist review" },
  { value: "routine", label: "Routine", hint: "Non-urgent follow-up" },
];

export default function NewReferralScreen() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const { state, t, createReferral } = useHealth();
  const [patientId, setPatientId] = useState(params.patientId ?? "");
  const [destination, setDestination] = useState(destinations[0]);
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<Priority>("priority");

  const patients: Patient[] = state.patients;

  const selectedPatient = patients.find((patient) => patient.id === patientId);

  const save = () => {
    if (!patientId) {
      Alert.alert("Choose a patient", "Select the patient being referred.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Add a reason", "Enter the referral reason before sending.");
      return;
    }
    createReferral({ patientId, destination, reason: reason.trim(), urgency });
    router.back();
  };

  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.55 : 1 }]}>
          <MaterialIcons name="arrow-back" size={21} color="#18332F" /><Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={commonStyles.eyebrow}>Care coordination</Text>
        <Text style={commonStyles.title}>{t("createReferral")}</Text>
        <Text style={[commonStyles.body, { marginTop: 6 }]}>Create a local referral record. A closed-loop handoff can be tracked once the destination acknowledges it.</Text>

        <Section label={t("patients")}>
          <View style={styles.choiceList}>
            {patients.map((patient) => (
              <Pressable key={patient.id} onPress={() => setPatientId(patient.id)} style={({ pressed }) => [styles.patientChoice, patientId === patient.id && styles.patientChoiceActive, { opacity: pressed ? 0.7 : 1 }]}>
                <View style={[styles.checkbox, patientId === patient.id && styles.checkboxActive]}>{patientId === patient.id && <MaterialIcons name="check" size={14} color="#FFFFFF" />}</View>
                <View style={styles.flex}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={commonStyles.tiny}>{patient.localId} · {patient.age} years</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section label={t("destination")}>
          <View style={styles.wrap}>{destinations.map((option) => <Choice key={option} label={option} active={destination === option} onPress={() => setDestination(option)} />)}</View>
        </Section>

        <Section label={t("reason")}>
          <TextInput value={reason} onChangeText={setReason} placeholder="e.g. Specialist review for follow-up" placeholderTextColor="#8CA19B" style={styles.input} multiline />
        </Section>

        <Section label="Urgency">
          <View style={styles.urgencyList}>{urgencies.map((option) => <Pressable key={option.value} onPress={() => setUrgency(option.value)} style={({ pressed }) => [styles.urgencyChoice, urgency === option.value && styles.urgencyChoiceActive, { opacity: pressed ? 0.7 : 1 }]}><View style={styles.flex}><Text style={styles.urgencyLabel}>{option.label}</Text><Text style={commonStyles.tiny}>{option.hint}</Text></View><View style={[styles.checkbox, urgency === option.value && styles.checkboxActive]}>{urgency === option.value && <MaterialIcons name="check" size={14} color="#FFFFFF" />}</View></Pressable>)}</View>
        </Section>

        <PrimaryButton label={t("createReferral")} icon="send" onPress={save} disabled={!selectedPatient || !reason.trim()} />
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionLabel}>{label}</Text>{children}</View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, active && styles.choiceActive, { opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, marginBottom: 20, minHeight: 32 },
  backText: { color: "#18332F", fontSize: 14, fontWeight: "800" },
  flex: { flex: 1 },
  section: { marginTop: 22 },
  sectionLabel: { color: "#4A6560", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  choiceList: { gap: 8 },
  patientChoice: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 11, minHeight: 58, padding: 12 },
  patientChoiceActive: { backgroundColor: "#E6F5F3", borderColor: "#087E7B" },
  patientName: { color: "#18332F", fontSize: 15, fontWeight: "900" },
  checkbox: { alignItems: "center", borderColor: "#94AAA4", borderRadius: 6, borderWidth: 1.5, height: 21, justifyContent: "center", width: 21 },
  checkboxActive: { backgroundColor: "#087E7B", borderColor: "#087E7B" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 37, paddingHorizontal: 13 },
  choiceActive: { backgroundColor: "#E6F5F3", borderColor: "#087E7B" },
  choiceText: { color: "#54716B", fontSize: 13, fontWeight: "700" },
  choiceTextActive: { color: "#087E7B" },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 13, borderWidth: 1, color: "#18332F", fontSize: 16, minHeight: 84, paddingHorizontal: 14, paddingVertical: 12, textAlignVertical: "top" },
  urgencyList: { gap: 8 },
  urgencyChoice: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 11, minHeight: 58, padding: 12 },
  urgencyChoiceActive: { backgroundColor: "#FFF8EE", borderColor: "#B66A00" },
  urgencyLabel: { color: "#18332F", fontSize: 14, fontWeight: "800", marginBottom: 2 },
});
