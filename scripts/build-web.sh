#!/bin/sh
# Collects the static app into dist/ for the native wrappers.
# The web app is served straight from the repository root; this folder only
# exists so Capacitor and Tauri have something small to copy.
set -e
rm -rf dist
mkdir -p dist
cp -R index.html manifest.webmanifest sw.js css js vendor icons dist/
echo "dist/ ready: $(du -sh dist | cut -f1)"
