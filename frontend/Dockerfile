FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""
ARG VITE_WEBRTC_ICE_SERVERS=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_WEBRTC_ICE_SERVERS=$VITE_WEBRTC_ICE_SERVERS

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Production stage: serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend

EXPOSE 80
