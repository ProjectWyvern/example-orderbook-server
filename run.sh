#!/bin/sh

while true; do
  node index.js | bunyan -o short
  sleep 1
done
