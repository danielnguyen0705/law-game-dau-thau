FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pydantic
COPY main.py ./
COPY data ./data
EXPOSE 4002
CMD ["python", "main.py"]
