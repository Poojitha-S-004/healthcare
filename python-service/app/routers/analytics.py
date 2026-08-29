from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from app.database import get_db
from app.models.entities import Patient, QueueEntry, TriageResult, TeleconsultSession

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/facility/{facility_id}/dashboard")
def get_facility_dashboard(facility_id: int, db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    queue_stats = db.query(
        func.count(QueueEntry.id).label("total"),
        func.count(case((QueueEntry.status == "waiting", 1))).label("waiting"),
        func.count(case((QueueEntry.status == "called", 1))).label("called"),
        func.count(case((QueueEntry.status == "completed", 1))).label("completed"),
        func.count(case((QueueEntry.careCategory == "emergency", 1))).label("emergency"),
        func.count(case((QueueEntry.careCategory == "urgent", 1))).label("urgent"),
    ).filter(
        QueueEntry.facilityId == facility_id,
        QueueEntry.createdAt >= today,
    ).first()

    patient_count = db.query(func.count(Patient.id)).filter(
        Patient.facilityId == facility_id
    ).scalar()

    triage_stats = db.query(
        func.count(TriageResult.id).label("total"),
        func.avg(TriageResult.riskScore).label("avg_risk"),
        func.count(case((TriageResult.careCategory == "emergency", 1))).label("emergency_count"),
    ).filter(
        TriageResult.facilityId == facility_id,
        TriageResult.assessedAt >= today,
    ).first()

    active_teleconsults = db.query(func.count(TeleconsultSession.id)).filter(
        TeleconsultSession.facilityId == facility_id,
        TeleconsultSession.status == "active",
    ).scalar()

    return {
        "facilityId": facility_id,
        "date": today.isoformat(),
        "patients": {"total": patient_count or 0},
        "queue": {
            "total": queue_stats.total if queue_stats else 0,
            "waiting": queue_stats.waiting if queue_stats else 0,
            "called": queue_stats.called if queue_stats else 0,
            "completed": queue_stats.completed if queue_stats else 0,
            "emergency": queue_stats.emergency if queue_stats else 0,
            "urgent": queue_stats.urgent if queue_stats else 0,
        },
        "triage": {
            "total": triage_stats.total if triage_stats else 0,
            "averageRiskScore": round(float(triage_stats.avg_risk or 0), 2) if triage_stats else 0,
            "emergencyCount": triage_stats.emergency_count if triage_stats else 0,
        },
        "teleconsult": {
            "active": active_teleconsults or 0,
        },
    }


@router.get("/facility/{facility_id}/wait-times")
def get_wait_times(
    facility_id: int,
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)

    entries = db.query(QueueEntry).filter(
        QueueEntry.facilityId == facility_id,
        QueueEntry.createdAt >= since,
        QueueEntry.calledAt.isnot(None),
    ).all()

    wait_times = []
    for entry in entries:
        if entry.enteredAt and entry.calledAt:
            wait_seconds = (entry.calledAt - entry.enteredAt).total_seconds()
            wait_times.append({
                "patientId": entry.patientId,
                "careCategory": entry.careCategory,
                "waitSeconds": wait_seconds,
                "enteredAt": entry.enteredAt.isoformat(),
                "calledAt": entry.calledAt.isoformat(),
            })

    avg_wait = sum(w["waitSeconds"] for w in wait_times) / len(wait_times) if wait_times else 0

    return {
        "facilityId": facility_id,
        "periodHours": hours,
        "averageWaitSeconds": round(avg_wait, 1),
        "sampleSize": len(wait_times),
        "entries": wait_times[:100],
    }


@router.get("/facility/{facility_id}/triage-distribution")
def get_triage_distribution(
    facility_id: int,
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    results = db.query(
        TriageResult.careCategory,
        func.count(TriageResult.id).label("count"),
        func.avg(TriageResult.riskScore).label("avg_score"),
    ).filter(
        TriageResult.facilityId == facility_id,
        TriageResult.assessedAt >= since,
    ).group_by(TriageResult.careCategory).all()

    return {
        "facilityId": facility_id,
        "periodDays": days,
        "distribution": [
            {
                "category": r.careCategory,
                "count": r.count,
                "averageScore": round(float(r.avg_score or 0), 2),
            }
            for r in results
        ],
    }


@router.get("/facility/{facility_id}/medicine-alerts")
def get_medicine_alerts(facility_id: int, db: Session = Depends(get_db)):
    return {
        "facilityId": facility_id,
        "alerts": [],
        "message": "Medicine inventory tracking requires integration with pharmacy module",
    }
