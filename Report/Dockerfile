FROM python:3.12-alpine
LABEL authors="Andrea Solinas"

WORKDIR /app

COPY requirements.txt .

RUN apk update && apk upgrade && \
    apk add --no-cache tzdata postfix && \
    pip install -v --no-cache -r requirements.txt

COPY . .

ENV TZ=Europe/Rome

CMD ["python", "main.py"]
