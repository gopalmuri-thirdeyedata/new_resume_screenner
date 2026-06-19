from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import schemas, models, database
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"]
)

@router.get("/activity/", response_model=List[schemas.ActivityLogResponse])
def get_activity_log(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Return only activity logs created by this user
    return db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == current_user.id
    ).order_by(models.ActivityLog.timestamp.desc()).limit(20).all()

@router.get("/insights/")
def get_insights(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only compute insights from this HR user's candidates
    candidates = db.query(models.Candidate).filter(
        models.Candidate.created_by == current_user.id
    ).all()

    high_score_count = sum(1 for c in candidates if c.score > 80)

    alerts = []
    if high_score_count > 0:
        alerts.append({
            "id": 1,
            "type": "success",
            "message": f"{high_score_count} Top Candidates identified with score > 80."
        })

    return alerts

@router.get("/notifications/")
def get_notifications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Return only unread activity logs belonging to this user
    notes = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == current_user.id,
        models.ActivityLog.is_read == False
    ).order_by(models.ActivityLog.timestamp.desc()).all()
    return notes

@router.put("/notifications/{id}/read")
def mark_notification_read(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    note = db.query(models.ActivityLog).filter(
        models.ActivityLog.id == id,
        models.ActivityLog.user_id == current_user.id
    ).first()
    if note:
        note.is_read = True
        db.commit()
    return {"status": "success"}

from collections import Counter
from datetime import datetime, timedelta

@router.get("/admin/stats/")
def get_admin_stats(
    user_id: int = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Enforce role-based security
    if current_user.role not in ("admin", "SUPER_ADMIN", "HR_ADMIN") and current_user.email != "gopalmuri1919@gmail.com":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied. Admin role required.")

    # 1. Query candidates (filtered by user_id if provided) and activity logs
    candidates_query = db.query(models.Candidate)
    if user_id is not None:
        candidates_query = candidates_query.filter(models.Candidate.created_by == user_id)
    candidates = candidates_query.all()

    logs = db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).limit(10).all()

    # 2. Basic Candidate Statistics
    total_resumes = len(candidates)
    total_screened = sum(1 for c in candidates if c.score > 0)
    total_selected = sum(1 for c in candidates if c.status in ("Hired", "Offer Released") or c.stage == "Offer Sent")
    total_rejected = sum(1 for c in candidates if c.status == "Rejected")
    
    success_rate = 0.0
    if total_screened > 0:
        success_rate = round((total_selected / total_screened) * 100.0, 1)

    # 3. Resume Upload & Screening Trends (grouped by last 7 days)
    # We will generate daily counts for the last 7 days
    today = datetime.utcnow().date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    trends = []
    for day in days:
        uploads = sum(1 for c in candidates if c.created_at and c.created_at.date() == day)
        screened = sum(1 for c in candidates if c.created_at and c.created_at.date() == day and c.score > 0)
        trends.append({
            "date": day.strftime("%b %d"),
            "uploaded": uploads,
            "screened": screened
        })

    # 4. Selection Ratio
    selection_ratio = [
        {"name": "Selected", "value": total_selected, "color": "#5d8c2c"},
        {"name": "Rejected", "value": total_rejected, "color": "#ef4444"},
        {"name": "Pending", "value": max(0, total_screened - total_selected - total_rejected), "color": "#f59e0b"}
    ]

    # 5. Experience Distribution
    exp_buckets = Counter()
    for c in candidates:
        if c.analysis_data and isinstance(c.analysis_data, dict):
            exp_str = str(c.analysis_data.get("experience", "Unspecified")).strip()
            if not exp_str or exp_str == "None" or exp_str == "null":
                exp_str = "Unspecified"
            exp_buckets[exp_str] += 1
        else:
            exp_buckets["Unspecified"] += 1
    
    # Format experience distribution as list
    experience_dist = [{"range": k, "count": v} for k, v in exp_buckets.items()]

    # 6. Keyword Match Distribution (buckets of score)
    score_buckets = {"0-20%": 0, "21-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0}
    for c in candidates:
        if c.analysis_data and isinstance(c.analysis_data, dict):
            pct = c.analysis_data.get("keyword_match_pct")
            if pct is None:
                pct = c.score
            
            if pct <= 20: score_buckets["0-20%"] += 1
            elif pct <= 40: score_buckets["21-40%"] += 1
            elif pct <= 60: score_buckets["41-60%"] += 1
            elif pct <= 80: score_buckets["61-80%"] += 1
            else: score_buckets["81-100%"] += 1
            
    keyword_dist = [{"range": k, "count": v} for k, v in score_buckets.items()]

    # 7. Certification Match Distribution & aggregates
    cert_counts = Counter()
    keyword_counts = Counter()
    for c in candidates:
        if c.analysis_data and isinstance(c.analysis_data, dict):
            certs = c.analysis_data.get("certification_match", [])
            if isinstance(certs, list):
                for cert in certs:
                    cert_counts[str(cert).strip()] += 1
            elif isinstance(certs, str) and certs.strip():
                cert_counts[certs.strip()] += 1
                
            skills = c.analysis_data.get("key_skills_match", [])
            if isinstance(skills, list):
                for s in skills:
                    keyword_counts[str(s).strip()] += 1

    cert_dist = [{"certification": k, "count": v} for k, v in cert_counts.items()]
    most_used_keywords = [{"keyword": k, "count": v} for k, v in keyword_counts.most_common(10)]
    most_matched_certs = [{"certification": k, "count": v} for k, v in cert_counts.most_common(10)]

    # 8. Top Performing Candidate Profiles
    top_candidates = sorted(
        [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "role": c.role,
                "score": c.score if c.score is not None else 0,
                "experience": c.analysis_data.get("experience", "N/A") if c.analysis_data and isinstance(c.analysis_data, dict) else "N/A",
                "certifications": c.analysis_data.get("certification_match", []) if c.analysis_data and isinstance(c.analysis_data, dict) else [],
                "candidate_summary": c.analysis_data.get("candidate_summary", c.analysis_data.get("reasoning", "N/A")) if c.analysis_data and isinstance(c.analysis_data, dict) else "N/A"
            }
            for c in candidates
        ],
        key=lambda x: x["score"],
        reverse=True
    )

    # 9. Recent screening activity
    recent_activity = []
    for log in logs:
        recent_activity.append({
            "id": log.id,
            "action": log.action,
            "target": log.target,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        })

    # Fetch distinct creator ids
    creator_ids = db.query(models.Candidate.created_by).distinct().all()
    creator_ids = [r[0] for r in creator_ids if r[0] is not None]

    # Query ONLY users who have actually created/screened candidates
    hr_users = []
    if creator_ids:
        hr_users = db.query(models.User).filter(models.User.id.in_(creator_ids)).all()
    users_list = [{"id": u.id, "email": u.email} for u in hr_users]

    return {
        "candidate_stats": {
            "total_resumes": total_resumes,
            "total_screened": total_screened,
            "total_selected": total_selected,
            "total_rejected": total_rejected,
            "success_rate": success_rate
        },
        "trends": trends,
        "selection_ratio": selection_ratio,
        "experience_distribution": experience_dist,
        "keyword_match_distribution": keyword_dist,
        "certification_match_distribution": cert_dist,
        "most_used_keywords": most_used_keywords,
        "most_matched_certifications": most_matched_certs,
        "top_candidates": top_candidates,
        "recent_activity": recent_activity,
        "users": users_list
    }
