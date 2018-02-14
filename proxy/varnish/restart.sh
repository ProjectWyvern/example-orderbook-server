#!/bin/bash

varnishadm -T localhost:6081 -S /tmp/secret vcl.load reload /etc/varnish/default.vcl
varnishadm -T localhost:6081 -S /tmp/secret vcl.use reload

exit 0
