#!/usr/bin/env bash
# Package a completed About studio PNG sequence for the website.
# Usage: bash scripts/blender/encode_about_studio.sh [sequence-dir] [output-dir] [frame-count] [mobile-frame]
set -euo pipefail

sequence_dir="${1:-review-assets/about-identity-final/sequence}"
output_dir="${2:-public/media/about}"
frame_count="${3:-240}"
mobile_frame="${4:-$frame_count}"

if [[ $# -gt 4 || ! "$frame_count" =~ ^[1-9][0-9]*$ || ! "$mobile_frame" =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: $0 [sequence-dir] [output-dir] [positive-frame-count] [mobile-frame]" >&2
  exit 2
fi
if ((mobile_frame > frame_count)); then
  echo "The mobile poster frame must be inside the completed sequence." >&2
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

# The final crane reveals the complete mark. Use that composition on mobile;
# cropping the opening's near architectural walls would lose the relationship
# between the two pieces. A square centers on the mark at 68% x / 48% y.
printf -v mobile_filename 'frame_%04d.png' "$mobile_frame"
dimensions="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$sequence_dir/$mobile_filename")"
if [[ ! "$dimensions" =~ ^[1-9][0-9]*x[1-9][0-9]*$ ]]; then
  echo "Could not read dimensions for the mobile poster frame." >&2
  exit 1
fi
IFS=x read -r source_width source_height <<< "$dimensions"
crop_size=$((source_width * 58 / 100))
if ((crop_size > source_height)); then crop_size=$source_height; fi
if ((crop_size > source_width)); then crop_size=$source_width; fi
if ((crop_size < 1)); then crop_size=1; fi
crop_left=$((source_width * 68 / 100 - crop_size / 2))
crop_top=$((source_height * 48 / 100 - crop_size / 2))
if ((crop_left < 0)); then crop_left=0; fi
if ((crop_top < 0)); then crop_top=0; fi
if ((crop_left + crop_size > source_width)); then crop_left=$((source_width - crop_size)); fi
if ((crop_top + crop_size > source_height)); then crop_top=$((source_height - crop_size)); fi
cwebp -quiet -q 90 -m 6 -crop "$crop_left" "$crop_top" "$crop_size" "$crop_size" \
  -resize 720 720 "$sequence_dir/$mobile_filename" \
  -o "$staging_dir/studio-world-mobile.webp"

# Publish only after all three encodes have succeeded.
mv -f "$staging_dir/studio-journey.mp4" "$output_dir/studio-journey.mp4"
mv -f "$staging_dir/studio-world.webp" "$output_dir/studio-world.webp"
mv -f "$staging_dir/studio-world-mobile.webp" "$output_dir/studio-world-mobile.webp"
printf 'Packaged %s frames at 24 fps into %s; mobile poster uses frame %s (720x720).\n' "$frame_count" "$output_dir" "$mobile_frame"
