FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/server-dist ./server-dist
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "server-dist/server/index.js"]
