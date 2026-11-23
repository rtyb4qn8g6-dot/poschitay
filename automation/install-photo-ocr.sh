#!/usr/bin/env bash
set -euo pipefail

mkdir -p assets/ocr
cd assets/ocr

fetch_asset() {
  local source="$1" target="$2" hash="$3"
  curl -fsSL --retry 3 --max-time 90 "https://cdn.jsdelivr.net/npm/$source" -o "$target"
  if command -v sha256sum >/dev/null; then
    printf '%s  %s\n' "$hash" "$target" | sha256sum -c -
  else
    printf '%s  %s\n' "$hash" "$target" | shasum -a 256 -c -
  fi
}

fetch_asset 'tesseract.js@6.0.1/dist/tesseract.min.js' 'tesseract.min.js' '10fff78484067759c43028a02a72d76d0b90eb17302bb23b58a9ec5410bc928b'
fetch_asset 'tesseract.js@6.0.1/dist/worker.min.js' 'worker.min.js' '38645599043239c0eb6db08a6504a92dcdc292200535f3e9339cd77c4443b842'
fetch_asset 'tesseract.js-core@6.0.0/tesseract-core-lstm.wasm.js' 'tesseract-core-lstm.wasm.js' '775a35df6f2ae100e02609443e6bd5cafcd07983dd6175454ca4a432a7730687'
fetch_asset '@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz' 'eng.traineddata.gz' '45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91'
curl -fsSL --retry 3 --max-time 30 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/LICENSE.md' -o LICENSE.txt
curl -fsSL --retry 3 --max-time 30 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/LICENSE' -o LICENSE-core.txt
