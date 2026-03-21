from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import leads, imports, scraping, export, analytics

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Market Research & Lead Generation API",
    description="Automate market research, data collection, and lead generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router)
app.include_router(imports.router)
app.include_router(scraping.router)
app.include_router(export.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {
        "name": "Market Research & Lead Generation API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
