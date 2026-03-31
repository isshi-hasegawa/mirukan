#!/bin/sh

set -eu

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if command -v betterleaks >/dev/null 2>&1; then
  exec betterleaks git --staged --validation=false --no-banner .
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm -v "$repo_root:/repo" -w /repo ghcr.io/betterleaks/betterleaks:latest \
    git --staged --validation=false --no-banner .
fi

cat >&2 <<'EOF'
Betterleaks を実行できませんでした。

次のいずれかを利用できる状態にしてください。
- betterleaks
- docker

例:
  brew install betterleaks
EOF

exit 1
