from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database import get_db
from models import Lead, AnalyticsResponse, LeadResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(project_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    base = db.query(Lead)
    if project_id is not None:
        base = base.filter(Lead.project_id == project_id)

    total_leads = base.count()

    # Leads by status
    status_rows = base.with_entities(Lead.status, func.count(Lead.id)).group_by(Lead.status).all()
    leads_by_status = {row[0] or "unknown": row[1] for row in status_rows}

    # Leads by source
    source_rows = base.with_entities(Lead.source, func.count(Lead.id)).group_by(Lead.source).all()
    leads_by_source = {row[0] or "unknown": row[1] for row in source_rows}

    # Leads by industry (top 10)
    industry_rows = (
        base.with_entities(Lead.industry, func.count(Lead.id))
        .filter(Lead.industry.isnot(None))
        .group_by(Lead.industry)
        .order_by(func.count(Lead.id).desc())
        .limit(10)
        .all()
    )
    leads_by_industry = {row[0]: row[1] for row in industry_rows}

    # Recent leads
    recent = base.order_by(Lead.created_at.desc()).limit(5).all()

    # Conversion rate = converted / total
    converted = leads_by_status.get("converted", 0)
    conversion_rate = round((converted / total_leads * 100), 2) if total_leads > 0 else 0.0

    return AnalyticsResponse(
        total_leads=total_leads,
        leads_by_status=leads_by_status,
        leads_by_source=leads_by_source,
        leads_by_industry=leads_by_industry,
        recent_leads=recent,
        conversion_rate=conversion_rate,
    )
