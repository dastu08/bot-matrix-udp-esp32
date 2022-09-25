FROM node:16-alpine as buildstage
COPY ./package.json /bot/package.json
COPY ./package-lock.json /bot/package-lock.json
COPY ./lib-esp32-udp/ /bot/lib-esp32-udp/
COPY ./main.ts /bot/main.ts
COPY ./tsconfig.json /bot/tsconfig.json
WORKDIR /bot
RUN npm install
RUN npm run build

FROM node:16-alpine as workingstage
COPY --from=buildstage /bot/build /bot/build
COPY --from=buildstage /bot/package.json /bot/package.json
COPY --from=buildstage /bot/package-lock.json /bot/package-lock.json
WORKDIR /bot
RUN npm install --production
VOLUME [ "/bot/env.json" ]
EXPOSE 50000
CMD [ "npm", "start"]
