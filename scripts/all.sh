#!/bin/sh

cd proxy/varnish
time docker build -t varnish:deploy .
nomad run varnish.nomad
cd ../hitch
time docker build -t hitch:deploy .
nomad run hitch.nomad
cd ../..
time docker build -t backend:deploy .
nomad run backend.nomad
