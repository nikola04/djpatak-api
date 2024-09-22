FROM node:22-alpine

LABEL maintainer="nikolanedeljkovic.official@gmail.com"

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]