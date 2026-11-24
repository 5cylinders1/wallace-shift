#!/usr/bin/env bash
# Web copies of the LP Construction concept imagery, from the generated
# originals in output/lp-construction/ (scripts/lp-construction/generate.py).
#
#   bash scripts/lp-construction/export.sh
#
# Hero frames: 1248 and 800 px squares. Sample room: 1536x1024 and 960x640.
# Needs ffmpeg and cwebp (Homebrew).
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=output/lp-construction
OUT=public/demos/lp-construction
mkdir -p "$OUT/hero" "$OUT/ideas"

webp() { # source width height destination
  ffmpeg -loglevel error -y -i "$1" -vf "scale=${2}:${3}:flags=lanczos" -f image2pipe -vcodec png - \
    | cwebp -quiet -q 80 -m 6 -o "$4" -- -
}

for stage in before torn built primed finished; do
  for size in 1248 800; do webp "$SRC/$stage.png" "$size" "$size" "$OUT/hero/$stage-$size.webp"; done
done

for room in room room-frames room-grid room-slats room-wainscot room-geometric; do
  source="$SRC/$room.png"
  [ ! -f "lp-source/renders/$room.png" ] || source="lp-source/renders/$room.png"
  [ -f "$source" ] || { echo "skipped $room (not generated)"; continue; }
  webp "$source" 1536 1024 "$OUT/ideas/$room-1536.webp"
  webp "$source" 960 640 "$OUT/ideas/$room-960.webp"
done

ls -la "$OUT/hero" "$OUT/ideas" | awk 'NF > 5 { print $5, $9 }'
