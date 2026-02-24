import os
import shutil
from sqlalchemy.orm import Session
from fastapi import UploadFile

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

from app.db.models import Document, DocumentChunk, User
from app.core.config import settings

embeddings_model = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)


def ingest_pdf(file: UploadFile, db: Session, current_user: User):
    temp_file_path = f"temp_{file.filename}"

    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        loader = PyPDFLoader(temp_file_path)
        raw_docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        chunks = text_splitter.split_documents(raw_docs)

        # ✅ Document belongs to org
        db_document = Document(
            filename=file.filename,
            org_id=current_user.org_id,
            uploaded_by_user_id=current_user.id,
        )

        db.add(db_document)
        db.commit()
        db.refresh(db_document)

        chunk_objects = []
        for i, chunk in enumerate(chunks):
            vector = embeddings_model.embed_query(chunk.page_content)

            db_chunk = DocumentChunk(
                document_id=db_document.id,
                org_id=current_user.org_id,
                chunk_index=i,
                content=chunk.page_content,
                embedding=vector,
            )
            chunk_objects.append(db_chunk)

        db.add_all(chunk_objects)
        db.commit()

        return {"filename": file.filename, "chunks_processed": len(chunks)}

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
