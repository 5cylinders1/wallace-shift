#!/usr/bin/env bash
# Package a completed About studio PNG sequence for the website.
# Usage: bash scripts/blender/encode_about_studio.sh [sequence-dir] [output-dir] [frame-count]
set -euo pipefail

sequence_dir="${1:-review-assets/about-studio/sequence}"
output_dir="${2:-public/media/about}"
frame_count="${3:-144}"

if [[ $# -gt 3 || ! "$frame_count" =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: $0 [sequence-dir] [output-dir] [positive-frame-count]" >&2
  exit 2
fi
for tool in ffmpeg ffprobe cwebp; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$tool is required to package the film and posters." >&2
    exit 1
  fi
done

# Reject an incomplete sequence before replacing any website asset.
for ((index = 1; index <= frame_count; index++)); do
  printf -v filename 'frame_%04d.png' "$index"
  if [[ ! -s "$sequence_dir/$filename" ]]; then
    echo "Missing or empty rendered frame: $sequence_dir/$filename" >&2
    exit 1
  fi
done

mkdir -p "$output_dir"
staging_dir="$(mktemp -d "$output_dir/.about-encode.XXXXXX")"
cleanup() {
  rm -f "$staging_dir/studio-journey.mp4" "$staging_dir/studio-world.webp" "$staging_dir/studio-world-mobile.webp"
  rmdir "$staging_dir"
}
trap cleanup EXIT

# Short, fixed GOPs and no B frames bound decoding work during forward/reverse
# scroll seeking. faststart places MP4 metadata before its media payload.
ffmpeg -hide_banner -loglevel warning -y \
  -framerate 24 -start_number 1 -i "$sequence_dir/frame_%04d.png" \
  -frames:v "$frame_count" -an -c:v libx264 -preset slow -crf 18 \
  -pix_fmt yuv420p -profile:v high -level:v 4.1 \
  -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart \
  "$staging_dir/studio-journey.mp4"

cwebp -quiet -q 90 -m 6 "$sequence_dir/frame_0001.png" \
  -o "$staging_dir/studio-world.webp"

# Opening camera places the pair around 72% of the frame width. A portrait
# crop preserves both fins and their floor contact in the mobile composition.
dimensions="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$sequence_dir/frame_0001.png")"
IFS=x read -r source_width source_height <<< "$dimensions"
crop_width=$((source_height * 3 / 8 * 2))
crop_left=$((source_width * 72 / 100 - crop_width / 2))
if ((crop_left < 0)); then crop_left=0; fi
if ((crop_left + crop_width > source_width)); then crop_left=$((source_width - crop_width)); fi
cwebp -quiet -q 90 -m 6 -crop "$crop_left" 0 "$crop_width" "$source_height" \
  -resize 720 960 "$sequence_dir/frame_0001.png" \
  -o "$staging_dir/studio-world-mobile.webp"

# Publish only after all three encodes have succeeded.
mv -f "$staging_dir/studio-journey.mp4" "$output_dir/studio-journey.mp4"
mv -f "$staging_dir/studio-world.webp" "$output_dir/studio-world.webp"
mv -f "$staging_dir/studio-world-mobile.webp" "$output_dir/studio-world-mobile.webp"
printf 'Packaged %s frames at 24 fps into %s\n' "$frame_count" "$output_dir"
