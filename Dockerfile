FROM node:16.17.0-alpine3.16
COPY ./ /opt/www/
WORKDIR /opt/www
RUN npm install
ENTRYPOINT node /opt/www/index.js