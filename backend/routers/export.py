import io
import pandas as pd
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Lead
from auth import decode_token

router = APIRouter(prefix="/export", tags=["export"])


def _verify_token_param(token: Optional[str], db: Session) -> None:
    """Allow auth via ?token= query param for direct download links."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

EXPORT_FIELDS = [
    "id", "company_name", "contact_name", "email", "phone", "website",
    "industry", "company_size", "location", "linkedin_url",
    "source", "status", "notes", "created_at",
]


def leads_to_df(leads: list[Lead]) -> pd.DataFrame:
    rows = []
    for lead in leads:
        row = {f: getattr(lead, f, None) for f in EXPORT_FIELDS}
        if lead.custom_fields:
            for k, v in lead.custom_fields.items():
                row[f"custom_{k}"] = v
        rows.append(row)
    return pd.DataFrame(rows)


def get_filtered_leads(
    db: Session,
    status: Optional[str],
    source: Optional[str],
    industry: Optional[str],
    ids: Optional[str],
) -> list[Lead]:
    query = db.query(Lead)
    if ids:
        id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
        query = query.filter(Lead.id.in_(id_list))
    if status:
        query = query.filter(Lead.status == status)
    if source:
        query = query.filter(Lead.source == source)
    if industry:
        query = query.filter(Lead.industry.ilike(f"%{industry}%"))
    return query.order_by(Lead.created_at.desc()).all()


@router.get("/csv")
def export_csv(
    token: Optional[str] = Query(None),
    status: Optional[str] = None,
    source: Optional[str] = None,
    industry: Optional[str] = None,
    ids: Optional[str] = Query(None, description="Comma-separated lead IDs"),
    db: Session = Depends(get_db),
):
    _verify_token_param(token, db)
    leads = get_filtered_leads(db, status, source, industry, ids)
    df = leads_to_df(leads)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"},
    )


@router.get("/excel")
def export_excel(
    token: Optional[str] = Query(None),
    status: Optional[str] = None,
    source: Optional[str] = None,
    industry: Optional[str] = None,
    ids: Optional[str] = Query(None, description="Comma-separated lead IDs"),
    db: Session = Depends(get_db),
):
    _verify_token_param(token, db)
    leads = get_filtered_leads(db, status, source, industry, ids)
    df = leads_to_df(leads)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Leads")
    buf.seek(0)
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leads_export.xlsx"},
    )
