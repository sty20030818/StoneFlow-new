#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERN='sf-color-|text-\(--|bg-\(--|border-\(--|bg\[#|hover:bg\[#'

# 允许 token/adapter 内保留变量声明；其余源码禁止新增旧写法。
if rg -n "$PATTERN" src \
	-g '!src/styles/tokens/layout.css' \
	-g '!src/styles/adapters/shadcn.css'; then
	echo
	echo "style audit failed: found forbidden legacy style tokens/classes"
	exit 1
fi

echo "style audit passed"
