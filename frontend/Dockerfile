# Stage 1: Build React production bundle
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve optimized static bundle
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

ENV PORT=3000
EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
