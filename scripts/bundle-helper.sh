#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# StoneFlow Helper 打包脚本
#
# 背景：
#   Helper 进程（stoneflow-helper，Accessory 激活策略，持有 Quick Capture NSPanel）
#   在运行时由主 App 通过 std::process::Command spawn 起来；打包时需要把它作为
#   "LoginItem helper" 嵌入主 bundle：
#     StoneFlow.app/Contents/Library/LoginItems/StoneFlow Helper.app
#
# 调用时机：
#   在 tauri.conf.json 的 build.beforeBundleCommand 里挂这个脚本，确保主 App 的
#   .app 产物已经就绪后再把 Helper 拷进去。
#
# 使用：
#   bash scripts/bundle-helper.sh
#
# 环境变量（可选）：
#   STONEFLOW_PROFILE  默认 release，可设为 debug 做本地验证。
#   STONEFLOW_TARGET   指定 Rust target triple（例如 aarch64-apple-darwin）；未设时
#                      不传 --target 给 cargo，沿用 host target。
# -----------------------------------------------------------------------------

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROFILE="${STONEFLOW_PROFILE:-release}"
TARGET="${STONEFLOW_TARGET:-}"

PRODUCT_NAME="StoneFlow"
HELPER_BUNDLE_NAME="StoneFlow Helper"
HELPER_BIN_NAME="stoneflow-helper"
HELPER_IDENTIFIER="com.stonefish.stoneflow.helper"
HELPER_VERSION="0.1.0"

log()  { printf '[bundle-helper] %s\n' "$*"; }
warn() { printf '[bundle-helper][warn] %s\n' "$*" >&2; }
die()  { printf '[bundle-helper][error] %s\n' "$*" >&2; exit 1; }

# 仅 macOS 做 LoginItem 嵌入；Windows / Linux 初版跳过。
if [[ "${OSTYPE:-}" != darwin* ]]; then
	warn "当前非 macOS 平台（OSTYPE=${OSTYPE:-unknown}），跳过 Helper 打包。"
	exit 0
fi

cd "${WORKSPACE_ROOT}"

# ---------------------------------------------------------------------------
# 1. 编译 Helper 二进制
# ---------------------------------------------------------------------------
log "编译 Helper（profile=${PROFILE}${TARGET:+, target=${TARGET}}）"
cargo_args=(build --manifest-path "src-tauri/helper-bin/Cargo.toml" --bin "${HELPER_BIN_NAME}")
if [[ "${PROFILE}" == "release" ]]; then
	cargo_args+=(--release)
fi
if [[ -n "${TARGET}" ]]; then
	cargo_args+=(--target "${TARGET}")
fi
cargo "${cargo_args[@]}"

# ---------------------------------------------------------------------------
# 2. 计算路径
# ---------------------------------------------------------------------------
TARGET_DIR="src-tauri/target"
if [[ -n "${TARGET}" ]]; then
	HELPER_BIN_PATH="${TARGET_DIR}/${TARGET}/${PROFILE}/${HELPER_BIN_NAME}"
	MAIN_BUNDLE_PATH="${TARGET_DIR}/${TARGET}/${PROFILE}/bundle/macos/${PRODUCT_NAME}.app"
else
	HELPER_BIN_PATH="${TARGET_DIR}/${PROFILE}/${HELPER_BIN_NAME}"
	MAIN_BUNDLE_PATH="${TARGET_DIR}/${PROFILE}/bundle/macos/${PRODUCT_NAME}.app"
fi

[[ -f "${HELPER_BIN_PATH}" ]] || die "找不到 Helper 二进制：${HELPER_BIN_PATH}"

# beforeBundleCommand 在 Tauri 生成 .app 之前执行；如果 .app 还不存在，
# 说明 tauri 还在 cargo 构建阶段——这里只编译 Helper，嵌入步骤在 .app 出现后再做。
if [[ ! -d "${MAIN_BUNDLE_PATH}" ]]; then
	log "主 App bundle 尚未生成（${MAIN_BUNDLE_PATH}），跳过嵌入。"
	log "Tauri 将在后续 bundle 阶段再次触发此脚本完成嵌入，或由 afterBundleCommand 兜底。"
	exit 0
fi

HELPER_APP_PATH="${MAIN_BUNDLE_PATH}/Contents/Library/LoginItems/${HELPER_BUNDLE_NAME}.app"
HELPER_CONTENTS_PATH="${HELPER_APP_PATH}/Contents"
HELPER_MACOS_PATH="${HELPER_CONTENTS_PATH}/MacOS"
HELPER_RESOURCES_PATH="${HELPER_CONTENTS_PATH}/Resources"

# ---------------------------------------------------------------------------
# 3. 构造 LoginItem 风格的 Helper .app 骨架
# ---------------------------------------------------------------------------
log "嵌入 Helper bundle 到 ${HELPER_APP_PATH}"
rm -rf "${HELPER_APP_PATH}"
mkdir -p "${HELPER_MACOS_PATH}" "${HELPER_RESOURCES_PATH}"

cp "${HELPER_BIN_PATH}" "${HELPER_MACOS_PATH}/${HELPER_BIN_NAME}"
chmod +x "${HELPER_MACOS_PATH}/${HELPER_BIN_NAME}"

# 复用主 App 的图标，避免额外维护一套 Helper 图标。
ICON_SOURCE="src-tauri/icons/icon.icns"
if [[ -f "${ICON_SOURCE}" ]]; then
	cp "${ICON_SOURCE}" "${HELPER_RESOURCES_PATH}/icon.icns"
fi

cat > "${HELPER_CONTENTS_PATH}/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>${HELPER_BUNDLE_NAME}</string>
	<key>CFBundleExecutable</key>
	<string>${HELPER_BIN_NAME}</string>
	<key>CFBundleIconFile</key>
	<string>icon</string>
	<key>CFBundleIdentifier</key>
	<string>${HELPER_IDENTIFIER}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${HELPER_BUNDLE_NAME}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>${HELPER_VERSION}</string>
	<key>CFBundleVersion</key>
	<string>${HELPER_VERSION}</string>
	<!-- Accessory / Agent：隐藏 Dock 图标，只在菜单栏可见（若 Helper 有菜单栏项）。 -->
	<key>LSUIElement</key>
	<true/>
	<key>LSBackgroundOnly</key>
	<false/>
	<key>NSHighResolutionCapable</key>
	<true/>
	<key>NSSupportsAutomaticGraphicsSwitching</key>
	<true/>
</dict>
</plist>
PLIST

log "Helper bundle 就绪：${HELPER_APP_PATH}"
