from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
from pgvector.sqlalchemy import Vector
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SENIOR = "senior"
    VIEWER = "viewer"

    @classmethod
    def values(cls) -> set[str]:
        return {role.value for role in cls}


# ✅ NEW: Organization/Workspace
class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)

    role = Column(String, nullable=False, default=UserRole.VIEWER.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # ✅ NEW: belongs to an org
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="users")

    # --- Helper properties ---
    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN.value

    @property
    def is_senior(self) -> bool:
        return self.role == UserRole.SENIOR.value

    @property
    def is_viewer(self) -> bool:
        return self.role == UserRole.VIEWER.value

    # --- ORM relationships ---
    patches_created = relationship(
        "ChunkPatch",
        back_populates="creator",
        cascade="all, delete-orphan",
    )

    chats = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# --- 2. The Document Store ---
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    filename = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)

    # ✅ NEW: doc belongs to org
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="documents")

    # optional audit trail
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True)

    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_index = Column(Integer)
    content = Column(Text)
    embedding = Column(Vector(1536))

    is_verified = Column(Boolean, default=False)

    # ✅ NEW: belongs to org (fast retrieval filter)
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    document = relationship("Document", back_populates="chunks")

    patches = relationship(
        "ChunkPatch",
        back_populates="original_chunk",
        passive_deletes=True,
    )


# --- 3. The Self-Healing Layer (Patches) ---
class ChunkPatch(Base):
    __tablename__ = "chunk_patches"

    id = Column(Integer, primary_key=True)

    # ✅ NEW
    org_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    original_chunk_id = Column(
        Integer,
        ForeignKey("document_chunks.id", ondelete="CASCADE"),
        nullable=True,
    )

    content = Column(Text)
    embedding = Column(Vector(1536))

    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)

    is_active = Column(Boolean, default=True)

    original_chunk = relationship("DocumentChunk", back_populates="patches")
    creator = relationship("User", back_populates="patches_created")


# --- 4. Chat History (User Isolated) ---
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")

    messages = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"))

    role = Column(String)  # user/assistant
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
