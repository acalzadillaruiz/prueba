#!/usr/bin/env bash
# Starts a local PostgreSQL 16 for development (no Docker needed). Idempotent.
# Data dir: ~/.newplace-pg · port 5432 · db newplace · user postgres/postgres
set -e
BIN=/usr/lib/postgresql/16/bin
DATA=${PGDATA_DIR:-/var/lib/postgresql/newplace}
if [ ! -x "$BIN/pg_ctl" ]; then echo "PostgreSQL 16 not found. Use docker compose up -d instead."; exit 1; fi
mkdir -p "$DATA" && chown -R postgres:postgres "$(dirname "$DATA")"
if [ ! -f "$DATA/PG_VERSION" ]; then
  su postgres -c "$BIN/initdb -D $DATA -U postgres --auth=trust -E UTF8 >/dev/null"
fi
if ! su postgres -c "$BIN/pg_ctl -D $DATA status" >/dev/null 2>&1; then
  su postgres -c "$BIN/pg_ctl -D $DATA -l $DATA/server.log -o '-p 5432 -k /var/run/postgresql' start" >/dev/null
  sleep 2
fi
psql -h /var/run/postgresql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='newplace'" | grep -q 1 || psql -h /var/run/postgresql -U postgres -c "CREATE DATABASE newplace" >/dev/null
psql -h /var/run/postgresql -U postgres -c "ALTER USER postgres PASSWORD 'postgres'" >/dev/null
echo "PostgreSQL ready: postgresql://postgres:postgres@localhost:5432/newplace"
