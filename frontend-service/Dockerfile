FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn httpx
COPY main.py ./
COPY public ./public
EXPOSE 3000
CMD ["python", "main.py"]
