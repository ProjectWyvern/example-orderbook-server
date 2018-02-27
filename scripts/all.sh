#!/bin/sh

cd proxy/varnish
time docker build -t varnish:deploy .
# nomad stop varnish
nomad run varnish.nomad
cd ../hitch
time docker build -t hitch:deploy .
# nomad stop hitch
nomad run hitch.nomad
cd ../..
time docker build -t backend:deploy .
nomad stop backend
nomad run backend.nomad
