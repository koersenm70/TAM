import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base, SessionLocal
from auth import get_current_user, hash_password
from routers import leads, imports, scraping, export, analytics
from routers.auth_router import router as auth_router
from routers.admin import router as admin_router

# Create all DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Market Research & Lead Generation API",
    description="Automate market research, data collection, and lead generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes (no auth required)
app.include_router(auth_router)

# Protected routes (require login)
_auth = [Depends(get_current_user)]
app.include_router(leads.router, dependencies=_auth)
app.include_router(imports.router, dependencies=_auth)
app.include_router(scraping.router, dependencies=_auth)
app.include_router(analytics.router, dependencies=_auth)
app.include_router(admin_router)  # admin routes have their own dependency

# Export uses token query param (for direct browser download links)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Serve React frontend (production build) ──────────────────────────────────
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    # Catch-all: serve index.html for frontend routes (React Router)
    # Excludes API paths so POST/PUT/DELETE requests are not intercepted
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith(("auth/", "leads", "import", "scrape", "export", "analytics", "admin", "health")):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    @app.get("/")
    def root():
        return {"name": "Market Research & Lead Generation API", "version": "1.0.0", "docs": "/docs"}


# ── Create default admin on first startup ─────────────────────────────────
def _create_default_admin():
    from models import User
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                username="admin",
                full_name="Administrator",
                hashed_password=hash_password("admin123"),
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("=" * 50)
            print("  Default admin account created:")
            print("  Username : admin")
            print("  Password : admin123")
            print("  ⚠  Change this password in the Admin panel!")
            print("=" * 50)
    finally:
        db.close()


_create_default_admin()
