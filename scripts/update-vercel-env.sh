#!/bin/bash
# עדכון משתני סביבה ב-Vercel מתוך קובץ מקומי (ללא סודות ב-git)
# הרץ פעם אחת: npx vercel login
# ואז: bash scripts/update-vercel-env.sh [.env.local]

set -e
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "חסר $ENV_FILE"
  echo "העתק מ-.env.example ומלא ערכים, או: npx vercel env pull .env.local"
  exit 1
fi

ENV_TARGETS="production preview development"

set_env() {
  local name="$1"
  local value="$2"
  [[ -n "$value" ]] || return 0
  for e in $ENV_TARGETS; do
    printf '%s' "$value" | npx vercel env rm "$name" "$e" -y 2>/dev/null || true
    printf '%s' "$value" | npx vercel env add "$name" "$e"
  done
  echo "✓ $name"
}

echo "מעדכן מ-$ENV_FILE ..."

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -z "$line" ]] && continue
  [[ "$line" != *"="* ]] && continue
  name="${line%%=*}"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  set_env "$name" "$value"
done < "$ENV_FILE"

echo ""
echo "מפריס מחדש..."
npx vercel --prod --yes

echo ""
echo "בדיקה: https://bri-catalog.vercel.app/api/health/db"
