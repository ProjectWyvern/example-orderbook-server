#!/bin/bash

VARNISH_IP=0.0.0.0
VARNISH_PORT=80
RESTART_COMMAND="/restart.sh"

echo "Binding on ${VARNISH_IP}:${VARNISH_PORT}"

dd if=/dev/random of=/tmp/secret count=1

varnishd -f /etc/varnish/default.vcl -s malloc,256M -a ${VARNISH_IP}:${VARNISH_PORT} -T localhost:6081 -S /tmp/secret

varnishncsa -F '%t %h "%r" %s %b "%{Referer}i" "%{User-agent}i" %{Varnish:hitmiss}x %{Varnish:time_firstbyte}x' &

/usr/local/bin/consul-template \
  -log-level=${LOG_LEVEL:-warn} \
  -consul-addr="172.17.0.1:8500" \
  -template="/tmp/default.vcl.ctmpl:/etc/varnish/default.vcl:${RESTART_COMMAND}"
