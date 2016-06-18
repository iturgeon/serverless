FROM node:4

RUN mkdir /app
WORKDIR /app

COPY package.json ./
RUN npm install
RUN npm install serverless -g
