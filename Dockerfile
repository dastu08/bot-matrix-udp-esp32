FROM node:16-alpine
COPY ./package.json /bot/package.json
COPY ./package-lock.json /bot/package-lock.json
COPY ./lib-esp32-udp/ /bot/lib-esp32-udp/
COPY ./main.ts /bot/main.ts
COPY ./tsconfig.json /bot/tsconfig.json
WORKDIR /bot
RUN npm install
VOLUME [ "/bot/env.json" ]
EXPOSE 50000
CMD [ "npm", "start"]
