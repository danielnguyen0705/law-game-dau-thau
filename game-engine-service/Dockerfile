FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pydantic httpx
COPY main.py ./
COPY data ./data
EXPOSE 4001
CMD ["python", "main.py"]
