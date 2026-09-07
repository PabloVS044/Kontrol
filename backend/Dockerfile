FROM node:22-alpine

WORKDIR /app
RUN npm install -g npm@11.19.1


COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
