FROM node:22-alpine
WORKDIR /srv
COPY package*.json ./
RUN npm ci --omit=dev
COPY db ./db
COPY src ./src
EXPOSE 4000
CMD ["node", "src/server.js"]
