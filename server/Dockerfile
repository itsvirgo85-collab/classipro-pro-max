FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "src/index.js"]
