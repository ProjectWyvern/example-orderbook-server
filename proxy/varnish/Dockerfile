FROM        ubuntu:16.04
 
ENV DEBIAN_FRONTEND noninteractive
#RUN echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
RUN apt-get -qq update
RUN apt-get install -y varnish vim git
ADD default.vcl /etc/varnish/default.vcl
ENV VARNISH_PORT 80
EXPOSE 80
ADD start.sh /start.sh
RUN chmod 0755 /start.sh

CMD ["/start.sh"]
