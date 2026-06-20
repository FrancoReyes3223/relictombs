#!/usr/bin/env bash
# Detecta colisiones de prefijo numérico en migraciones de Supabase.
#
# Output:
#   1. Vs origin/staging (BLOQUEANTE)         — debe renumerarse antes del PR
#   2. Vs otras ramas remotas vivas (heads-up) — coordinar al mergear
#
# Llamado desde .claude/skills/git-commit/SKILL.md.

set -u

if ! git rev-parse --verify --quiet origin/staging > /dev/null; then
  echo "(staging no disponible)"
  exit 0
fi

added=$(git diff --name-only --diff-filter=A origin/staging...HEAD -- supabase/migrations/ 2>/dev/null)
if [ -z "$added" ]; then
  echo "(esta rama no agrega migraciones nuevas)"
  exit 0
fi

prefixes=$(echo "$added" | grep -oE "/0*[0-9]+_" | tr -d "/_" | sort -u)
echo "Prefijos agregados por esta rama: $(echo $prefixes | tr "\n" " ")"
echo ""
echo "Vs origin/staging (BLOQUEANTE — debe renumerarse antes del PR):"

staging_files=$(git ls-tree -r origin/staging --name-only -- supabase/migrations/ 2>/dev/null | grep -E "/0*[0-9]+_" || true)
blocking=0
for f in $staging_files; do
  n=$(echo "$f" | grep -oE "/[0-9]+_" | tr -d "/_")
  for p in $prefixes; do
    if [ "$((10#$n))" = "$((10#$p))" ]; then
      echo "  ✘ origin/staging YA tiene $f con prefijo $p"
      blocking=1
    fi
  done
done
[ "$blocking" = "0" ] && echo "  ✓ sin colisión"

echo ""
echo "Vs otras ramas remotas (heads-up — coordinar al mergear):"
current_branch=$(git branch --show-current)
found_other=0
for branch in $(git for-each-ref --format="%(refname:short)" refs/remotes/origin | grep -vE "^origin/(HEAD|staging|main)$" | grep -v "/$current_branch$"); do
  others=$(git ls-tree -r "$branch" --name-only -- supabase/migrations/ 2>/dev/null | grep -E "/0*[0-9]+_" || true)
  for f in $others; do
    n=$(echo "$f" | grep -oE "/[0-9]+_" | tr -d "/_")
    for p in $prefixes; do
      if [ "$((10#$n))" = "$((10#$p))" ]; then
        echo "  ⚠ $branch tiene $f (prefijo $p)"
        found_other=1
      fi
    done
  done
done

[ "$found_other" = "0" ] && echo "  ✓ sin solapamiento"
