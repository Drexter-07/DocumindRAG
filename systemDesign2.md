# DocuMind RAG - System Design Document

## 1. Introduction

DocuMind RAG is a Retrieval-Augmented Generation (RAG) system designed to allow users to upload PDF documents and chat with them using AI. It features a unique "Self-Healing" mechanism that allows administrators to patch incorrect chunks of information, ensuring the AI improves over time.

## 2. High-Level Design (HLD)

### 2.1 Architecture Overview

The system follows a typical Client-Server architecture.

*   **Frontend**: A web-based user interface (Landing Page / Dashboard) for uploading documents and chatting.
*   **Backend**: A FastAPI-based REST API that handles business logic, auth, and the RAG pipeline.
*   **Database**:
    *   **Relational DB**: Stores user data, metadata, and chat history.
    *   **Vector DB**: Stores embeddings for document chunks and patches (enabled via `pgvector`).
*   **AI Services**: Uses OpenAI for generating embeddings and LLM responses.

```mermaid
graph TD
    Client[Frontend Client] -->|HTTP REST| API[FastAPI Backend]
    
    subgraph Backend Services
        API --> Auth[Authentication & User Mgmt]
        API --> Ingestion[Ingestion Engine]
        API --> RAG[RAG Engine]
        API --> Admin[Admin/Patching Service]
    end

    subgraph Data Layer
        Ingestion -->|Store Chunks| DB[(PostgreSQL + pgvector)]
        Admin -->|Store Patches| DB
        RAG -->|Retrieve Context| DB
        RAG -->|Read/Write History| DB
    end

    subgraph External AI
        Ingestion -->|Embed| OpenAI[OpenAI API]
        RAG -->|Generate| OpenAI
        Admin -->|Embed| OpenAI
    end
```

### 2.2 Core Components

1.  **API Gateway (FastAPI)**: Typical entry point, handles CORS, request validation, and routing.
2.  **Ingestion Service**: Handles PDF parsing, text extraction, chunking, and embedding generation.
3.  **RAG Engine (LangGraph)**: Manages the chat flow. It contextualizes user questions, retrieves relevant chunks/patches, and generates answers.
4.  **Self-Healing Service (Patches)**: Allows privileged users to "overwrite" specific document chunks with corrected text ("Patches"), which are prioritized during retrieval.

---

## 3. Low-Level Design (LLD)

### 3.1 Database Schema (ER Diagram)

The database design centers around [Organization](backend/app/db/models.py#21-30) multi-tenancy.

```mermaid
erDiagram
    Organization ||--|{ User : "has"
    Organization ||--|{ Document : "owns"
    User ||--|{ ChatSession : "initiates"
    User ||--|{ ChunkPatch : "creates"
    
    Document ||--|{ DocumentChunk : "contains"
    DocumentChunk ||--|{ ChunkPatch : "patched_by"
    
    ChatSession ||--|{ Message : "contains"

    Organization {
        int id PK
        string name
    }

    User {
        int id PK
        int org_id FK
        string email
        string role "admin/senior/viewer"
    }

    Document {
        int id PK
        int org_id FK
        string filename
    }

    DocumentChunk {
        int id PK
        int document_id FK
        int org_id
        text content
        vector embedding
    }

    ChunkPatch {
        int id PK
        int original_chunk_id FK
        int org_id
        text content
        vector embedding
        bool is_active
    }
```

### 3.2 Key Modules & Classes

#### A. RAG Pipeline (`app/rag`)
*   **[ingestion.py](backend/app/rag/ingestion.py)**:
    *   [ingest_pdf](file:///d:/WORK/documind-rag/backend/app/rag/ingestion.py#16-64): Orchestrates the file read -> split -> embed -> save flow.
    *   Tools: `PyPDFLoader`, `RecursiveCharacterTextSplitter`.
*   **[retrieval.py](backend/app/rag/retrieval.py)**:
    *   [custom_retriever](backend/app/rag/retrieval.py#12-32): Finds standard document chunks.
    *   [patch_retriever](backend/app/rag/retrieval.py#34-49): Finds active patches.
    *   [LangGraphRetrieverWrapper](backend/app/rag/retrieval.py#51-86): Merges results, prioritizing patches.
*   **[chain.py](backend/app/rag/chain.py)**:
    *   [AgentState](backend/app/rag/chain.py#14-20): TypedDict for graph state ([question](backend/app/rag/chain.py#26-47), [context](backend/app/rag/chain.py#26-47), `chat_history`).
    *   `workflow`: Defines the LangGraph nodes ([contextualize](backend/app/rag/chain.py#26-47) -> [retrieve](backend/app/rag/retrieval.py#88-90) -> [generate](backend/app/rag/chain.py#57-79)).

---

## 4. Workflows & Sequence Diagrams

### 4.1 Document Ingestion Flow

User uploads a PDF. The backend processes and indexes it.

```mermaid
sequenceDiagram
    participant U as User
    participant API as API (/upload)
    participant ING as Ingestion Service
    participant OAI as OpenAI
    participant DB as Database

    U->>API: POST /upload (PDF)
    API->>ING: ingest_pdf(file)
    ING->>ING: Parse PDF & Split Text
    loop For each Chunk
        ING->>OAI: Generate Embedding
        OAI-->>ING: Vector
        ING->>DB: Save DocumentChunk + Vector
    end
    DB-->>ING: Success
    ING-->>API: Status OK
    API-->>U: Upload Complete
```

### 4.2 RAG Chat Flow

User asks a question. The system builds context and answers.

```mermaid
sequenceDiagram
    participant U as User
    participant API as API (/chat)
    participant LG as LangGraph (Chain)
    participant RET as Retriever
    participant OAI as OpenAI
    participant DB as Database

    U->>API: POST /chat (Question)
    API->>DB: Get Chat History
    API->>LG: invoke(question, history)
    
    rect rgb(240, 248, 255)
        note right of LG: Contextualization
        LG->>OAI: Reformulate Question (if needed)
        OAI-->>LG: Standalone Question
    end
    
    rect rgb(255, 240, 245)
        note right of LG: Retrieval
        LG->>RET: retrieve(question)
        RET->>DB: Vector Search (Chunks)
        RET->>DB: Vector Search (Patches)
        DB-->>RET: Matches
        RET-->>LG: Combined Context (Patches > Chunks)
    end

    rect rgb(240, 255, 240)
        note right of LG: Generation
        LG->>OAI: Generate Answer(Question + Context)
        OAI-->>LG: Final Answer
    end

    LG-->>API: Response
    API->>DB: Save MessagePair (User+AI)
    API-->>U: AI Response
```

### 4.3 Self-Healing (Patching)

An admin fixes a hallucination by creating a "Patch" for a specific chunk or topic.

```mermaid
sequenceDiagram
    participant Admin
    participant API as API (/patches)
    participant OAI as OpenAI
    participant DB as Database

    Admin->>API: POST /patches (Content, target_chunk_id)
    API->>OAI: Generate Embedding for Patch Content
    OAI-->>API: Vector
    API->>DB: Insert ChunkPatch (is_active=True, vector)
    DB-->>API: Success
    API-->>Admin: Patch Created
```

## 5. Technology Stack

*   **Language**: Python 3.10+
*   **Framework**: FastAPI
*   **Database**: PostgreSQL (Production) / SQLite (Dev)
*   **ORM**: SQLAlchemy
*   **Vector Search**: pgvector
*   **LLM Orchestration**: LangChain / LangGraph
*   **AI Provider**: OpenAI (GPT-4o, text-embedding-3-small)

## 6. Future Improvements

*   **Asynchronous Ingestion**: Move PDF processing to a background worker (Celery/redis-queue) for large files.
*   **Hybrid Search**: Combine vector search with keyword search (BM25) for better precision.
*   **Evaluation**: Integrate Ragas or properties to evaluate RAG performance automatically.
