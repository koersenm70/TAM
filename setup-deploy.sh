#!/bin/bash
set -e

# ─────────────────────────────────────────────
# CONFIGURATION — fill these in once and save
# ─────────────────────────────────────────────
GH_TOKEN="your_github_token_here"       # needs repo + workflow scopes
HF_TOKEN="your_huggingface_token_here"  # needs write access
HF_USERNAME="your_huggingface_username"
GH_USERNAME="your_github_username"
# ─────────────────────────────────────────────

REPO_NAME="${1}"
APP_NAME="${2:-$1}"

if [ -z "$REPO_NAME" ]; then
  echo "Usage: bash setup-deploy.sh <github-repo-name> [app-name]"
  echo "Example: bash setup-deploy.sh MyApp my-app"
  exit 1
fi

echo "🚀 Setting up deployment for: $REPO_NAME"
echo ""

# ── 1. Create Hugging Face Space ──────────────────────────────────────────────
echo "📦 Creating Hugging Face Space..."
HF_RESPONSE=$(curl -s -X POST "https://huggingface.co/api/repos/create" \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"space\",\"name\":\"$APP_NAME\",\"sdk\":\"docker\",\"private\":false}")

if echo "$HF_RESPONSE" | grep -q '"url"'; then
  echo "   ✅ HF Space created: https://huggingface.co/spaces/$HF_USERNAME/$APP_NAME"
elif echo "$HF_RESPONSE" | grep -q "already exist"; then
  echo "   ✅ HF Space already exists"
else
  echo "   ❌ HF Space creation failed: $HF_RESPONSE"
  exit 1
fi

# ── 2. Add HF Spaces config to README ────────────────────────────────────────
echo "📝 Checking README for HF config..."
if ! grep -q "^---" README.md 2>/dev/null; then
  TMPFILE=$(mktemp)
  cat > "$TMPFILE" <<EOF
---
title: $APP_NAME
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

EOF
  cat README.md >> "$TMPFILE"
  mv "$TMPFILE" README.md
  echo "   ✅ HF config added to README.md"
else
  echo "   ✅ README already has HF config"
fi

# ── 3. Create GitHub Actions workflow ────────────────────────────────────────
echo "⚙️  Creating GitHub Actions workflow..."
mkdir -p .github/workflows
cat > .github/workflows/deploy-hf.yml <<EOF
name: Deploy to Hugging Face Spaces

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    steps:
      - name: Checkout
        uses: actions/checkout@v4.2.2
        with:
          fetch-depth: 0
          lfs: true

      - name: Push to Hugging Face Spaces
        env:
          HF_TOKEN: \${{ secrets.HF_TOKEN }}
        run: |
          git config --global user.email "deploy@github-actions.com"
          git config --global user.name "GitHub Actions"
          git push https://$HF_USERNAME:\${HF_TOKEN}@huggingface.co/spaces/$HF_USERNAME/$APP_NAME main --force
EOF
echo "   ✅ Workflow created"

# ── 4. Commit and push to GitHub ─────────────────────────────────────────────
echo "📤 Pushing to GitHub..."
git add README.md .github/workflows/deploy-hf.yml
git diff --cached --quiet || git commit -m "Add HF Spaces deployment workflow"
git push "https://$GH_TOKEN@github.com/$GH_USERNAME/$REPO_NAME.git" main
echo "   ✅ Pushed to GitHub"

# ── 5. Add HF_TOKEN secret to GitHub repo ────────────────────────────────────
echo "🔑 Adding HF_TOKEN secret to GitHub..."
PK_RESPONSE=$(curl -s \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GH_USERNAME/$REPO_NAME/actions/secrets/public-key")

KEY_ID=$(echo "$PK_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['key_id'])")
PUBLIC_KEY=$(echo "$PK_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])")

ENCRYPTED=$(python3 -c "
import base64
from nacl import encoding, public
pk = public.PublicKey('$PUBLIC_KEY'.encode(), encoding.Base64Encoder())
box = public.SealedBox(pk)
print(base64.b64encode(box.encrypt('$HF_TOKEN'.encode())).decode())
")

curl -s -X PUT \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GH_USERNAME/$REPO_NAME/actions/secrets/HF_TOKEN" \
  -d "{\"encrypted_value\":\"$ENCRYPTED\",\"key_id\":\"$KEY_ID\"}" > /dev/null

echo "   ✅ Secret added"

# ── 6. Trigger deployment ─────────────────────────────────────────────────────
echo "🎯 Triggering deployment..."
sleep 2
curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$GH_USERNAME/$REPO_NAME/actions/workflows/deploy-hf.yml/dispatches" \
  -d '{"ref":"main"}' > /dev/null
echo "   ✅ Deployment triggered"

echo ""
echo "────────────────────────────────────────────"
echo "✅ All done!"
echo ""
echo "   Actions log : https://github.com/$GH_USERNAME/$REPO_NAME/actions"
echo "   Live app    : https://huggingface.co/spaces/$HF_USERNAME/$APP_NAME"
echo "────────────────────────────────────────────"
