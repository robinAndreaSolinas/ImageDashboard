FROM python:3.12-alpine
LABEL authors="Andrea Solinas"

WORKDIR /app

COPY requirements.txt .

RUN apk update && apk upgrade && \
pip install -v --no-cache -r requirements.txt

COPY . .

CMD ["python", "main.py"]
