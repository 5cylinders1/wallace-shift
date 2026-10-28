# Narration import and timing

The selected production route is **Higgsfield through the browser, using the user's existing credits**. Root handles the actual browser generation and export. No new purchase, HeyGen generation, model download, or local speech synthesis is part of the selected route.

`../narrated-import-audio.mjs` imports an already-exported local audio file. It does not open a browser, synthesize speech, contact a provider, or download a model. It retains the exported source unchanged and produces scene WAVs plus the timing schema consumed by `narrated-compose.mjs`.

## Align an imported take

1. Record the actual model, voice, and generation identifier shown in Higgsfield. Do not infer vendor/model details from the sound. If a value is not exposed, state that explicitly.
2. Export the take locally and keep it intact. Use `--template velar` to print a blank alignment manifest using the current script. Each scene can optionally set `sourceFile` to a separate exported take; otherwise the top-level source file is used.
3. Inspect duration and pause candidates with `--inspect /absolute/path/to/audio.wav`. This runs only local ffprobe and FFmpeg `silencedetect` at −38 dB with a 0.14-second minimum pause.
4. Listen to the actual take and fill every scene and sentence in/out point in **seconds relative to its original source file**. A detected pause can suggest an edit location, but cannot identify what was spoken. Never assign sentences automatically to pauses or spread words evenly across a duration.
5. Compare exact wording with `scene.spoken`, especially names, quantities and negations. Record listening/alignment evidence in the manifest's `alignmentReview`. A script mismatch fails import; correct the script or take before proceeding.
6. Run the importer with that manifest. It writes scene PCM WAVs, exact text, source hashes/provenance, source-to-scene mappings, and measured timing.

```sh
node videos/contractor-previews/narrated-import-audio.mjs --template velar
node videos/contractor-previews/narrated-import-audio.mjs --inspect /absolute/path/to/audio.wav
node videos/contractor-previews/narrated-import-audio.mjs /absolute/path/to/alignment.json
```

The import manifest contains `id`, `sourceFile`, `timeBase: "source-seconds"`, `provider`, `alignmentReview`, and `scenes: [{ id, start, end, phrases: [{ text, start, end }] }]`. All input timing uses source seconds. The generated `timing.json` contains `scenes: [{ id, duration, file, spoken, phrases: [{ text, start, end, sourceFile }] }]`; generated phrase start/end values are relative to the scene WAV. `file` is relative to `narrated/audio/<id>/`.

Original exports are copied into `audio/<id>/originals/` under SHA-256-based names and checked byte-for-byte. No speed, pitch, normalization, artificial gaps, or denoising is applied. FFmpeg only extracts the supplied ranges to PCM; the final composition owns the sound mix. The alignment manifest and exact narration text are retained beside `timing.json`. `complete` indicates successful extraction, not a passed listening review.

## Offline alignment availability

At setup inspection, both the bundled Python 3.12 and system Python lacked `whisper`, `faster_whisper`, `vosk`, `pocketsphinx`, `transformers`, and `torch`; no matching cached speech model was found in the checked speech/model cache locations. Therefore automatic transcription/forced alignment is **not available without additional installation or downloads**. The zero-download route is supplied, listened sentence timestamps aided by local silence inspection. The helper never substitutes silence detection for speech recognition.

## Independent speech-recognition QA

`../narrated-asr.py` provides an explicitly configured ASR route once its separate dependency/model setup is authorized. This is recognition of the existing Higgsfield take, not speech synthesis. At inspection, the installed FFmpeg had no Whisper filter and no `whisper`, `whisper-cli`, `whisper-cpp`, or `faster-whisper` executable was found.

Use Python 3.12 with `faster-whisper` installed in the isolated `output/audio-qa-deps` directory. The helper does not install packages. A first run with `--download-model` downloads only `Systran/faster-whisper-base.en` into `output/audio-qa-models/base.en`; associated cache data stays under `output/audio-qa-models/`. Run without that flag afterward: inference always uses the explicit model directory with `local_files_only=True`.

```sh
PYTHONPATH=output/audio-qa-deps python3.12 videos/contractor-previews/narrated-asr.py \
  --input output/narrated-previews/velar/higgsfield-grady-source.mp3 \
  --output output/narrated-previews/velar/asr-transcript.json \
  --download-model
```

Recognition uses CPU/int8, English, beam size 5, and model-derived segment/word timestamps. FFmpeg decodes the imported audio to mono 16 kHz float32 PCM and supplies the sample array directly; this avoids the installed PyAV version's incompatible `metadata_errors` container argument without patching a dependency. No script, initial prompt, hotwords, or forced expected wording is supplied. `--reference-file` optionally compares the resulting transcript to a plain-text script **after recognition**, providing token differences and word error rate as review aids. It cannot prove the take is wrong when ASR misrecognizes a name.

The JSON retains source/model hashes, package versions, decoding settings, confidence values, transcript, segment timestamps, and word timestamps. It is explicitly marked `asr_complete_human_review_pending`. Verify names, numbers, negations, omissions, and boundary positions before using these timestamps in the import manifest. ASR cannot establish natural delivery, intelligible mixing, or buyer comprehension.

For the Velar take, the first full ASR pass repeated a word at a chunk boundary and omitted most of the closing. Independent local recognition of the original audio's 24.0–31.2s and 69.468–73.968s ranges recovered the single occurrence and full closing. The original full report remains unchanged. `output/narrated-previews/velar/asr-review.json` records the cropped evidence, offsets, comparison, and unresolved brand-name spelling/pronunciation check. This is ASR-based review only; it is not a claim that someone listened to the take.

## Reproducible ASR-to-script alignment drafts

`../narrated-align-asr.mjs` maps independent recognized words to the exact scenario script using token sequence alignment. It reads `narratedPilot` or the existing `narratedScenarios`, then writes **separate draft files**: `source-alignment.draft.json` and `alignment-report.json`. It never changes an accepted `source-alignment.json`.

```sh
node videos/contractor-previews/narrated-align-asr.mjs northvane \
  --asr output/narrated-previews/northvane/asr-transcript.json \
  --audio output/narrated-previews/northvane/higgsfield-source.mp3 \
  --config output/narrated-previews/northvane/alignment-review-config.json
```

The optional config contains `provider` (actual browser-observed values), `reviewedAliases`, and `crops`. An alias requires `kind: "proper-name"`, `expected`, `recognized`, `reviewedBy`, and `evidence`. Expected names must belong to the scenario name, Wallace Shift, or an explicitly supplied `properNames` list. No automatic fuzzy aliases or rewriting of substantive words occurs. A multiword name alias keeps its complete observed audio span; the helper does not invent timings for internal words.

Each optional crop entry contains its ASR report `file`, the actual original-audio `offset`, and optional `replaceStart`/`replaceEnd` source seconds. Only the specified source interval is replaced by the independent crop recognition. Choose replacement edges in gaps between words, because crop beginnings may contain partial words. Reports retain both removed and replacement tokens, offsets, and source filenames. Recognition remains unseeded by the script.

Missing script words, unreviewed substitutions, extra recognized words, or zero-length/invalid word timings make the helper exit unsuccessfully. It records every difference and leaves unresolved sentence times null rather than inventing them. Exact matched sentences receive their real first/last recognized word timestamps. Scene cuts prefer measured silent intervals between those word spans; an ASR midpoint without matching silence is explicitly flagged for cut review.

Review the draft, crop substitutions, name aliases, scene boundaries, and captions before accepting it. The import helper rejects unresolved issues and a `draft_` status. After root review, save the accepted mapping as `source-alignment.json` with an accurate status such as `ASR alignment reviewed; subjective listening pending`. Accepting ASR timing does not imply a listening review or approval of pronunciation, delivery, brand fit, or buyer comprehension.

## Tighten an imported take without generating new speech

After watching the Velar pilot, the user asked to keep the voice and tighten its slow pacing. `../narrated-pace-audio.mjs` derives a faster edit from the imported scene WAVs. The source MP3, scene WAVs, and a content-hashed `unpaced-timing-<hash>.json` remain unchanged. Reruns always use that original timing rather than stacking speed changes.

```sh
node videos/contractor-previews/narrated-pace-audio.mjs velar
```

Default settings are FFmpeg `atempo=1.08` (pitch preserved) and 0.14-second boundary handles. `PACE_TEMPO` accepts 1.08 or 1.10; `PACE_HANDLE_SECONDS` accepts 0.12–0.18. The helper starts from recognized sentence boundaries, finds adjacent measured silence at −42 dB, and keeps complete spoken spans plus handles. The two handles create approximately a quarter-second pause at a sentence join after the tempo change. It preserves natural pauses inside each sentence. When no safe trailing silence matches, it retains additional source and records a warning rather than assuming the ASR endpoint is a safe audio cut.

Outputs live in `audio/<id>/paced/<settings-hash>/`, with retained segment WAVs, scene WAVs, concatenated `narration-review.wav`, `pacing-report.json`, and derived `timing.json`. The active `audio/<id>/timing.json` points to these files. Every sentence caption is remapped through the retained input range and measured output duration. These remain sentence spans, not word highlighting. The report records source hashes, trim ranges, detected silence, tempo, measured duration, and text equality; it does not assert subjective listening.

Algorithm 2 merges adjacent or overlapping retained sentence ranges into one continuous source segment before applying tempo. It removes a gap only when the complete gap lies inside measured silence. This avoids both cutting speech at an uncertain ASR boundary and duplicating audio from overlapping handles. Within a merged segment, separate accepted ASR caption boundaries remain intact and are remapped through the same measured edit; only the outside edges use silence refinement. The report lists every merged segment and its sentence membership. Halcyon's comparison scene exercises this case: its two accepted sentence spans share an ASR boundary, so their overlapping handles are processed as one segment.

The Velar 1.08× edit measures **58.158 seconds**, down from the original 73.968 seconds, while retaining all 14 sentence captions. Independent local ASR of the actual joined review WAV found no missing scripted words. Separate recognition of the comparison and ending scene WAVs resolved two full-pass chunk artifacts. The reconciled comparison has 149 words and only the existing two `Shift` → `Schifft` proper-name substitutions; evidence is in `output/narrated-previews/velar/asr-paced-review.json`. This supports word retention but does not establish natural delivery, pronunciation, or buyer comprehension. Listening to the paced joins and final mix remains a separate review.

## Optional local synthesis helper — unused

`../narrated-audio.mjs` remains source-only optional tooling. It has not generated any deliverable and is not the chosen route. Its dependency/model installation and synthesis remain disabled pending a separate user decision. It never installs dependencies or calls a paid speech provider.

### Inspect without generating anything

```sh
node videos/contractor-previews/narrated-audio.mjs velar --plan
```

The input is `narrated-pilot.mjs` (`narratedPilot`) and, when present, `narrated-scenarios.mjs` (`narratedScenarios`). An explicit `scene.phrases` array can override sentence segmentation; its combined text must equal `scene.spoken`. With no ID, only the Velar pilot is selected.

### Generate only if this optional route is separately authorized

Use the existing pinned HyperFrames 0.8.210 CLI and a Python 3.10+ environment containing `kokoro-onnx` and `soundfile`. Python 3.12 is suitable. Set `HYPERFRAMES_CLI` to its installed `bin/hyperframes.mjs` and `HYPERFRAMES_PYTHON` to that environment's interpreter. The helper uses its own Node executable, so run it with the project's supported Node runtime.

```sh
ALLOW_LOCAL_TTS=1 node videos/contractor-previews/narrated-audio.mjs velar
```

The first HyperFrames TTS call may download the approximately 311 MB Kokoro model and 27 MB voice file from the official Kokoro-ONNX release. Network/sandbox approval is independent of `ALLOW_LOCAL_TTS`. No fallback provider is selected on failure. Dependencies are not installed by this script.

Default voice: `af_heart`, American English, native speed. `NARRATION_VOICE` can select an available Kokoro voice. `NARRATION_GAP_SECONDS` can set a 0.15–0.25 second gap; the default is 0.2. `FFMPEG` and `FFPROBE` override those executable paths. `NARRATION_SCENARIOS` can point to a different module exporting `narratedScenarios`.

### Optional local helper's retained files and timing

Each film writes `audio/<id>/narration.txt` and `timing.json`. `originals/` retains every synthesized sentence WAV, exact submitted text, model/voice provenance, and measured duration. Names include a hash of text and provider settings; unchanged takes are reused and revised takes remain separate. Scene WAVs concatenate these originals with explicit silent gaps only. Volume, pitch, and speed are unchanged; the final video mixer owns the sound mix.

`timing.json` contains `scenes: [{ id, duration, file, spoken, phrases: [{ text, start, end, sourceFile }] }]`. File paths are relative to the film's audio folder. Each phrase's start/end is relative to its scene WAV and comes from measured PCM sample counts. These are complete sentence clip boundaries, including natural breath/silence, not word-level forced alignment. Do not use them for word highlighting. Scene duration follows the narration rather than a fixed template.

`--assemble-only` reuses retained originals without invoking TTS or downloading a model. It fails if a matching original or its provenance is missing.

Neither helper claims a listening review. Before a film passes, listen to each sentence and every join, check pronunciation and exact wording, then review the entire final mixed export at desktop and phone playback sizes. Add actual review evidence to the production validation report.

## Primary sources

- HyperFrames 0.8.210 installed `tts` command and `synthesize` implementation: local Kokoro ONNX, `af_heart` default, Python interpreter selected by `HYPERFRAMES_PYTHON`.
- [Kokoro JavaScript / model usage](https://github.com/hexgrad/kokoro/blob/main/kokoro.js/README.md).
- [Kokoro 82M original model](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0 model weights.
- [Kokoro-ONNX model release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0), the model/voice distribution used by the pinned HyperFrames CLI.
