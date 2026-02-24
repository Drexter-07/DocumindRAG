from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import Document, User
from app.api.deps import get_current_user, require_admin

router = APIRouter()

class DocumentListItem(BaseModel):
    id: int
    filename: str
    upload_date: datetime

    class Config:
        from_attributes = True

@router.get("/documents", response_model=List[DocumentListItem])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .filter(Document.org_id == current_user.org_id)
        .order_by(Document.upload_date.desc())
        .all()
    )
    return docs

@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.org_id == current_user.org_id)
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()

    return {"status": "success", "deleted_document_id": document_id}
