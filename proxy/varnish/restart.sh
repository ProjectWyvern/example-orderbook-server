#!/bin/bash

varnishadm -T localhost:6081 -S /tmp/secret vcl.load one /etc/varnish/default.vcl
varnishadm -T localhost:6081 -S /tmp/secret vcl.use one
varnishadm -T localhost:6081 -S /tmp/secret vcl.discard two
varnishadm -T localhost:6081 -S /tmp/secret vcl.load two /etc/varnish/default.vcl
varnishadm -T localhost:6081 -S /tmp/secret vcl.use two
varnishadm -T localhost:6081 -S /tmp/secret vcl.discard one

exit 0
