from sqlalchemy import select, exists
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document as LCDocument

from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models import DocumentChunk, ChunkPatch

embeddings_model = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)


def custom_retriever(query: str, org_id: int, k: int = 3):
    query_vector = embeddings_model.embed_query(query)

    db = SessionLocal()
    try:
        stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.org_id == org_id)
            .where(
                DocumentChunk.id.notin_(
                    select(ChunkPatch.original_chunk_id)
                    .where(ChunkPatch.is_active == True)
                    .where(ChunkPatch.original_chunk_id.isnot(None))
                )
            )
            .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(k)
        )
        return db.execute(stmt).scalars().all()
    finally:
        db.close()


def patch_retriever(query: str, org_id: int, k: int = 3):
    query_vector = embeddings_model.embed_query(query)

    db = SessionLocal()
    try:
        stmt = (
            select(ChunkPatch)
            .where(ChunkPatch.org_id == org_id)
            .where(ChunkPatch.is_active == True)
            .order_by(ChunkPatch.embedding.cosine_distance(query_vector))
            .limit(k)
        )
        return db.execute(stmt).scalars().all()
    finally:
        db.close()


class LangGraphRetrieverWrapper:
    def invoke(self, query: str, org_id: int):
        patches = patch_retriever(query, org_id)
        chunks = custom_retriever(query, org_id)

        documents = []

        for patch in patches:
            documents.append(
                LCDocument(
                    page_content=patch.content,
                    metadata={
                        "source": "patch",
                        "patch_id": patch.id,
                        "created_by": patch.created_by_user_id,
                        "org_id": patch.org_id,
                        "original_chunk_id": patch.original_chunk_id,
                    },
                )
            )

        for chunk in chunks:
            documents.append(
                LCDocument(
                    page_content=chunk.content,
                    metadata={
                        "source": "document_chunk",
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "org_id": chunk.org_id,
                    },
                )
            )

        return documents


def get_retriever():
    return LangGraphRetrieverWrapper()
