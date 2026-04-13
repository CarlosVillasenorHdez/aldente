#!/bin/bash
# ============================================================================
# backup-supabase.sh — Respaldo diario de Supabase a Cloudflare R2 / S3
#
# CONFIGURAR EN: cron o GitHub Actions
# VARIABLES REQUERIDAS:
#   SUPABASE_DB_URL      — postgresql://postgres:pass@host:5432/postgres
#   R2_BUCKET            — nombre del bucket de Cloudflare R2
#   R2_ACCESS_KEY_ID     — credencial R2
#   R2_SECRET_ACCESS_KEY — credencial R2
#   R2_ENDPOINT          — https://ACCOUNT_ID.r2.cloudflarestorage.com
#
# COSTO: Cloudflare R2 = $0/mes hasta 10 GB → suficiente para meses de backups
# ============================================================================

set -euo pipefail

TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="aldente_backup_${TIMESTAMP}.sql.gz"
TEMP_FILE="/tmp/${BACKUP_FILE}"

echo "[$(date)] Iniciando backup de Supabase..."

# 1. Dump de la base de datos completa
pg_dump \
  --no-owner \
  --no-privileges \
  --exclude-table=schema_migrations \
  "${SUPABASE_DB_URL}" \
  | gzip -9 > "${TEMP_FILE}"

echo "[$(date)] Dump completado: $(du -sh ${TEMP_FILE} | cut -f1)"

# 2. Subir a Cloudflare R2 (compatible con S3 API)
aws s3 cp \
  "${TEMP_FILE}" \
  "s3://${R2_BUCKET}/backups/${BACKUP_FILE}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --region auto

echo "[$(date)] Backup subido: ${BACKUP_FILE}"

# 3. Limpiar backups con más de 30 días
aws s3 ls \
  "s3://${R2_BUCKET}/backups/" \
  --endpoint-url "${R2_ENDPOINT}" | \
  awk '{print $4}' | \
  while read -r key; do
    DATE=$(echo "$key" | grep -oP '\d{4}-\d{2}-\d{2}')
    if [[ -n "$DATE" ]] && [[ $(date -d "$DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$DATE" +%s) -lt $(date -d "30 days ago" +%s 2>/dev/null || date -v-30d +%s) ]]; then
      aws s3 rm "s3://${R2_BUCKET}/backups/$key" --endpoint-url "${R2_ENDPOINT}"
      echo "[$(date)] Eliminado backup antiguo: $key"
    fi
  done

# 4. Limpiar temp
rm -f "${TEMP_FILE}"
echo "[$(date)] Backup completado exitosamente."
