FROM node:22-alpine

WORKDIR /app
RUN npm install -g npm@11.19.1


COPY package.json ./
# npm 10.9.8 crashes resolving vitest's newer @vitejs/devtools-* peer set
# (arborist "Cannot read properties of null (reading 'edgesOut')") since
# there's no lockfile pinning the graph. The npm@11 pin above avoids it;
# don't use npm@latest — npm 12 requires node >=22.22.2 and breaks the build.
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
