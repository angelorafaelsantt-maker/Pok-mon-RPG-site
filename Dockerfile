FROM node:22-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY docker-entrypoint.sh /docker-entrypoint.sh
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data TRUST_PROXY=1
RUN chmod +x /docker-entrypoint.sh && mkdir -p /app/data && chown -R node:node /app
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
