FROM ubuntu:16.04

RUN apt-get update && apt-get -y install curl apt-transport-https

ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 8.9.4

RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get -y install yarn

RUN ln -s $NVM_DIR/versions/node/v$NODE_VERSION/bin/node /usr/bin/node

RUN apt-get -y install git python make g++

RUN mkdir /app
WORKDIR /app
ADD package.json  /app/package.json
RUN yarn
ADD server/       /app/server
ADD run.sh        /app/run.sh
ADD config.json   /app/config.json
ADD index.js      /app/index.js

CMD ["/app/run.sh"]
