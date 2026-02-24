from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ---------------------------
# Chat Models
# ---------------------------
class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[int] = None


class SourceItem(BaseModel):
    source_type: str
    chunk_id: Optional[int] = None
    document_id: Optional[int] = None
    patch_id: Optional[int] = None
    org_id: Optional[int] = None
    created_by: Optional[int] = None
    content_preview: str
    content: Optional[str] = None  # optional full content for expandable UI
    original_chunk_id: Optional[int] = None # ✅ add this



class ChatResponse(BaseModel):
    chat_id: int
    response: str
    source_summary: Optional[str] = None
    sources: List[SourceItem] = []


class ChatListItem(BaseModel):
    id: int
    title: str
    created_at: datetime


class MessageItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime


class MessagesResponse(BaseModel):
    chat_id: int
    messages: List[MessageItem]

# ---------------------------
# Patch Models
# ---------------------------

class PatchCreateRequest(BaseModel):
    content: str
    original_chunk_id: Optional[int] = None
    patch_id: Optional[int] = None   # ✅ NEW for patching a patch


class PatchItem(BaseModel):
    id: int
    content: str
    org_id: int
    original_chunk_id: Optional[int]
    created_by_user_id: int
    created_at: datetime
    is_active: bool


class PatchListResponse(BaseModel):
    patches: List[PatchItem]


class PatchDeactivateResponse(BaseModel):
    status: str
    patch_id: int
    is_active: bool
