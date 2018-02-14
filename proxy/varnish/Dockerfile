FROM centos:7

COPY bundle/ /
RUN yum install -y epel-release
RUN yum install -y varnish varnish-devel git automake autoconf libtool make python-docutils curl unzip
RUN git clone https://github.com/varnish/varnish-modules.git && cd varnish-modules && ./bootstrap && ./configure && make && make install
ADD default.vcl.ctmpl /tmp/default.vcl.ctmpl

RUN curl -O https://releases.hashicorp.com/consul-template/0.19.4/consul-template_0.19.4_linux_amd64.zip && \
    unzip consul-template_0.19.4_linux_amd64.zip && \
    rm consul-template_0.19.4_linux_amd64.zip && \
    mv consul-template /usr/local/bin

ADD restart.sh  /restart.sh
ADD start.sh    /start.sh
CMD ["/start.sh"]
