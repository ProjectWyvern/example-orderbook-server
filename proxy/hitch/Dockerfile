FROM alpine:3.6

ADD build.sh /tmp/build.sh
RUN /tmp/build.sh

ADD start.sh /start.sh

ENV HITCH_PEM    /etc/ssl/hitch/combined.pem
ENV HITCH_PARAMS "--backend=[127.0.0.1]:80 --frontend=[*]:443"
ENV HITCH_CIPHER EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH

EXPOSE 443
CMD /start.sh
