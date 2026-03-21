from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import Lead, ScrapingJob, ScrapingConfig, ScrapingJobResponse
from scraper import scrape_url

router = APIRouter(prefix="/scrape", tags=["scraping"])


def run_scraping_job(job_id: int, url: str, config: dict, db: Session):
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
    if not job:
        return

    job.status = "running"
    db.commit()

    try:
        leads_data = scrape_url(url, config)
        inserted = 0
        for lead_data in leads_data:
            lead = Lead(**lead_data)
            db.add(lead)
            inserted += 1
        db.commit()

        job.status = "completed"
        job.leads_found = inserted
        job.completed_at = datetime.utcnow()
    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.completed_at = datetime.utcnow()

    db.commit()


@router.post("/url", response_model=ScrapingJobResponse, status_code=202)
def scrape_single_url(
    config: ScrapingConfig,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job = ScrapingJob(
        url=config.url,
        status="pending",
        config=config.model_dump(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        run_scraping_job, job.id, config.url, config.model_dump(), db
    )
    return job


@router.post("/bulk", status_code=202)
def scrape_bulk_urls(
    urls: list[str],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    jobs = []
    for url in urls:
        job = ScrapingJob(url=url, status="pending", config={})
        db.add(job)
        db.flush()
        background_tasks.add_task(run_scraping_job, job.id, url, {}, db)
        jobs.append({"id": job.id, "url": url})
    db.commit()
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/jobs", response_model=list[ScrapingJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(ScrapingJob).order_by(ScrapingJob.created_at.desc()).limit(50).all()


@router.get("/jobs/{job_id}", response_model=ScrapingJobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
