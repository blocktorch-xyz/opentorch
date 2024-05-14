FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

ADD migrations migrations

CMD ["npm", "run", "migrate", "up"]
