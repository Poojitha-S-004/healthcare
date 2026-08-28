import { Patient, QueueEntry, TeleconsultSession } from "../../database/entities";

export interface FhirIdentifier {
  system: string;
  value: string;
}

export interface FhirHumanName {
  use?: string;
  family?: string;
  given?: string[];
  text?: string;
}

export interface FhirContactPoint {
  system: string;
  value: string;
  use?: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
  contact?: Array<{
    relationship?: FhirCodeableConcept[];
    name?: FhirHumanName;
    telecom?: FhirContactPoint[];
  }>;
  meta?: {
    lastUpdated: string;
  };
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  status: string;
  class: FhirCoding;
  subject: FhirReference;
  participant?: Array<{
    individual?: FhirReference;
  }>;
  period?: FhirPeriod;
  type?: FhirCodeableConcept[];
  meta?: {
    lastUpdated: string;
  };
}

export interface FhirBundle {
  resourceType: "Bundle";
  type: "searchset" | "collection";
  total?: number;
  entry?: Array<{
    resource: FhirPatient | FhirEncounter;
  }>;
}

export function patientToFhir(patient: Patient): FhirPatient {
  const genderMap: Record<string, string> = {
    male: "male",
    female: "female",
    other: "other",
    unknown: "unknown",
  };

  const names: FhirHumanName[] = [];
  if (patient.name) {
    const parts = patient.name.split(" ");
    names.push({
      use: "official",
      family: parts.pop(),
      given: parts,
      text: patient.name,
    });
  }

  const result: FhirPatient = {
    resourceType: "Patient",
    id: String(patient.id),
    identifier: [
      {
        system: "urn:oid:local-facility",
        value: patient.localId,
      },
    ],
    name: names.length > 0 ? names : undefined,
    gender: patient.gender ? genderMap[patient.gender.toLowerCase()] : undefined,
    birthDate: patient.dateOfBirth
      ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
      : undefined,
    meta: {
      lastUpdated: patient.updatedAt?.toISOString() ?? new Date().toISOString(),
    },
  };

  if (patient.contactPhone) {
    result.contact = [
      {
        telecom: [
          {
            system: "phone",
            value: patient.contactPhone,
            use: "mobile",
          },
        ],
      },
    ];
  }

  return result;
}

export function encounterFromQueueEntry(entry: QueueEntry, patient?: Patient): FhirEncounter {
  const statusMap: Record<string, string> = {
    waiting: "arrived",
    called: "triaged",
    in_progress: "in-progress",
    completed: "finished",
    transferred: "cancelled",
    paused: "onleave",
  };

  return {
    resourceType: "Encounter",
    id: String(entry.id),
    status: statusMap[entry.status] ?? "unknown",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: entry.serviceType === "emergency" ? "EMER" : entry.serviceType === "teleconsult" ? "VR" : "AMB",
      display: entry.serviceType,
    },
    subject: {
      reference: `Patient/${entry.patientId}`,
      display: patient?.name ?? undefined,
    },
    type: entry.careCategory
      ? [
          {
            coding: [
              {
                system: "http://rural-health-access.local/fhir/CodeSystem/triage-category",
                code: entry.careCategory,
                display: entry.careCategory.charAt(0).toUpperCase() + entry.careCategory.slice(1),
              },
            ],
          },
        ]
      : undefined,
    period: {
      start: entry.enteredAt?.toISOString(),
      end: entry.completedAt?.toISOString() ?? undefined,
    },
    meta: {
      lastUpdated: entry.updatedAt?.toISOString() ?? new Date().toISOString(),
    },
  };
}

export function encounterFromTeleconsult(session: TeleconsultSession): FhirEncounter {
  return {
    resourceType: "Encounter",
    id: `teleconsult-${session.id}`,
    status: session.status === "active" ? "in-progress" : session.status === "completed" ? "finished" : session.status === "cancelled" ? "cancelled" : "planned",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "VR",
      display: "Virtual",
    },
    subject: {
      reference: `Patient/${session.patientId}`,
    },
    participant: session.clinicianId
      ? [
          {
            individual: {
              reference: `Practitioner/${session.clinicianId}`,
              display: `Clinician ${session.clinicianId}`,
            },
          },
        ]
      : undefined,
    period: {
      start: session.scheduledAt?.toISOString() ?? undefined,
      end: session.endedAt?.toISOString() ?? undefined,
    },
    meta: {
      lastUpdated: session.updatedAt?.toISOString() ?? new Date().toISOString(),
    },
  };
}

export function createFhirBundle<T extends FhirPatient | FhirEncounter>(
  resources: T[],
  type: "searchset" | "collection" = "searchset",
): FhirBundle {
  return {
    resourceType: "Bundle",
    type,
    total: resources.length,
    entry: resources.map((resource) => ({ resource })),
  };
}
