#!/usr/bin/env bash
# Web copies of LP Construction's own project photos (intake #12), captured
# from his Instagram at the size Instagram serves into lp-source/media/instagram/
# (git-ignored). Each file is <name>_<post code>.png.
#
#   bash scripts/lp-construction/gallery.sh
#
# Writes public/demos/lp-construction/work/<name>-640.webp and <name>-full.webp
# and prints each full size for src/demos/lp-construction/content.ts.
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=lp-source/media/instagram
OUT=public/demos/lp-construction/work
mkdir -p "$OUT"

# Captures that include the viewer's black margin or a reel's letterbox.
crop_for() {
  case "$1" in
    ceiling-beams-cross|ceiling-tray-grid|opening-arched) echo "crop=918:1224:0:0," ;;
    bookcase-built-in) echo "crop=575:762:0:128," ;;
    fireplace-arched-niches) echo "crop=575:428:0:296," ;;
    *) echo "" ;;
  esac
}

for file in "$SRC"/*.png; do
  base=$(basename "$file" .png)
  name=${base%%_*}
  crop=$(crop_for "$name")
  ffmpeg -loglevel error -y -i "$file" -vf "${crop}scale='min(640,iw)':-2:flags=lanczos" -f image2pipe -vcodec png - \
    | cwebp -quiet -q 78 -m 6 -o "$OUT/$name-640.webp" -- -
  ffmpeg -loglevel error -y -i "$file" -vf "${crop}scale=trunc(iw/2)*2:-2" -f image2pipe -vcodec png - \
    | cwebp -quiet -q 80 -m 6 -o "$OUT/$name-full.webp" -- -
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$OUT/$name-full.webp")
  echo "$name $dims $(stat -f %z "$OUT/$name-full.webp")"
done
