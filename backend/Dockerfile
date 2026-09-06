FROM node:22-alpine

WORKDIR /app

COPY package.json ./
# npm 10.9.8 crashes resolving vitest's newer @vitejs/devtools-* peer set
# (arborist "Cannot read properties of null (reading 'edgesOut')") since
# there's no lockfile pinning the graph. Upgrading npm first avoids it.
RUN npm install -g npm@latest && npm install --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
