#!/bin/bash

set -e

if [[ -f $HITCH_KEY && -f $HITCH_CERT ]] && [[ ! ( -z $HITCH_PEM && -f $HITCH_PEM) ]]; then
  HITCH_PEM=/etc/ssl/hitch/combined.pem
  touch $HITCH_PEM
  chmod 440 $HITCH_PEM
  cat $HITCH_KEY $HITCH_CERT > $HITCH_PEM
  echo Combined $HITCH_KEY and $HITCH_CERT
elif [ -f $HITCH_PEM ]; then
  echo Using $HITCH_PEM
else
  echo "Couldn't find PEM file!"
  exit 1
fi

exec bash -c \
  "exec /usr/local/sbin/hitch --user=hitch \
  $HITCH_PARAMS \
  --ciphers=$HITCH_CIPHER \
  $HITCH_PEM"
