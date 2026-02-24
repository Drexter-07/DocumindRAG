# DocuMind RAG

![DocuMind RAG](https://img.shields.io/badge/Status-Active-success) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104-teal) ![React](https://img.shields.io/badge/React-18.x-cyan)

## Project Overview and Purpose
DocuMind RAG is a modern, full-stack Retrieval-Augmented Generation (RAG) web application. Designed to act as an intelligent document knowledge base, it allows organizations to upload PDF documents, extract their full contextual meaning into a high-dimensional vector database using OpenAI embeddings, and intuitively chat with their knowledge base via an AI Chatbot. 

A unique core feature of DocuMind RAG is its patent-pending **Self-Healing Patch System**, which empowers administrators to inject "Expert Patches" into the RAG pipeline. This guarantees that if the underlying source documents are outdated or incorrect, human administrators can override the AI's generation context with ground-truth correction patches, instantly eliminating hallucinations.

## Key Features
- **Intelligent RAG Pipeline**: Chat with multiple PDF documents simultaneously across the entire organizational vector space.
- **Self-Healing Layer ("Patches")**: Admin dashboard to create, view, activate, and rollback knowledge correction patches for specific document excerpts or global rules.
- **Multi-Tenant Architecture**: Robust PostgreSQL role-based access control protecting Organization layers, Documents, and Patches.
- **Beautiful & Dynamic UI**: Vercel-ready Vite+React frontend built with TailwindCSS, featuring dark mode, glassmorphism aesthetics, Markdown rendering, and contextual inline SVGs.
- **Dockerized Backend**: Fully containerized FastAPI backend utilizing pgvector for state-of-the-art cosine similarity searches.

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js & npm (v18+)
- An OpenAI API Key

### Backend Setup (Local Development)
1. Navigate to the `backend` directory.
2. Create a `.env` file in the root of the backend folder:
   ```env
   OPENAI_API_KEY="sk-your-open-ai-key-here"
   ```
3. Boot up the entire PostgreSQL database and FastAPI backend using Docker:
   ```bash
   docker-compose up --build -d
   ```
   *The backend API will now be available at `http://localhost:8000`.*

### Frontend Setup (Local Development)
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will launch at `http://localhost:5173`.*

## Usage Guidelines
The application uses a Mock Authentication flow via the `X-Test-Email` header to demonstrate Role-Based Access Control (RBAC) securely without overhead. 

1. Visit the frontend URL.
2. At the login portal, select a role:
   - **Admin User (`admin@documind.com`)**: Full access to Chat, Document uploads/deletions, and the Patch Management Admin UI.
   - **Senior Staff (`senior@documind.com`)**: Access to Chat, Document reading, and the Patch Management Admin UI.
   - **Junior Staff (`junior@documind.com`)**: View-only mode for Chat.
3. Upload a PDF in the **Documents** tab (requires Admin or Senior).
4. Go to **Chat** to begin interrogating your documents!
5. To fix incorrect information, navigate to **Admin & Patches** and hit **+ New Correction**.

## Deployment
DocuMind RAG is designed to be cloud agnostic:
- **Backend Deployment**: Push the `backend` folder as a Docker environment to Render, AWS App Runner, or Heroku, with a managed PostgreSQL + pgvector external database.
- **Frontend Deployment**: Connect the `frontend` folder directly to Vercel or Netlify and inject the `VITE_API_URL` environment variable.

## Contribution Guidelines & How to Get Involved
We welcome contributions to DocuMind RAG!
1. **Fork the repository** on GitHub.
2. **Create a new branch** (`git checkout -b feature/amazing-feature`).
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`).
4. **Push to the branch** (`git push origin feature/amazing-feature`).
5. **Open a Pull Request** describing your changes and any new dependencies.

*Please ensure your code passes standard linting (`npm run lint` / `flake8`) before submitting your PR.*

