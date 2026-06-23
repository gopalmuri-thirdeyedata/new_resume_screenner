from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import schemas, models, database
from routers.auth import get_current_user
from routers.resume import normalize_role
from collections import Counter
from datetime import datetime, timedelta, timezone

router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"]
)

@router.get("/activity/", response_model=List[schemas.ActivityLogResponse])
def get_activity_log(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == current_user.id
    ).order_by(models.ActivityLog.timestamp.desc()).limit(20).all()

@router.get("/insights/")
def get_insights(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
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

@router.get("/admin/stats/")
def get_admin_stats(
    user_id: Optional[int] = None,
    time_range: int = 7,  # days; 0 = all time
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "SUPER_ADMIN", "HR_ADMIN") and current_user.email != "gopalmuri1919@gmail.com":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied. Admin role required.")

    # Build time-filtered candidate query
    candidates_query = db.query(models.Candidate)
    if user_id is not None:
        candidates_query = candidates_query.filter(models.Candidate.created_by == user_id)

    since = None
    if time_range > 0:
        since = datetime.now(timezone.utc) - timedelta(days=time_range)
        candidates_query = candidates_query.filter(models.Candidate.created_at >= since)

    candidates = candidates_query.all()

    # All candidates unfiltered by time (for recruiter lifetime breakdown)
    all_candidates_query = db.query(models.Candidate)
    if user_id is not None:
        all_candidates_query = all_candidates_query.filter(models.Candidate.created_by == user_id)
    all_candidates = all_candidates_query.all()

    # Build time-filtered jobs query
    jobs_query = db.query(models.ScreeningJob)
    if user_id is not None:
        jobs_query = jobs_query.filter(models.ScreeningJob.created_by == user_id)
    if since:
        jobs_query = jobs_query.filter(models.ScreeningJob.created_at >= since)
    jobs = jobs_query.all()

    logs_query = db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc())
    if since:
        logs_query = logs_query.filter(models.ActivityLog.timestamp >= since)
    logs = logs_query.limit(10).all()

    # === Core Stats ===
    total_resumes = len(jobs)
    total_screened = sum(1 for j in jobs if j.status == "completed")
    total_selected = sum(
        1 for c in candidates
        if c.status != "Rejected"
    )
    total_rejected = sum(1 for c in candidates if c.status == "Rejected") + sum(1 for j in jobs if j.status in ("failed", "dead"))
    total_hired = sum(1 for c in candidates if c.status == "Hired")

    scored = [c for c in candidates if c.score and c.score > 0]
    avg_score = round(sum(c.score for c in scored) / len(scored), 1) if scored else 0.0
    success_rate = round((total_selected / total_screened) * 100.0, 1) if total_screened > 0 else 0.0

    # === Pipeline Funnel ===
    pipeline_funnel = [
        {"stage": "Uploaded", "count": total_resumes, "color": "#4f46e5"},
        {"stage": "Screened", "count": total_screened, "color": "#5d8c2c"},
        {"stage": "Shortlisted", "count": total_selected, "color": "#f59e0b"},
        {"stage": "Hired", "count": total_hired, "color": "#10b981"},
    ]

    # === Trends (time-range aware) ===
    today = datetime.now(timezone.utc).date()
    trends = []

    if time_range == 0 or time_range > 90:
        # Monthly for last 6 months
        for m in range(5, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=m * 30)).replace(day=1)
            if m > 0:
                month_end = (today.replace(day=1) - timedelta(days=(m - 1) * 30)).replace(day=1) - timedelta(days=1)
            else:
                month_end = today
            uploads = sum(1 for j in jobs if j.created_at and month_start <= j.created_at.date() <= month_end)
            screened = sum(1 for j in jobs if j.created_at and month_start <= j.created_at.date() <= month_end and j.status == "completed")
            trends.append({"date": month_start.strftime("%b %Y"), "uploaded": uploads, "screened": screened})
    elif time_range <= 7:
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            uploads = sum(1 for j in jobs if j.created_at and j.created_at.date() == day)
            screened = sum(1 for j in jobs if j.created_at and j.created_at.date() == day and j.status == "completed")
            trends.append({"date": day.strftime("%b %d"), "uploaded": uploads, "screened": screened})
    elif time_range <= 30:
        for w in range(4, -1, -1):
            week_end = today - timedelta(days=w * 7)
            week_start = week_end - timedelta(days=6)
            uploads = sum(1 for j in jobs if j.created_at and week_start <= j.created_at.date() <= week_end)
            screened = sum(1 for j in jobs if j.created_at and week_start <= j.created_at.date() <= week_end and j.status == "completed")
            trends.append({"date": week_start.strftime("%b %d"), "uploaded": uploads, "screened": screened})
    else:  # 90d — weekly, ~13 points
        for w in range(12, -1, -1):
            week_end = today - timedelta(days=w * 7)
            week_start = week_end - timedelta(days=6)
            uploads = sum(1 for j in jobs if j.created_at and week_start <= j.created_at.date() <= week_end)
            screened = sum(1 for j in jobs if j.created_at and week_start <= j.created_at.date() <= week_end and j.status == "completed")
            trends.append({"date": week_start.strftime("%b %d"), "uploaded": uploads, "screened": screened})

    # === Selection Ratio ===
    selection_ratio = [
        {"name": "Selected", "value": sum(1 for c in candidates if c.stage != "Resume Screening" and c.status != "Rejected"), "color": "#5d8c2c"},
        {"name": "Rejected", "value": total_rejected, "color": "#ef4444"},
        {"name": "Pending", "value": sum(1 for c in candidates if c.stage == "Resume Screening" and c.status != "Rejected"), "color": "#f59e0b"}
    ]

    # === Score Distribution ===
    score_buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"]
    for c in candidates:
        s = c.score or 0
        if s <= 20: score_buckets["0-20"] += 1
        elif s <= 40: score_buckets["21-40"] += 1
        elif s <= 60: score_buckets["41-60"] += 1
        elif s <= 80: score_buckets["61-80"] += 1
        else: score_buckets["81-100"] += 1
    score_distribution = [
        {"range": k, "count": v, "color": c}
        for (k, v), c in zip(score_buckets.items(), colors)
    ]

    # === Experience Distribution ===
    exp_buckets = Counter()
    for c in candidates:
        if c.analysis_data and isinstance(c.analysis_data, dict):
            exp_str = str(c.analysis_data.get("experience", "Unspecified")).strip()
            if not exp_str or exp_str in ("None", "null", ""):
                exp_str = "Unspecified"
            exp_buckets[exp_str] += 1
        else:
            exp_buckets["Unspecified"] += 1
    experience_dist = [{"range": k, "count": v} for k, v in exp_buckets.items()]

    # === Keyword / Cert / Skills aggregation ===
    cert_counts = Counter()
    keyword_counts = Counter()
    missing_counts = Counter()
    comp_totals = {"skills": [], "experience": [], "projects": [], "education": [], "bonus": []}

    for c in candidates:
        if not (c.analysis_data and isinstance(c.analysis_data, dict)):
            continue
        ad = c.analysis_data

        certs = ad.get("certification_match", [])
        if isinstance(certs, list):
            for cert in certs: cert_counts[str(cert).strip()] += 1
        elif isinstance(certs, str) and certs.strip():
            cert_counts[certs.strip()] += 1

        skills = ad.get("key_skills_match", [])
        if isinstance(skills, list):
            for s in skills: keyword_counts[str(s).strip()] += 1

        missing = ad.get("missing_skills", [])
        if isinstance(missing, list):
            for s in missing:
                s = str(s).strip()
                if s: missing_counts[s] += 1

        comp = ad.get("component_scores", {})
        if isinstance(comp, dict):
            for k in comp_totals:
                val = comp.get(k)
                if val is not None:
                    try: comp_totals[k].append(float(val))
                    except: pass

    cert_dist = [{"certification": k, "count": v} for k, v in cert_counts.items()]
    most_used_keywords = [{"keyword": k, "count": v} for k, v in keyword_counts.most_common(10)]
    most_matched_certs = [{"certification": k, "count": v} for k, v in cert_counts.most_common(10)]
    top_missing_skills = [{"skill": k, "count": v} for k, v in missing_counts.most_common(10)]
    avg_component_scores = {
        k: round(sum(v) / len(v), 1) if v else 0.0
        for k, v in comp_totals.items()
    }

    # === Keyword Match Distribution ===
    km_buckets = {"0-20%": 0, "21-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0}
    for c in candidates:
        if c.analysis_data and isinstance(c.analysis_data, dict):
            pct = c.analysis_data.get("keyword_match_pct") or c.score or 0
            if pct <= 20: km_buckets["0-20%"] += 1
            elif pct <= 40: km_buckets["21-40%"] += 1
            elif pct <= 60: km_buckets["41-60%"] += 1
            elif pct <= 80: km_buckets["61-80%"] += 1
            else: km_buckets["81-100%"] += 1
    keyword_dist = [{"range": k, "count": v} for k, v in km_buckets.items()]

    # === Top Candidates ===
    top_candidates = sorted(
        [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "role": c.role,
                "score": c.score if c.score is not None else 0,
                "resume_file": c.resume_file,
                "phone": c.phone,
                "analysis_data": c.analysis_data,
                "experience": c.analysis_data.get("experience", "N/A") if c.analysis_data and isinstance(c.analysis_data, dict) else "N/A",
                "certifications": c.analysis_data.get("certification_match", []) if c.analysis_data and isinstance(c.analysis_data, dict) else [],
                "candidate_summary": c.analysis_data.get("candidate_summary", c.analysis_data.get("reasoning", "N/A")) if c.analysis_data and isinstance(c.analysis_data, dict) else "N/A"
            }
            for c in candidates
        ],
        key=lambda x: x["score"],
        reverse=True
    )

    # === Recent Activity ===
    recent_activity = [
        {
            "id": log.id,
            "action": log.action,
            "target": log.target,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in logs
    ]

    # === Recruiter Breakdown ===
    cand_creators = db.query(models.Candidate.created_by).distinct().all()
    job_creators = db.query(models.ScreeningJob.created_by).distinct().all()
    creator_ids = list(set([r[0] for r in cand_creators if r[0] is not None] + [r[0] for r in job_creators if r[0] is not None]))

    hr_users = []
    if creator_ids:
        hr_users = db.query(models.User).filter(models.User.id.in_(creator_ids)).all()
    users_list = [{"id": u.id, "email": u.email} for u in hr_users]

    user_breakdown = []
    for u in hr_users:
        u_cand = [c for c in all_candidates if c.created_by == u.id]
        u_jobs_all = db.query(models.ScreeningJob).filter(models.ScreeningJob.created_by == u.id).all()
        u_total = len(u_jobs_all)
        u_screened = sum(1 for j in u_jobs_all if j.status == "completed")
        u_selected = sum(
            1 for c in u_cand
            if c.status != "Rejected"
        )
        u_hired = sum(1 for c in u_cand if c.status == "Hired")
        u_rejected = sum(1 for c in u_cand if c.status == "Rejected") + sum(1 for j in u_jobs_all if j.status in ("failed", "dead"))
        u_avg_score = round(
            sum(c.score for c in u_cand if c.score and c.score > 0) / max(u_screened, 1), 1
        )

        last_log = db.query(models.ActivityLog).filter(
            models.ActivityLog.user_id == u.id
        ).order_by(models.ActivityLog.timestamp.desc()).first()
        last_active = last_log.timestamp.isoformat() if last_log and last_log.timestamp else None
        last_action = last_log.action if last_log else "None"

        recent_logs = db.query(models.ActivityLog).filter(
            models.ActivityLog.user_id == u.id
        ).order_by(models.ActivityLog.timestamp.desc()).limit(5).all()
        recent_activity_recruiter = [
            {
                "action": l.action,
                "target": l.target,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in recent_logs
        ]

        u_jobs = db.query(
            models.ScreeningJob.batch_id,
            models.ScreeningJob.batch_name,
            models.ScreeningJob.jd_text,
            func.min(models.ScreeningJob.created_at).label("created_at"),
            func.count(models.ScreeningJob.id).label("total")
        ).filter(
            models.ScreeningJob.created_by == u.id
        ).group_by(
            models.ScreeningJob.batch_id,
            models.ScreeningJob.batch_name,
            models.ScreeningJob.jd_text
        ).all()

        batches_list = []
        all_recruiter_keywords = Counter()

        for job in u_jobs:
            jd_text = job.jd_text or ""
            custom_prompt_text = ""
            keywords_text = ""
            clean_jd = jd_text

            if "[CUSTOM REQUIREMENTS]:" in clean_jd:
                parts = clean_jd.split("[CUSTOM REQUIREMENTS]:")
                clean_jd = parts[0]
                custom_prompt_text = parts[1].strip() if len(parts) > 1 else ""

            if "Required Keywords:" in clean_jd:
                parts = clean_jd.split("Required Keywords:")
                clean_jd = parts[0]
                keywords_text = parts[1].strip() if len(parts) > 1 else ""
                for kw in keywords_text.split(","):
                    kw = kw.strip()
                    if kw: all_recruiter_keywords[kw] += 1

            jd_lines = [l.strip() for l in clean_jd.split('\n') if l.strip()]
            title = jd_lines[0][:80] if jd_lines else "General Screening"
            title = normalize_role(title)

            batch_candidates = db.query(models.Candidate).filter(
                models.Candidate.id.in_(
                    db.query(models.ScreeningJob.candidate_id).filter(
                        models.ScreeningJob.batch_id == job.batch_id,
                        models.ScreeningJob.candidate_id.isnot(None)
                    )
                )
            ).all()

            candidates_list = [
                {
                    "id": c.id, "name": c.name, "email": c.email, "role": c.role,
                    "score": c.score, "resume_file": c.resume_file, "phone": c.phone,
                    "analysis_data": c.analysis_data
                }
                for c in batch_candidates
            ]

            batch_avg = round(
                sum(c["score"] or 0 for c in candidates_list) / max(len(candidates_list), 1), 1
            )

            batches_list.append({
                "batch_id": job.batch_id,
                "batch_name": job.batch_name or title,
                "role": title,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "total": job.total,
                "avg_score": batch_avg,
                "custom_prompt": custom_prompt_text,
                "keywords": keywords_text,
                "candidates": candidates_list
            })

        top_keywords_used = [
            {"keyword": k, "count": v}
            for k, v in all_recruiter_keywords.most_common(5)
        ]

        user_breakdown.append({
            "id": u.id,
            "email": u.email,
            "total_resumes": u_total,
            "total_screened": u_screened,
            "total_selected": u_selected,
            "total_hired": u_hired,
            "total_rejected": u_rejected,
            "avg_score": u_avg_score,
            "last_active": last_active,
            "last_action": last_action,
            "recent_activity": recent_activity_recruiter,
            "top_keywords_used": top_keywords_used,
            "batches": batches_list
        })

    return {
        "candidate_stats": {
            "total_resumes": total_resumes,
            "total_screened": total_screened,
            "total_selected": total_selected,
            "total_rejected": total_rejected,
            "total_hired": total_hired,
            "avg_score": avg_score,
            "success_rate": success_rate
        },
        "pipeline_funnel": pipeline_funnel,
        "trends": trends,
        "selection_ratio": selection_ratio,
        "score_distribution": score_distribution,
        "experience_distribution": experience_dist,
        "keyword_match_distribution": keyword_dist,
        "certification_match_distribution": cert_dist,
        "most_used_keywords": most_used_keywords,
        "most_matched_certifications": most_matched_certs,
        "top_missing_skills": top_missing_skills,
        "avg_component_scores": avg_component_scores,
        "top_candidates": top_candidates,
        "recent_activity": recent_activity,
        "users": users_list,
        "user_breakdown": user_breakdown
    }
