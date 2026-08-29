from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from app.database import get_db
from app.models.entities import Patient, QueueEntry, TriageResult, TeleconsultSession, SyncOperation

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/facility/{facility_id}/daily")
def daily_report(
    facility_id: int,
    date: str = Query(default=None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    if date:
        report_date = datetime.strptime(date, "%Y-%m-%d")
    else:
        report_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    next_day = report_date + timedelta(days=1)

    patients_registered = db.query(func.count(Patient.id)).filter(
        Patient.facilityId == facility_id,
        Patient.createdAt >= report_date,
        Patient.createdAt < next_day,
    ).scalar()

    queue_entries = db.query(func.count(QueueEntry.id)).filter(
        QueueEntry.facilityId == facility_id,
        QueueEntry.createdAt >= report_date,
        QueueEntry.createdAt < next_day,
    ).scalar()

    completed = db.query(func.count(QueueEntry.id)).filter(
        QueueEntry.facilityId == facility_id,
        QueueEntry.createdAt >= report_date,
        QueueEntry.createdAt < next_day,
        QueueEntry.status == "completed",
    ).scalar()

    triage_assessments = db.query(func.count(TriageResult.id)).filter(
        TriageResult.facilityId == facility_id,
        TriageResult.assessedAt >= report_date,
        TriageResult.assessedAt < next_day,
    ).scalar()

    teleconsult_sessions = db.query(func.count(TeleconsultSession.id)).filter(
        TeleconsultSession.facilityId == facility_id,
        TeleconsultSession.createdAt >= report_date,
        TeleconsultSession.createdAt < next_day,
    ).scalar()

    sync_operations = db.query(func.count(SyncOperation.id)).filter(
        SyncOperation.facilityId == facility_id,
        SyncOperation.receivedAt >= report_date,
        SyncOperation.receivedAt < next_day,
    ).scalar()

    return {
        "facilityId": facility_id,
        "date": report_date.strftime("%Y-%m-%d"),
        "summary": {
            "patientsRegistered": patients_registered or 0,
            "queueEntries": queue_entries or 0,
            "patientsCompleted": completed or 0,
            "triageAssessments": triage_assessments or 0,
            "teleconsultSessions": teleconsult_sessions or 0,
            "syncOperations": sync_operations or 0,
        },
    }


@router.get("/facility/{facility_id}/weekly")
def weekly_report(
    facility_id: int,
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())

    daily_data = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        next_day = day + timedelta(days=1)

        patients = db.query(func.count(Patient.id)).filter(
            Patient.facilityId == facility_id,
            Patient.createdAt >= day,
            Patient.createdAt < next_day,
        ).scalar()

        completed = db.query(func.count(QueueEntry.id)).filter(
            QueueEntry.facilityId == facility_id,
            QueueEntry.createdAt >= day,
            QueueEntry.createdAt < next_day,
            QueueEntry.status == "completed",
        ).scalar()

        daily_data.append({
            "date": day.strftime("%Y-%m-%d"),
            "patientsRegistered": patients or 0,
            "patientsCompleted": completed or 0,
        })

    return {
        "facilityId": facility_id,
        "weekStart": week_start.strftime("%Y-%m-%d"),
        "weekEnd": (week_start + timedelta(days=6)).strftime("%Y-%m-%d"),
        "daily": daily_data,
    }
