#!/bin/sh
set -e

postconf -e "myhostname = mail.robinweb.it"
postconf -e "mydomain = robinweb.it"
postconf -e "myorigin = robinweb.it"
postconf -e "masquerade_domains = robinweb.it"

if ! postfix status >/dev/null 2>&1; then
  postfix start
fi

exec "$@"
