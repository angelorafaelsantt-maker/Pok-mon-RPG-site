# EvoLink v0.6 - corrige Railway quando o repositorio tem o ZIP na raiz,
# mas nao tem a pasta public/ extraida.
FROM node:22-alpine
RUN apk add --no-cache unzip su-exec
WORKDIR /app
COPY . /tmp/evolink-repo/
RUN set -eux; \
    archive='/tmp/evolink-repo/EvoLink-Pokemon-Evolution-RPG-v0.6-Online.zip'; \
    if [ ! -f "$archive" ]; then \
      echo 'ERRO: arquivo EvoLink-Pokemon-Evolution-RPG-v0.6-Online.zip ausente do build. Verifique o nome e o .dockerignore.' >&2; \
      exit 1; \
    fi; \
    mkdir -p /tmp/evolink-extraido; \
    unzip -q "$archive" -d /tmp/evolink-extraido; \
    cp -a /tmp/evolink-extraido/evolink-pokemon-rpg/. /app/; \
    test -f /app/public/index.html; \
    test -f /app/server.js; \
    chmod +x /app/docker-entrypoint.sh; \
    mkdir -p /app/data; \
    chown -R node:node /app; \
    rm -rf /tmp/evolink-repo /tmp/evolink-extraido
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data TRUST_PROXY=1
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
