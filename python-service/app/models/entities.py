from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from sqlalchemy.sql import func
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    localId = Column(String(128), nullable=False)
    name = Column(String(255), nullable=False)
    dateOfBirth = Column(DateTime, nullable=True)
    gender = Column(String(16), nullable=True)
    facilityId = Column(Integer, nullable=False)
    guardianName = Column(Text, nullable=True)
    contactPhone = Column(String(32), nullable=True)
    careCategory = Column(String(10), default="routine", nullable=False)
    allergies = Column(Text, nullable=True)
    currentMedicines = Column(Text, nullable=True)
    registeredAt = Column(DateTime, server_default=func.now())
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, server_default=func.now(), onupdate=func.now())


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    patientId = Column(Integer, nullable=False)
    facilityId = Column(Integer, nullable=False)
    serviceType = Column(String(64), nullable=False)
    careCategory = Column(String(10), default="routine", nullable=False)
    priorityReason = Column(String(512), nullable=True)
    tokenNumber = Column(Integer, default=0)
    status = Column(String(20), default="waiting", nullable=False)
    enteredAt = Column(DateTime, server_default=func.now())
    calledAt = Column(DateTime, nullable=True)
    completedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TeleconsultSession(Base):
    __tablename__ = "teleconsult_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patientId = Column(Integer, nullable=False)
    facilityId = Column(Integer, nullable=False)
    clinicianId = Column(Integer, nullable=True)
    status = Column(String(20), default="scheduled", nullable=False)
    scheduledAt = Column(DateTime, nullable=True)
    startedAt = Column(DateTime, nullable=True)
    endedAt = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(Integer, primary_key=True, index=True)
    patientId = Column(Integer, nullable=False)
    facilityId = Column(Integer, nullable=False)
    careCategory = Column(String(64), nullable=False)
    riskScore = Column(Integer, default=0)
    serviceType = Column(String(64), nullable=True)
    reason = Column(Text, nullable=True)
    assessedBy = Column(String(64), default="rule_based")
    screeningData = Column(JSON, nullable=True)
    assessedAt = Column(DateTime, server_default=func.now())
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SyncOperation(Base):
    __tablename__ = "sync_operations"

    id = Column(Integer, primary_key=True, index=True)
    operationId = Column(String(128), unique=True, nullable=False)
    userId = Column(Integer, nullable=False)
    facilityId = Column(Integer, nullable=True)
    operationType = Column(String(96), nullable=False)
    entityId = Column(String(128), nullable=False)
    payload = Column(Text, nullable=True)
    clientCreatedAt = Column(DateTime, nullable=False)
    receivedAt = Column(DateTime, server_default=func.now())
