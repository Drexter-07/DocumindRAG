import traceback
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.rag.ingestion import ingest_pdf
from app.db.models import User
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        print(f"--- 1. STARTING UPLOAD: {file.filename} ---")
        print(f"--- 2. USER: {current_user.email} (org_id={current_user.org_id}) ---")

        # ✅ Pass current_user now
        result = ingest_pdf(file, db, current_user)

        print("--- 3. SUCCESS ---")
        return {"status": "success", "data": result}

    except Exception as e:
        print("\n\n!!!!!!!!!!!!!!!!!!!!!! UPLOAD ERROR !!!!!!!!!!!!!!!!!!!!!!")
        print(f"ERROR TYPE: {type(e).__name__}")
        print(f"ERROR MESSAGE: {str(e)}")
        print("TRACEBACK:")
        traceback.print_exc()
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n")
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")
