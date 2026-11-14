# Unified Multi-Service Dockerfile for LawGame Microservices
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn httpx pydantic

COPY data/ /app/data/
COPY ai-grading-service/ /app/ai-grading-service/
COPY game-engine-service/ /app/game-engine-service/
COPY frontend-service/ /app/frontend-service/

ENV SERVICE_DIR=frontend-service
ENV PORT=3000

CMD ["sh", "-c", "python /app/${SERVICE_DIR}/main.py"]
