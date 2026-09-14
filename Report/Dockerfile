FROM python:3.12-alpine
LABEL authors="Andrea Solinas"

WORKDIR /app

COPY requirements.txt .

RUN apk update && apk upgrade && \
    apk add --no-cache tzdata postfix && \
    postconf -e "myhostname = mail.robinweb.it" && \
    postconf -e "mydomain = robinweb.it" && \
    postconf -e "myorigin = robinweb.it" && \
    postconf -e "masquerade_domains = robinweb.it" && \
    pip install -v --no-cache -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

ENV TZ=Europe/Rome

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python", "main.py"]
