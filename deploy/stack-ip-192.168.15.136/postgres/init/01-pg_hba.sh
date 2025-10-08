#!/bin/sh
set -e
PG_HBA="$PGDATA/pg_hba.conf"
echo "host  all  all  0.0.0.0/0  md5" >> "$PG_HBA"
echo "Updated pg_hba.conf to allow access from any IP"


