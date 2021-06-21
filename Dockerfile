FROM node:14-alpine
COPY ./package.json /bot/package.json
COPY ./main.js /bot/main.js
WORKDIR /bot
RUN npm install
VOLUME [ "/bot/env.json" ]
EXPOSE 50000
CMD [ "npm", "start"]