from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from langchain_openai import OpenAIEmbeddings

from app.db.session import get_db
from app.db.models import ChunkPatch, User, DocumentChunk
from app.core.config import settings
from app.api.deps import require_admin_or_senior

router = APIRouter()

embeddings_model = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)


class PatchCreate(BaseModel):
    content: str
    original_chunk_id: int | None = None
    patch_id: int | None = None  # ✅ NEW: allows patching a patch


@router.post("/patches")
def create_patch(
    patch_data: PatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_senior),
):
    """
    ✅ PATCH CREATION RULES:

    1) If original_chunk_id provided:
        - Validate chunk exists
        - Validate chunk belongs to same org
        - Create patch attached to that chunk

    2) If patch_id provided:
        - Validate patch exists
        - Validate patch belongs to same org
        - New patch attaches to SAME original_chunk_id as that patch
        - Optional: deactivate old patch

    3) If neither provided:
        - Org-global patch (no original_chunk_id)
    """

    if patch_data.original_chunk_id is not None and patch_data.patch_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Provide either original_chunk_id OR patch_id, not both.",
        )

    target_chunk_id = None

    # ---------------------------
    # Case A: patching a chunk
    # ---------------------------
    if patch_data.original_chunk_id is not None:
        chunk = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.id == patch_data.original_chunk_id)
            .first()
        )

        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk not found")

        if chunk.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Chunk belongs to another organization")

        target_chunk_id = chunk.id

    # ---------------------------
    # Case B: patching a patch
    # ---------------------------
    elif patch_data.patch_id is not None:
        old_patch = (
            db.query(ChunkPatch)
            .filter(ChunkPatch.id == patch_data.patch_id)
            .first()
        )

        if not old_patch:
            raise HTTPException(status_code=404, detail="Patch not found")

        if old_patch.org_id != current_user.org_id:
            raise HTTPException(status_code=403, detail="Patch belongs to another organization")

        # New patch applies to same chunk the old patch was correcting
        target_chunk_id = old_patch.original_chunk_id

        # ✅ Optional MVP improvement:
        # deactivate old patch because we are overriding it
        old_patch.is_active = False
        db.add(old_patch)

    print(f"--- CREATING PATCH BY: {current_user.email} ---")

    try:
        vector = embeddings_model.embed_query(patch_data.content)

        new_patch = ChunkPatch(
            org_id=current_user.org_id,
            content=patch_data.content,
            embedding=vector,
            original_chunk_id=target_chunk_id,  # can be None (org-global patch)
            created_by_user_id=current_user.id,
            is_active=True,
        )

        db.add(new_patch)
        db.commit()
        db.refresh(new_patch)

        return {"status": "success", "patch_id": new_patch.id}

    except Exception as e:
        print(f"Error creating patch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ✅ GET patch list (history)
@router.get("/patches")
def list_patches(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_senior),
    chunk_id: int | None = None,
    active_only: bool = False,
):
    """
    Returns patch history for an org.
    Optional:
      - chunk_id: filter patches linked to specific chunk
      - active_only: return only active patches
    """
    query = db.query(ChunkPatch).filter(ChunkPatch.org_id == current_user.org_id)

    if chunk_id is not None:
        query = query.filter(ChunkPatch.original_chunk_id == chunk_id)

    if active_only:
        query = query.filter(ChunkPatch.is_active == True)

    patches = query.order_by(desc(ChunkPatch.created_at)).all()

    return [
        {
            "id": p.id,
            "content": p.content,
            "org_id": p.org_id,
            "original_chunk_id": p.original_chunk_id,
            "created_by_user_id": p.created_by_user_id,
            "created_at": p.created_at,
            "is_active": p.is_active,
        }
        for p in patches
    ]


# ✅ Rollback endpoint
@router.patch("/patches/{patch_id}/deactivate")
def deactivate_patch(
    patch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_senior),
):
    patch = db.query(ChunkPatch).filter(ChunkPatch.id == patch_id).first()

    if not patch:
        raise HTTPException(status_code=404, detail="Patch not found")

    if patch.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Patch belongs to another organization")

    patch.is_active = False
    db.add(patch)
    db.commit()
    db.refresh(patch)

    return {"status": "success", "patch_id": patch.id, "is_active": patch.is_active}


# ✅ Optional: re-activate patch
@router.patch("/patches/{patch_id}/activate")
def activate_patch(
    patch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_senior),
):
    patch = db.query(ChunkPatch).filter(ChunkPatch.id == patch_id).first()

    if not patch:
        raise HTTPException(status_code=404, detail="Patch not found")

    if patch.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Patch belongs to another organization")

    patch.is_active = True
    db.add(patch)
    db.commit()
    db.refresh(patch)

    return {"status": "success", "patch_id": patch.id, "is_active": patch.is_active}
