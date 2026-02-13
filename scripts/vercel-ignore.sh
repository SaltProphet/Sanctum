#!/usr/bin/env bash
set -euo pipefail

# Vercel ignoredBuildStep contract:
#   exit 0 -> skip build/deploy
#   exit 1 -> continue build/deploy

branch="${VERCEL_GIT_COMMIT_REF:-}"
env_name="${VERCEL_ENV:-}"

if [[ -z "$branch" ]]; then
  echo "No git branch metadata found. Proceeding with deployment."
  exit 1
fi

# Only deploy automatically from main in production.
if [[ "$env_name" == "production" ]]; then
  if [[ "$branch" == "main" ]]; then
    echo "Production build from main detected. Proceeding with deployment."
    exit 1
  fi

  echo "Skipping production deployment from non-main branch: $branch"
  exit 0
fi

# By default, skip all non-production builds to avoid preview deployment overage.
echo "Skipping $env_name deployment from branch: $branch"
exit 0
