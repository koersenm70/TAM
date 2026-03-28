import io
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Lead

router = APIRouter(prefix="/import", tags=["import"])

# Mapping of common column name variations to our schema fields
COLUMN_MAP = {
    # Company
    "company": "company_name",
    "company name": "company_name",
    "organization": "company_name",
    "account name": "company_name",
    "employer": "company_name",
    # Contact
    "name": "contact_name",
    "full name": "contact_name",
    "contact": "contact_name",
    "contact name": "contact_name",
    "first name": "_first_name",
    "last name": "_last_name",
    "firstname": "_first_name",
    "lastname": "_last_name",
    # Email
    "email": "email",
    "email address": "email",
    "e-mail": "email",
    # Phone
    "phone": "phone",
    "phone number": "phone",
    "mobile": "phone",
    "telephone": "phone",
    # Website
    "website": "website",
    "url": "website",
    "web": "website",
    "company website": "website",
    # Industry
    "industry": "industry",
    "sector": "industry",
    "vertical": "industry",
    # Size
    "company size": "company_size",
    "employees": "company_size",
    "size": "company_size",
    "headcount": "company_size",
    "employee count": "company_size",
    # Location
    "location": "location",
    "city": "location",
    "address": "location",
    "country": "location",
    "region": "location",
    # LinkedIn
    "linkedin": "linkedin_url",
    "linkedin url": "linkedin_url",
    "linkedin profile": "linkedin_url",
    "profile url": "linkedin_url",
    # Notes
    "notes": "notes",
    "note": "notes",
    "comments": "notes",
    "description": "notes",
}

SCHEMA_FIELDS = {
    "company_name", "contact_name", "email", "phone", "website",
    "industry", "company_size", "location", "linkedin_url", "notes",
    "status", "source",
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename = {}
    first_names = None
    last_names = None

    for col in df.columns:
        normalized = col.strip().lower()
        mapped = COLUMN_MAP.get(normalized)
        if mapped == "_first_name":
            first_names = col
        elif mapped == "_last_name":
            last_names = col
        elif mapped:
            rename[col] = mapped

    df = df.rename(columns=rename)

    # Combine first + last name into contact_name
    if first_names and last_names and "contact_name" not in df.columns:
        df["contact_name"] = (
            df[first_names].fillna("").astype(str).str.strip()
            + " "
            + df[last_names].fillna("").astype(str).str.strip()
        ).str.strip()
        df.drop(columns=[first_names, last_names], inplace=True, errors="ignore")

    return df


def df_to_leads(df: pd.DataFrame, source: str, project_id: Optional[int] = None) -> list[Lead]:
    df = normalize_columns(df)
    df = df.where(pd.notna(df), None)
    leads = []

    # Extra columns become custom_fields
    extra_cols = [c for c in df.columns if c not in SCHEMA_FIELDS]

    for _, row in df.iterrows():
        data = {}
        for field in SCHEMA_FIELDS:
            if field in df.columns:
                val = row[field]
                data[field] = str(val).strip() if val is not None else None

        if not data.get("source"):
            data["source"] = source
        if not data.get("status"):
            data["status"] = "new"

        custom = {}
        for col in extra_cols:
            val = row.get(col)
            if val is not None:
                custom[col] = str(val).strip()
        if custom:
            data["custom_fields"] = custom

        # Skip completely empty rows
        useful = {k: v for k, v in data.items() if v and k not in ("source", "status")}
        if not useful:
            continue

        if project_id is not None:
            data["project_id"] = project_id
        leads.append(Lead(**data))

    return leads


@router.post("/csv")
async def import_csv(
    file: UploadFile = File(...),
    source_label: Optional[str] = Form("csv"),
    project_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")

    leads = df_to_leads(df, source_label or "csv", project_id)
    db.add_all(leads)
    db.commit()
    return {"imported": len(leads), "total_rows": len(df)}


@router.post("/excel")
async def import_excel(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    source_label: Optional[str] = Form("excel"),
    project_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content), sheet_name=sheet_name or 0, dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {e}")

    leads = df_to_leads(df, source_label or "excel", project_id)
    db.add_all(leads)
    db.commit()
    return {"imported": len(leads), "total_rows": len(df)}


@router.post("/linkedin")
async def import_linkedin(
    file: UploadFile = File(...),
    project_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Import LinkedIn connections export (CSV from LinkedIn Settings > Data Privacy > Get a copy of your data).
    Also supports Sales Navigator CSV exports.
    """
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str, skiprows=0)
        # LinkedIn exports sometimes have 3 header rows — detect and skip
        if df.columns[0].startswith("Note") or "LinkedIn" in df.columns[0]:
            df = pd.read_csv(io.BytesIO(content), dtype=str, skiprows=3)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse LinkedIn CSV: {e}")

    leads = df_to_leads(df, "linkedin", project_id)
    db.add_all(leads)
    db.commit()
    return {"imported": len(leads), "total_rows": len(df)}


@router.get("/preview-csv")
async def preview_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str, nrows=5)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"columns": list(df.columns), "preview": df.head(5).to_dict(orient="records")}
