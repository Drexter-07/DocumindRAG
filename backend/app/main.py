from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import engine, get_db, SessionLocal
from app.db.models import Base, User, UserRole, Organization

from app.api.routes.docs import router as docs_router
from app.api.routes.chat import router as chat_router
from app.api.routes.admin import router as admin_router
from app.api.routes.documents import router as documents_router


def seed_test_users(db: Session):
    # ✅ Ensure default org exists
    org = db.query(Organization).filter(Organization.name == "DocuMind Team").first()
    if not org:
        org = Organization(name="DocuMind Team")
        db.add(org)
        db.commit()
        db.refresh(org)

    existing = db.query(User).filter(
        User.email.in_(
            [
                "admin@documind.com",
                "senior@documind.com",
                "junior@documind.com",
            ]
        )
    ).all()

    if existing:
        return  # already seeded

    print("--- SEEDING TEST USERS ---")

    users = [
        User(email="admin@documind.com", role=UserRole.ADMIN.value, org_id=org.id),
        User(email="senior@documind.com", role=UserRole.SENIOR.value, org_id=org.id),
        User(email="junior@documind.com", role=UserRole.VIEWER.value, org_id=org.id),
    ]

    db.add_all(users)
    db.commit()

    print("--- USERS CREATED ---")


@asynccontextmanager
async def lifespan(app: FastAPI):
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_test_users(db)
    finally:
        db.close()

    yield
    print("--- SHUTTING DOWN ---")


app = FastAPI(title="DocuMind RAG API", lifespan=lifespan)

import os

# Get frontend URL from env or fallback to local
frontend_url = os.getenv("FRONTEND_URL", "*")

origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
if frontend_url != "*":
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if frontend_url == "*" else origins, # Fallback to completely open for easy Render deployment if not explicitly set
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(docs_router, prefix="/api/v1", tags=["Docs"])
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(admin_router, prefix="/api/v1", tags=["Admin"])
app.include_router(documents_router, prefix="/api/v1", tags=["Documents"])


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}


@app.get("/")
def read_root():
    return {"message": "Welcome to DocuMind API"}
