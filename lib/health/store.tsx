import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { evaluatePriority } from "./priority";
import { priorityLabel, priorityReasonLabel, referralLabel, syncLabel, translate, type TranslationKey } from "./i18n";
import { serializeOperation, type SyncTransport } from "./sync";
import type {
  AppLanguage,
  CareTag,
  Encounter,
  HealthState,
  InventoryTransactionType,
  OfflineOperation,
  Patient,
  Priority,
  PriorityInput,
  QueueEntry,
  QueueStatus,
  ReferralStatus,
  SyncState,
} from "./types";

const STORAGE_KEY = "rural-health-access.workspace.v1";
let sequence = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(sequence += 1).toString(36)}`;
const now = Date.now();

const seededState: HealthState = {
  language: "en",
  patients: [
    { id: "p-101", localId: "RH-1024", name: "Asha Devi", age: 27, sex: "female", contact: "98••• 1812", careTags: ["maternal"], allergies: ["None recorded"], currentMedicines: ["Iron + folic acid"], syncState: "synced", updatedAt: now - 3600000 },
    { id: "p-102", localId: "RH-1025", name: "Rohan Kumar", age: 3, sex: "male", contact: "98••• 4419", careTags: ["child"], allergies: ["None recorded"], currentMedicines: [], syncState: "synced", updatedAt: now - 5400000 },
    { id: "p-103", localId: "RH-1026", name: "Savitri Bai", age: 62, sex: "female", contact: "97••• 1013", careTags: ["chronic"], allergies: ["Penicillin"], currentMedicines: ["Amlodipine"], syncState: "pending", updatedAt: now - 900000 },
    { id: "p-104", localId: "RH-1027", name: "Imran Khan", age: 48, sex: "male", contact: "99••• 8420", careTags: ["general", "chronic"], allergies: ["None recorded"], currentMedicines: ["Metformin"], syncState: "synced", updatedAt: now - 7200000 },
  ],
  queue: [
    { id: "q-101", patientId: "p-102", service: "Child care", arrivedAt: now - 42 * 60000, priority: "emergency", priorityReason: "childDanger", status: "waiting", syncState: "synced" },
    { id: "q-102", patientId: "p-101", service: "Maternal care", arrivedAt: now - 30 * 60000, priority: "urgent", priorityReason: "vitalConcern", status: "waiting", syncState: "synced" },
    { id: "q-103", patientId: "p-103", service: "Chronic care", arrivedAt: now - 18 * 60000, priority: "priority", priorityReason: "chronicReview", status: "waiting", syncState: "pending" },
    { id: "q-104", patientId: "p-104", service: "General OPD", arrivedAt: now - 8 * 60000, priority: "routine", priorityReason: "routineCare", status: "waiting", syncState: "synced" },
  ],
  encounters: [
    { id: "e-101", patientId: "p-101", type: "followUp", note: "Antenatal follow-up completed; next review scheduled.", createdAt: now - 3 * 86400000, syncState: "synced" },
    { id: "e-102", patientId: "p-103", type: "consultation", note: "Blood pressure review and medicine adherence discussed.", createdAt: now - 14 * 86400000, syncState: "synced" },
  ],
  referrals: [
    { id: "r-101", patientId: "p-101", destination: "District Women’s Hospital", reason: "Obstetric ultrasound review", urgency: "priority", status: "accepted", createdAt: now - 86400000, updatedAt: now - 2 * 3600000, syncState: "synced" },
    { id: "r-102", patientId: "p-102", destination: "Community Health Centre", reason: "Paediatric danger-sign assessment", urgency: "emergency", status: "sent", createdAt: now - 45 * 60000, updatedAt: now - 45 * 60000, syncState: "pending" },
  ],
  medicines: [
    { id: "m-101", name: "Oral rehydration salts", localName: "ओआरएस", unit: "sachets", stock: 58, minimumStock: 25, expiryDays: 210, lastSyncedAt: now - 15 * 60000, syncState: "synced" },
    { id: "m-102", name: "Iron + folic acid", localName: "आयरन + फोलिक एसिड", unit: "tablets", stock: 16, minimumStock: 30, expiryDays: 105, lastSyncedAt: now - 15 * 60000, syncState: "synced" },
    { id: "m-103", name: "Amoxicillin suspension", localName: "एमोक्सिसिलिन", unit: "bottles", stock: 0, minimumStock: 8, expiryDays: 42, lastSyncedAt: now - 150 * 60000, syncState: "pending" },
    { id: "m-104", name: "Amlodipine 5 mg", localName: "एम्लोडिपिन", unit: "tablets", stock: 74, minimumStock: 40, expiryDays: 18, lastSyncedAt: now - 15 * 60000, syncState: "synced" },
  ],
  inventoryTransactions: [],
  operations: [{ id: "op-seed", type: "inventory.adjustment", entityId: "m-103", createdAt: now - 150 * 60000 }],
  lastSyncedAt: now - 15 * 60000,
};

type RegistrationInput = {
  name: string;
  age: number;
  sex: Patient["sex"];
  contact?: string;
  careTags: CareTag[];
  service: string;
  priorityInput: PriorityInput;
};

type HealthContextValue = {
  state: HealthState;
  isHydrated: boolean;
  syncing: boolean;
  syncError: string | null;
  t: (key: TranslationKey) => string;
  priorityLabel: (priority: Priority) => string;
  priorityReasonLabel: (reason: Parameters<typeof priorityReasonLabel>[1]) => string;
  referralLabel: (status: ReferralStatus) => string;
  syncLabel: (syncState: SyncState) => string;
  setLanguage: (language: AppLanguage) => void;
  registerPatient: (input: RegistrationInput) => string;
  updateQueueStatus: (queueId: string, status: QueueStatus) => void;
  overrideQueuePriority: (queueId: string, priority: Priority, reason: string) => void;
  addEncounter: (patientId: string, note: string) => void;
  createReferral: (input: { patientId: string; destination: string; reason: string; urgency: Priority }) => void;
  updateReferralStatus: (referralId: string, status: ReferralStatus) => void;
  recordInventoryTransaction: (medicineId: string, type: InventoryTransactionType, quantity: number) => void;
  syncNow: () => void;
  getPatient: (patientId: string) => Patient | undefined;
  getPatientEncounters: (patientId: string) => Encounter[];
};

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

function addOperation(state: HealthState, type: string, entityId: string) {
  const operation: OfflineOperation = { id: makeId("op"), type, entityId, createdAt: Date.now() };
  return { ...state, operations: [...state.operations, operation] };
}

export function HealthProvider({ children, syncTransport }: PropsWithChildren<{ syncTransport?: SyncTransport }>) {
  const [state, setState] = useState<HealthState>(seededState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const transportRef = useRef<SyncTransport | undefined>(syncTransport);
  transportRef.current = syncTransport;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setState(JSON.parse(saved) as HealthState);
      })
      .catch(() => undefined)
      .finally(() => setIsHydrated(true));
  }, []);

  useEffect(() => {
    if (isHydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [isHydrated, state]);

  const setLanguage = useCallback((language: AppLanguage) => {
    setState((previous) => ({ ...previous, language }));
  }, []);

  const registerPatient = useCallback((input: RegistrationInput) => {
    const patientId = makeId("patient");
    const queueId = makeId("queue");
    const timestamp = Date.now();
    const assessment = evaluatePriority(input.priorityInput);
    const patient: Patient = {
      id: patientId,
      localId: `RH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: input.name.trim(),
      age: input.age,
      sex: input.sex,
      contact: input.contact?.trim(),
      careTags: input.careTags.length ? input.careTags : ["general"],
      allergies: ["Not recorded"],
      currentMedicines: [],
      syncState: "pending",
      updatedAt: timestamp,
    };
    const queueEntry: QueueEntry = {
      id: queueId,
      patientId,
      service: input.service,
      arrivedAt: timestamp,
      priority: assessment.priority,
      priorityReason: assessment.reason,
      status: "waiting",
      syncState: "pending",
    };
    const triageEncounter: Encounter = {
      id: makeId("encounter"),
      patientId,
      type: "triage",
      note: `Initial triage: ${assessment.reason}.`,
      createdAt: timestamp,
      syncState: "pending",
    };
    setState((previous) => {
      const next = {
        ...previous,
        patients: [patient, ...previous.patients],
        queue: [queueEntry, ...previous.queue],
        encounters: [triageEncounter, ...previous.encounters],
      };
      return addOperation(addOperation(next, "patient.create", patientId), "queue.add", queueId);
    });
    return patientId;
  }, []);

  const updateQueueStatus = useCallback((queueId: string, status: QueueStatus) => {
    setState((previous) => {
      const next = { ...previous, queue: previous.queue.map((item) => item.id === queueId ? { ...item, status, syncState: "pending" as const } : item) };
      return addOperation(next, "queue.status", queueId);
    });
  }, []);

  const overrideQueuePriority = useCallback((queueId: string, priority: Priority, reason: string) => {
    setState((previous) => {
      const next = { ...previous, queue: previous.queue.map((item) => item.id === queueId ? { ...item, priority, priorityReason: "clinicianUrgent" as const, overrideReason: reason, syncState: "pending" as const } : item) };
      return addOperation(next, "queue.override", queueId);
    });
  }, []);

  const addEncounter = useCallback((patientId: string, note: string) => {
    const encounter: Encounter = { id: makeId("encounter"), patientId, type: "consultation", note, createdAt: Date.now(), syncState: "pending" };
    setState((previous) => addOperation({ ...previous, encounters: [encounter, ...previous.encounters] }, "encounter.create", encounter.id));
  }, []);

  const createReferral = useCallback((input: { patientId: string; destination: string; reason: string; urgency: Priority }) => {
    const referral = { id: makeId("referral"), ...input, status: "draft" as const, createdAt: Date.now(), updatedAt: Date.now(), syncState: "pending" as const };
    setState((previous) => addOperation({ ...previous, referrals: [referral, ...previous.referrals] }, "referral.create", referral.id));
  }, []);

  const updateReferralStatus = useCallback((referralId: string, status: ReferralStatus) => {
    setState((previous) => {
      const next = { ...previous, referrals: previous.referrals.map((item) => item.id === referralId ? { ...item, status, updatedAt: Date.now(), syncState: "pending" as const } : item) };
      return addOperation(next, "referral.status", referralId);
    });
  }, []);

  const recordInventoryTransaction = useCallback((medicineId: string, type: InventoryTransactionType, quantity: number) => {
    const signedQuantity = type === "receipt" ? quantity : -Math.abs(quantity);
    const transaction = { id: makeId("inventory"), medicineId, type, quantity: signedQuantity, createdAt: Date.now(), syncState: "pending" as const };
    setState((previous) => {
      const next = {
        ...previous,
        medicines: previous.medicines.map((medicine) => medicine.id === medicineId ? { ...medicine, stock: Math.max(0, medicine.stock + signedQuantity), syncState: "pending" as const } : medicine),
        inventoryTransactions: [transaction, ...previous.inventoryTransactions],
      };
      return addOperation(next, `inventory.${type}`, transaction.id);
    });
  }, []);

  const syncNow = useCallback(() => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    // No transport configured (e.g. not wired in the layout yet): resolve as no-op.
    if (!transportRef.current) {
      setState((previous) => ({ ...previous, lastSyncedAt: Date.now() }));
      setSyncing(false);
      return;
    }
    // Snapshot the queued operations for this batch so acknowledgement mapping
    // is stable even if new offline mutations are queued mid-flight.
    const batch = state.operations.map(serializeOperation);
    if (batch.length === 0) {
      setState((previous) => ({ ...previous, lastSyncedAt: Date.now() }));
      setSyncing(false);
      return;
    }
    transportRef.current(batch)
      .then((result) => {
        const acked = new Set(result.acknowledgedIds);
        setState((previous) => ({
          ...previous,
          patients: previous.patients.map((item) => (acked.has(item.id) ? { ...item, syncState: "synced" as const } : item)),
          queue: previous.queue.map((item) => (acked.has(item.id) ? { ...item, syncState: "synced" as const } : item)),
          encounters: previous.encounters.map((item) => (acked.has(item.id) ? { ...item, syncState: "synced" as const } : item)),
          referrals: previous.referrals.map((item) => (acked.has(item.id) ? { ...item, syncState: "synced" as const } : item)),
          medicines: previous.medicines.map((item) => (acked.has(item.id) ? { ...item, syncState: "synced" as const, lastSyncedAt: Date.now() } : item)),
          inventoryTransactions: previous.inventoryTransactions.map((item) => (acked.has(item.id) ? { ...item, syncState: "synced" as const } : item)),
          operations: previous.operations.filter((operation) => !acked.has(operation.id)),
          lastSyncedAt: result.acknowledgedAt,
        }));
      })
      .catch((error) => {
        setSyncError(error instanceof Error ? error.message : "Sync failed. Changes remain queued locally and will retry on the next network check.");
      })
      .finally(() => setSyncing(false));
  }, [state.operations, syncing]);

  // Auto-sync: when the device comes back online with queued offline changes,
  // push them to the backend (delta sync on network-detected rising edge).
  const syncNowRef = useRef<() => void>(() => undefined);
  syncNowRef.current = syncNow;
  const wasOnlineRef = useRef<boolean | null>(null);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
      const previouslyOnline = wasOnlineRef.current;
      wasOnlineRef.current = isOnline;
      if (isOnline && previouslyOnline === false) {
        syncNowRef.current();
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<HealthContextValue>(() => ({
    state,
    isHydrated,
    syncing,
    syncError,
    t: (key) => translate(state.language, key),
    priorityLabel: (priority) => priorityLabel(state.language, priority),
    priorityReasonLabel: (reason) => priorityReasonLabel(state.language, reason),
    referralLabel: (status) => referralLabel(state.language, status),
    syncLabel: (syncState) => syncLabel(state.language, syncState),
    setLanguage,
    registerPatient,
    updateQueueStatus,
    overrideQueuePriority,
    addEncounter,
    createReferral,
    updateReferralStatus,
    recordInventoryTransaction,
    syncNow,
    getPatient: (patientId) => state.patients.find((patient) => patient.id === patientId),
    getPatientEncounters: (patientId) => state.encounters.filter((encounter) => encounter.patientId === patientId).sort((a, b) => b.createdAt - a.createdAt),
  }), [addEncounter, createReferral, isHydrated, overrideQueuePriority, recordInventoryTransaction, registerPatient, setLanguage, state, syncNow, syncing, syncError, updateQueueStatus, updateReferralStatus]);

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) throw new Error("useHealth must be used within HealthProvider");
  return context;
}
