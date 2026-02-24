from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Message, ChatSession, User
from app.rag.chain import rag_chain
from langchain_core.messages import HumanMessage, AIMessage
# Import our new Auth Helper
from app.api.deps import get_current_user 
#importing from schamas.py
from app.api.schemas import (
    ChatRequest,
    ChatResponse,
    ChatListItem,
    MessagesResponse,
    MessageItem,
)

from typing import List


router = APIRouter()

def _preview(text: str, limit: int = 180) -> str:
    text = (text or "").strip().replace("\n", " ")
    return text[:limit] + ("..." if len(text) > limit else "")


def format_sources(context_docs: list) -> list:
    """
    Converts LangChain Documents into structured + frontend-friendly sources.
    """
    sources = []

    for doc in context_docs or []:
        # In case something is passed as plain string
        if isinstance(doc, str):
            sources.append({
                "source_type": "raw_text",
                "content_preview": _preview(doc),
            })
            continue

        # LangChain Document
        meta = getattr(doc, "metadata", {}) or {}
        content = getattr(doc, "page_content", "") or ""

        source_type = meta.get("source")  # "patch" or "document_chunk"

        sources.append({
            "source_type": source_type or "unknown",
            "chunk_id": meta.get("chunk_id"),
            "document_id": meta.get("document_id"),
            "patch_id": meta.get("patch_id"),
            "original_chunk_id": meta.get("original_chunk_id"),   # ✅ added
            "org_id": meta.get("org_id"),
            "created_by": meta.get("created_by"),
            "content_preview": _preview(content),
            # optional, add full content only if you want expandable UI
            "content": content,
        })

    return sources


def build_source_summary(sources: list) -> str | None:
    """
    Returns one-line UX summary like:
    "From Patch #17" or "From Resume.pdf chunk #12"
    """
    if not sources:
        return None

    # prefer patch if present
    patch = next((s for s in sources if s.get("source_type") == "patch"), None)
    if patch:
        return f"From Patch #{patch.get('patch_id')}"

    chunk = next((s for s in sources if s.get("source_type") == "document_chunk"), None)
    if chunk:
        return f"From Document #{chunk.get('document_id')} chunk #{chunk.get('chunk_id')}"

    return "From retrieved context"




@router.get("/chats", response_model=List[ChatListItem])
def list_user_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chats = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )

    return [
        ChatListItem(
            id=chat.id,
            title=chat.title,
            created_at=chat.created_at,
        )
        for chat in chats
    ]



@router.get("/chats/{chat_id}/messages", response_model=MessagesResponse)
def get_chat_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate chat belongs to user
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == chat_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found",
        )

    # 2. Fetch messages
    messages = (
        db.query(Message)
        .filter(Message.session_id == chat_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    # 3. Serialize
    return MessagesResponse(
        chat_id=chat_id,
        messages=[
            MessageItem(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
    )


@router.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == chat_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found",
        )

    db.delete(session)
    db.commit()
    return {"status": "success"}


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    # This automatically finds the user based on the header "X-Test-Email"
    current_user: User = Depends(get_current_user) 
):
    try:
        # 1. Find or Create a Chat Session for this User
        # (For simplicity, we just use one session per user for now)
        # 1. Get or create chat session
        if request.chat_id:
            session = (
                db.query(ChatSession)
                .filter(
                    ChatSession.id == request.chat_id,
                    ChatSession.user_id == current_user.id,
                )
                .first()
            )

            if not session:
                raise HTTPException(
                    status_code=404,
                    detail="Chat session not found",
                )
        else:
            session = ChatSession(
                user_id=current_user.id,
                title="New Chat",
            )
            db.add(session)
            db.commit()
            db.refresh(session)


        # 2. Fetch History (scoped to this session)
        history_msgs = db.query(Message)\
            .filter(Message.session_id == session.id)\
            .order_by(Message.created_at.asc())\
            .limit(10).all()
        
        chat_history = []
        for msg in history_msgs:
            if msg.role == "user":
                chat_history.append(HumanMessage(content=msg.content))
            else:
                chat_history.append(AIMessage(content=msg.content))

        # 3. Run AI
        inputs = {"question": request.message, "chat_history": chat_history, "org_id": current_user.org_id}
        result = await rag_chain.ainvoke(inputs)
        
        # 4. Save to DB (With User Link!)
        user_msg = Message(session_id=session.id, role="user", content=request.message)
        ai_msg = Message(session_id=session.id, role="assistant", content=result["answer"])
        
        db.add_all([user_msg, ai_msg])
        db.commit()
        
        context_docs = result.get("context", [])
        formatted_sources = format_sources(context_docs)
        source_summary = build_source_summary(formatted_sources)

        return ChatResponse(
            chat_id=session.id,
            response=result["answer"],
            sources=formatted_sources,
            source_summary=source_summary,
        )
     

        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))