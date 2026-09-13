# Service video ice grade — September 10, 2026

The original Trust, Flow, and Time photographic loops were restored with a selective ice-blue grade. The light seams, water trace, and watchwork accents retain their original movement and detail. These are color-graded derivatives of existing media, not new Runway generations.

Original MP4s and reference posters remain in `public/media/generated/` and `archive/homepage-2026-09-10/assets/services/`. Production derivatives are in `public/media/services/` with the suffix `-ice`. No pre-existing archive files or checksum manifests were changed. `manifest.json` records the original and derivative SHA256 hashes, original-preservation verification, encode settings, tool versions, and probed video metadata.

## Grade and output

`ice-grade.cube` is a 33³ RGB LUT. It selectively replaces warm highlights with restrained ice blue, preserves luminance and graphite detail, and lightly cools neutral highlights. It is applied before encoding, so the browser does not need a color filter.

All three videos remain **1280 × 720, 24 fps, 5.041667 seconds**, with silent H.264/yuv420p playback and faststart metadata. Video sizes are 454,546 bytes (Trust), 237,713 bytes (Flow), and 318,618 bytes (Time). Posters use the first frame of the encoded derivative to avoid a color jump when playback begins.

## Reproduce without overwriting current media

Run from the repository root with `ffmpeg`, `libx264`, and `cwebp` available. This writes to a new temporary directory. Encoder-version changes may produce different output hashes even with identical settings.

```sh
service_grade_output=$(mktemp -d /tmp/wallace-service-grade.XXXXXX)
for service_scene in trust flow time; do
  ffmpeg -v error \
    -i "public/media/generated/svc-${service_scene}.mp4" \
    -vf 'lut3d=archive/homepage-2026-09-10/service-media-ice-grade/ice-grade.cube' \
    -an -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
    -movflags +faststart -map_metadata -1 \
    "${service_grade_output}/svc-${service_scene}-ice.mp4"

  ffmpeg -v error -ss 0 \
    -i "${service_grade_output}/svc-${service_scene}-ice.mp4" \
    -frames:v 1 "${service_grade_output}/svc-${service_scene}-ice.png"

  cwebp -quiet -q 83 \
    "${service_grade_output}/svc-${service_scene}-ice.png" \
    -o "${service_grade_output}/svc-${service_scene}-ice.webp"
done
```

For future palette revisions, start with the untouched originals and a new LUT/output suffix rather than repeatedly grading the compressed derivatives. The original source-poster hashes in the manifest document preservation; derivative poster pixels come from the graded video as described above.
