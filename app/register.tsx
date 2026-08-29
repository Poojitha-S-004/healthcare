import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton, commonStyles } from "@/components/health/ui";
import { useHealth } from "@/lib/health/store";
import type { CareTag, Patient, PriorityInput } from "@/lib/health/types";

const services = ["General OPD", "Maternal care", "Child care", "Chronic care"];
const risks: { key: keyof PriorityInput; label: string; hint: string }[] = [
  { key: "maternalDanger", label: "Maternal danger sign", hint: "Escalates as emergency" },
  { key: "childDanger", label: "Child danger sign", hint: "Escalates as emergency" },
  { key: "vitalConcern", label: "Vital-sign concern", hint: "Urgent clinical review" },
  { key: "chronicReview", label: "Chronic-care review", hint: "Priority care pathway" },
];

export default function RegisterPatientScreen() {
  const { registerPatient, t } = useHealth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [contact, setContact] = useState("");
  const [sex, setSex] = useState<Patient["sex"]>("female");
  const [service, setService] = useState("General OPD");
  const [careTags, setCareTags] = useState<CareTag[]>(["general"]);
  const [priorityInput, setPriorityInput] = useState<PriorityInput>({});

  const toggleTag = (tag: CareTag) => setCareTags((tags) => tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags.filter((item) => item !== "general"), tag]);
  const toggleRisk = (key: keyof PriorityInput) => setPriorityInput((previous) => ({ ...previous, [key]: !previous[key] }));

  const save = () => {
    if (!name.trim() || !age.trim() || Number.isNaN(Number(age))) {
      Alert.alert("Complete patient details", "Enter a patient name and valid age before adding to the queue.");
      return;
    }
    const patientId = registerPatient({ name, age: Number(age), sex, contact, careTags, service, priorityInput });
    router.replace(`/patient/${patientId}` as never);
  };

  return (
    <View style={commonStyles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.55 : 1 }]}>
          <MaterialIcons name="arrow-back" size={21} color="#18332F" /><Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={commonStyles.eyebrow}>Arrival workflow</Text>
        <Text style={commonStyles.title}>{t("registerPatient")}</Text>
        <Text style={[commonStyles.body, { marginTop: 6 }]}>Create a minimal local record, check the care pathway, then add the patient to the service queue.</Text>

        <Section label={t("name")}><TextInput value={name} onChangeText={setName} placeholder="e.g. Meera Patel" placeholderTextColor="#8CA19B" style={styles.input} autoFocus /></Section>
        <View style={styles.twoColumns}>
          <Section label={t("age")} style={styles.flex}><TextInput value={age} onChangeText={setAge} placeholder="Years" placeholderTextColor="#8CA19B" keyboardType="numeric" style={styles.input} /></Section>
          <Section label={t("contact")} style={styles.flex}><TextInput value={contact} onChangeText={setContact} placeholder="Optional" placeholderTextColor="#8CA19B" keyboardType="phone-pad" style={styles.input} /></Section>
        </View>

        <Section label="Sex"><View style={styles.choiceRow}>{(["female", "male", "other"] as const).map((option) => <Choice key={option} label={option[0].toUpperCase() + option.slice(1)} active={sex === option} onPress={() => setSex(option)} />)}</View></Section>
        <Section label={t("service")}><View style={styles.wrap}>{services.map((option) => <Choice key={option} label={option} active={service === option} onPress={() => setService(option)} />)}</View></Section>
        <Section label="Care pathway"><View style={styles.wrap}>{(["maternal", "child", "chronic", "general"] as CareTag[]).map((tag) => <Choice key={tag} label={t(tag)} active={careTags.includes(tag)} onPress={() => toggleTag(tag)} />)}</View></Section>

        <View style={styles.riskNotice}><MaterialIcons name="health-and-safety" size={18} color="#2369A5" /><Text style={styles.riskText}>{t("triageSupport")}</Text></View>
        <Section label="Priority screening">
          <View style={styles.riskStack}>{risks.map((risk) => <Pressable key={risk.key} onPress={() => toggleRisk(risk.key)} style={({ pressed }) => [styles.riskChoice, priorityInput[risk.key] && styles.riskChoiceActive, { opacity: pressed ? 0.72 : 1 }]}><View style={[styles.check, priorityInput[risk.key] && styles.checkActive]}>{priorityInput[risk.key] && <MaterialIcons name="check" size={15} color="#FFFFFF" />}</View><View style={styles.flex}><Text style={styles.riskTitle}>{risk.label}</Text><Text style={commonStyles.tiny}>{risk.hint}</Text></View></Pressable>)}</View>
        </Section>
        <PrimaryButton label={t("addToQueue")} icon="person-add" onPress={save} />
      </ScrollView>
    </View>
  );
}

function Section({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) { return <View style={[styles.section, style]}><Text style={styles.label}>{label}</Text>{children}</View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.choice, active && styles.choiceActive, { opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 38 }, back: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 6, marginBottom: 20, minHeight: 32 }, backText: { color: "#18332F", fontSize: 14, fontWeight: "800" },
  section: { marginTop: 20 }, label: { color: "#18332F", fontSize: 13, fontWeight: "800", marginBottom: 8 }, input: { backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 13, borderWidth: 1, color: "#18332F", fontSize: 16, minHeight: 50, paddingHorizontal: 14 },
  twoColumns: { flexDirection: "row", gap: 12 }, flex: { flex: 1 }, choiceRow: { flexDirection: "row", gap: 8 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 999, borderWidth: 1, minHeight: 37, paddingHorizontal: 13, justifyContent: "center" }, choiceActive: { backgroundColor: "#E6F5F3", borderColor: "#087E7B" }, choiceText: { color: "#54716B", fontSize: 13, fontWeight: "700" }, choiceTextActive: { color: "#087E7B" },
  riskNotice: { alignItems: "flex-start", backgroundColor: "#EAF4FF", borderRadius: 13, flexDirection: "row", gap: 9, marginTop: 24, padding: 12 }, riskText: { color: "#2369A5", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 }, riskStack: { gap: 9 }, riskChoice: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D5E1DD", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 64, padding: 12 }, riskChoiceActive: { backgroundColor: "#FFF8EE", borderColor: "#B66A00" }, check: { alignItems: "center", borderColor: "#94AAA4", borderRadius: 6, borderWidth: 1.5, height: 22, justifyContent: "center", width: 22 }, checkActive: { backgroundColor: "#B66A00", borderColor: "#B66A00" }, riskTitle: { color: "#18332F", fontSize: 14, fontWeight: "800", marginBottom: 2 },
});
