import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiCall } from "@/lib/_core/api";
import {
  getTeleconsultMessages,
  sendTeleconsultMessage,
  type TeleconsultMessage,
  type TeleconsultSession,
} from "@/lib/health/teleconsultChat";

const roleLabel: Record<string, string> = {
  nurse: "Rural Health Worker",
  clinician: "Doctor",
  referral: "Referral Staff",
  manager: "Facility Manager",
  supervisor: "Supervisor",
};

export default function TeleconsultChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);
  const [session, setSession] = useState<TeleconsultSession | null>(null);
  const [messages, setMessages] = useState<TeleconsultMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const listRef = useRef<FlatList<TeleconsultMessage>>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await apiCall<TeleconsultSession>(`/api/teleconsult/${sessionId}`);
      setSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load teleconsult");
    }
  }, [sessionId]);

  const loadMessages = useCallback(async (silent = false) => {
    if (!sessionId) return;
    try {
      const result = await getTeleconsultMessages(sessionId);
      setMessages(result);
      setIsOffline(false);
      if (!silent) setError(null);
    } catch (err) {
      setIsOffline(true);
      if (!silent) setError(err instanceof Error ? err.message : "Unable to load chat");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void Promise.all([loadSession(), loadMessages()]);
    const timer = setInterval(() => void loadMessages(true), 3000);
    return () => clearInterval(timer);
  }, [loadSession, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages.length]);

  const statusLabel = useMemo(() => {
    if (!session) return "Loading";
    return session.status === "active" ? "Live consultation" : session.status[0].toUpperCase() + session.status.slice(1);
  }, [session]);

  const send = async () => {
    const content = message.trim();
    if (!content || sending || !sessionId) return;
    setSending(true);
    try {
      const created = await sendTeleconsultMessage(sessionId, content);
      setMessages((prev) => prev.some((item) => item.id === created.id) ? prev : [...prev, created]);
      setMessage("");
      setError(null);
      setIsOffline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#087E7B" /><Text style={styles.loadingText}>Opening secure consultation chat…</Text></View>;
  }

  const closed = session?.status === "completed" || session?.status === "cancelled";

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={22} color="#18332F" />
        </Pressable>
        <View style={styles.headerMain}>
          <Text style={styles.eyebrow}>Assisted teleconsultation</Text>
          <Text style={styles.title}>Doctor ↔ Rural Health Worker</Text>
          <Text style={styles.subtitle}>{statusLabel} · Session #{sessionId}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: session?.status === "active" ? "#198754" : "#B66A00" }]} />
      </View>

      {closed ? <View style={styles.closedBanner}><MaterialIcons name="lock-outline" size={18} color="#6C817C" /><Text style={styles.closedText}>This consultation is closed. Messages remain available in the consultation record.</Text></View> : null}
      {isOffline ? <View style={styles.offlineBanner}><MaterialIcons name="cloud-off" size={18} color="#9A5B00" /><Text style={styles.offlineText}>Connection interrupted. The chat will retry automatically.</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.senderRole === "clinician" ? styles.doctorRow : styles.workerRow]}>
            <View style={[styles.bubble, item.senderRole === "clinician" ? styles.doctorBubble : styles.workerBubble]}>
              <View style={styles.messageMeta}>
                <Text style={styles.senderName}>{item.senderName}</Text>
                <Text style={styles.senderRole}>{roleLabel[item.senderRole] ?? item.senderRole}</Text>
              </View>
              <Text style={styles.messageText}>{item.content}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="forum" size={34} color="#087E7B" /><Text style={styles.emptyTitle}>Secure consultation chat</Text><Text style={styles.emptyText}>Share symptoms and vitals here. The doctor can guide assessment, escalation, referral, and follow-up.</Text></View>}
      />

      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Message the care team…"
          placeholderTextColor="#8CA19B"
          multiline
          maxLength={2000}
          editable={!closed && !sending}
          style={styles.input}
        />
        <Pressable onPress={send} disabled={!message.trim() || sending || closed} style={({ pressed }) => [styles.sendButton, { opacity: !message.trim() || sending || closed ? 0.45 : pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel="Send message">
          <MaterialIcons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={styles.footerNote}>Clinical decisions remain with the clinician. Chat is linked to this teleconsult session.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8F5" },
  center: { alignItems: "center", backgroundColor: "#F7F8F5", flex: 1, justifyContent: "center", padding: 24 },
  loadingText: { color: "#4A6560", fontSize: 14, fontWeight: "700", marginTop: 12 },
  header: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#DCE7E3", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  back: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  headerMain: { flex: 1 },
  eyebrow: { color: "#087E7B", fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  title: { color: "#18332F", fontSize: 18, fontWeight: "900", marginTop: 3 },
  subtitle: { color: "#6C817C", fontSize: 12, fontWeight: "700", marginTop: 2 },
  statusDot: { borderRadius: 999, height: 11, width: 11 },
  closedBanner: { alignItems: "flex-start", backgroundColor: "#EEF6F0", flexDirection: "row", gap: 8, padding: 10 },
  closedText: { color: "#4A6560", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  offlineBanner: { alignItems: "center", backgroundColor: "#FFF4E5", flexDirection: "row", gap: 8, padding: 9 },
  offlineText: { color: "#9A5B00", flex: 1, fontSize: 12, fontWeight: "800" },
  error: { color: "#B42318", fontSize: 12, fontWeight: "800", paddingHorizontal: 14, paddingTop: 8 },
  messages: { padding: 14, paddingBottom: 16, flexGrow: 1 },
  messageRow: { marginBottom: 10, flexDirection: "row" },
  doctorRow: { justifyContent: "flex-start" },
  workerRow: { justifyContent: "flex-end" },
  bubble: { borderRadius: 16, maxWidth: "86%", padding: 12 },
  doctorBubble: { backgroundColor: "#EAF4FF", borderBottomLeftRadius: 4 },
  workerBubble: { backgroundColor: "#E6F5F3", borderBottomRightRadius: 4 },
  messageMeta: { alignItems: "baseline", flexDirection: "row", gap: 6, marginBottom: 5 },
  senderName: { color: "#18332F", fontSize: 12, fontWeight: "900" },
  senderRole: { color: "#6C817C", fontSize: 10, fontWeight: "800" },
  messageText: { color: "#18332F", fontSize: 15, lineHeight: 21 },
  time: { color: "#6C817C", fontSize: 10, fontWeight: "700", marginTop: 7, textAlign: "right" },
  empty: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, margin: 8, padding: 24 },
  emptyTitle: { color: "#18332F", fontSize: 17, fontWeight: "900", marginTop: 10 },
  emptyText: { color: "#6C817C", fontSize: 13, fontWeight: "600", lineHeight: 19, marginTop: 7, maxWidth: 480, textAlign: "center" },
  composer: { alignItems: "flex-end", backgroundColor: "#FFFFFF", borderTopColor: "#DCE7E3", borderTopWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  input: { backgroundColor: "#F7F8F5", borderColor: "#D5E1DD", borderRadius: 15, borderWidth: 1, color: "#18332F", flex: 1, fontSize: 15, maxHeight: 120, minHeight: 48, paddingHorizontal: 13, paddingVertical: 11, textAlignVertical: "top" },
  sendButton: { alignItems: "center", backgroundColor: "#087E7B", borderRadius: 15, height: 48, justifyContent: "center", width: 48 },
  footerNote: { backgroundColor: "#FFFFFF", color: "#7B8B86", fontSize: 10, fontWeight: "700", paddingBottom: 8, paddingHorizontal: 12, textAlign: "center" },
});
