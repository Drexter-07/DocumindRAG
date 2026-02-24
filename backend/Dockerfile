# 1. Use an official lightweight Python image
FROM python:3.11-slim

# 2. Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files (useless in containers)
# PYTHONUNBUFFERED: Ensures logs are printed immediately to the console
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Set work directory inside the container
WORKDIR /app

# 4. Install system dependencies (needed for building some python packages)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy requirements first (Caching Strategy)
# Docker caches layers. If requirements.txt doesn't change, it skips this step.
COPY requirements.txt .

# 6. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 7. Copy the rest of the application code
COPY . .

# 8. Command to run the application
# We use shell form to allow variable expansion if needed
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]