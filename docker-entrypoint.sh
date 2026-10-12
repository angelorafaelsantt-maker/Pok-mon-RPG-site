#!/bin/sh
set -eu
# Railway monta os volumes inicialmente como root. Concede acesso ao usuário node sem rodar o app como root.
mkdir -p "${DATA_DIR:-/app/data}"
if [ "$(id -u)" = '0' ]; then
  chown node:node "${DATA_DIR:-/app/data}"
  exec su-exec node "$@"
fi
exec "$@"
