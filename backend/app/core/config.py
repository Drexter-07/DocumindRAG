import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "DocuMind RAG"
    API_V1_STR: str = "/api/v1"
    
    # Database Config
    # We use 'localhost' by default so it works on your machine with 'uvicorn'
    # When running inside Docker, this will be overridden by env vars
    POSTGRES_USER: str = "user"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_SERVER: str = "localhost" 
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "documind"

    @property
    def DATABASE_URL(self) -> str:
        # If Render or another platform provides a full DATABASE_URL, use it directly
        env_db_url = os.environ.get("DATABASE_URL")
        if env_db_url:
            return env_db_url
        
        # Otherwise, fall back to constructing it from individual variables (for local Docker)
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # AI Config (We will use this later)
    OPENAI_API_KEY: str = "dummy-key-for-now" 

    class Config:
        env_file = ".env"

settings = Settings()