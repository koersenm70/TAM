from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from database import get_db
from models import Lead, LeadCreate, LeadUpdate, LeadResponse, LeadListResponse

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=LeadListResponse)
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    industry: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Lead.company_name.ilike(term),
                Lead.contact_name.ilike(term),
                Lead.email.ilike(term),
                Lead.location.ilike(term),
            )
        )
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source == source)
    if industry:
        query = query.filter(Lead.industry.ilike(f"%{industry}%"))

    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return LeadListResponse(total=total, page=page, page_size=page_size, leads=leads)


@router.post("", response_model=LeadResponse, status_code=201)
def create_lead(lead_in: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**lead_in.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: int, lead_in: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for field, value in lead_in.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()


@router.delete("", status_code=204)
def delete_leads(ids: list[int], db: Session = Depends(get_db)):
    db.query(Lead).filter(Lead.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
