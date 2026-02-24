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

    # Computed Property for SQLAlchemy URL
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # AI Config (We will use this later)
    OPENAI_API_KEY: str = "dummy-key-for-now" 

    class Config:
        env_file = ".env"

settings = Settings()