FROM node:16.17.1-alpine3.15
COPY ./* /opt/www
WORKDIR /opt/www
RUN npm install
ENTRYPOINT node /opt/www/index.js