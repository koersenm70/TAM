from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from database import Base


# SQLAlchemy ORM Model
class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True, nullable=True)
    contact_name = Column(String, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    source = Column(String, nullable=True)  # csv, excel, linkedin, web_scrape, manual
    status = Column(String, default="new")  # new, contacted, qualified, converted, archived
    notes = Column(Text, nullable=True)
    custom_fields = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ScrapingJob(Base):
    __tablename__ = "scraping_jobs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String)
    status = Column(String, default="pending")  # pending, running, completed, failed
    leads_found = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    config = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


# Pydantic Schemas
class LeadBase(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = "new"
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(LeadBase):
    pass


class LeadResponse(LeadBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    leads: list[LeadResponse]


class ScrapingConfig(BaseModel):
    url: str
    extract_emails: bool = True
    extract_phones: bool = True
    extract_company_name: bool = True
    custom_selectors: Optional[dict] = None
    follow_links: bool = False
    max_pages: int = 1


class ScrapingJobResponse(BaseModel):
    id: int
    url: str
    status: str
    leads_found: int
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalyticsResponse(BaseModel):
    total_leads: int
    leads_by_status: dict[str, int]
    leads_by_source: dict[str, int]
    leads_by_industry: dict[str, int]
    recent_leads: list[LeadResponse]
    conversion_rate: float
