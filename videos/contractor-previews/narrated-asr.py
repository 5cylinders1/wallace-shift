#!/usr/bin/env python3
"""Independent local narration QA with faster-whisper; no script-seeded recognition.

Dependencies and models are never installed implicitly. --download-model is the
only network-enabled path, restricted to Systran/faster-whisper-base.en and a
model directory inside this repository's output folder. Recognition always uses
the downloaded local path with local_files_only=True.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "output"
MODEL_REPOSITORY = "Systran/faster-whisper-base.en"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text.lower().replace("’", "'"))


def compare(reference: str, recognized: str) -> dict:
    """Exact token-level Levenshtein comparison, never fed to recognition."""
    expected, actual = tokens(reference), tokens(recognized)
    rows = [[0] * (len(actual) + 1) for _ in range(len(expected) + 1)]
    for i in range(len(expected) + 1):
        rows[i][0] = i
    for j in range(len(actual) + 1):
        rows[0][j] = j
    for i in range(1, len(expected) + 1):
        for j in range(1, len(actual) + 1):
            rows[i][j] = min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
                             rows[i - 1][j - 1] + (expected[i - 1] != actual[j - 1]))
    i, j = len(expected), len(actual)
    differences = []
    while i or j:
        if i and j and expected[i - 1] == actual[j - 1] and rows[i][j] == rows[i - 1][j - 1]:
            i, j = i - 1, j - 1
        elif i and j and rows[i][j] == rows[i - 1][j - 1] + 1:
            differences.append({"operation": "substitution", "referenceIndex": i - 1,
                                "recognizedIndex": j - 1, "reference": expected[i - 1], "recognized": actual[j - 1]})
            i, j = i - 1, j - 1
        elif i and rows[i][j] == rows[i - 1][j] + 1:
            differences.append({"operation": "deletion", "referenceIndex": i - 1, "reference": expected[i - 1]})
            i -= 1
        else:
            differences.append({"operation": "insertion", "recognizedIndex": j - 1, "recognized": actual[j - 1]})
            j -= 1
    return {
        "normalization": "Case-insensitive alphanumeric/apostrophe tokens; punctuation removed. Numbers are not rewritten.",
        "referenceWordCount": len(expected), "recognizedWordCount": len(actual),
        "editDistance": rows[-1][-1], "wordErrorRate": rows[-1][-1] / len(expected) if expected else None,
        "differences": list(reversed(differences)),
        "interpretation": "Flags passages for listening. Recognition errors, especially proper names, are possible; a mismatch does not prove the spoken take is wrong.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Already exported local narration audio")
    parser.add_argument("--output", required=True, type=Path, help="ASR JSON report inside repository output/")
    parser.add_argument("--model-dir", type=Path, default=OUTPUT_ROOT / "audio-qa-models/base.en")
    parser.add_argument("--download-model", action="store_true", help="Explicitly allow downloading only Systran/faster-whisper-base.en into --model-dir")
    parser.add_argument("--reference-file", type=Path, help="Optional exact script, used only AFTER independent recognition")
    parser.add_argument("--cpu-threads", type=int, default=4)
    args = parser.parse_args()
    source, destination, model_dir = args.input.resolve(), args.output.resolve(), args.model_dir.resolve()
    if not source.is_file():
        parser.error(f"Input file does not exist: {source}")
    if not model_dir.is_relative_to(OUTPUT_ROOT) or not destination.is_relative_to(OUTPUT_ROOT):
        parser.error("Model directory and report must be inside the repository output/ folder.")
    if args.cpu_threads < 1:
        parser.error("--cpu-threads must be positive")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        parser.error("faster-whisper is not installed in this interpreter. Install it separately into the authorized isolated QA dependency directory; this helper will not install packages.")
    if args.download_model:
        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id=MODEL_REPOSITORY,
            local_dir=str(model_dir),
            cache_dir=str(OUTPUT_ROOT / "audio-qa-models/.hub-cache"),
            allow_patterns=["config.json", "model.bin", "tokenizer.json", "vocabulary.*", "preprocessor_config.json"],
        )
    for required in ["model.bin", "config.json", "tokenizer.json"]:
        if not (model_dir / required).is_file():
            parser.error(f"Missing local model file {model_dir / required}. Download separately or run with explicitly authorized --download-model.")
    model = WhisperModel(str(model_dir), device="cpu", compute_type="int8",
                         cpu_threads=args.cpu_threads, num_workers=1, local_files_only=True)
    # Feed decoded samples directly so recognition does not depend on PyAV's
    # version-specific container-open keyword arguments. No package patching.
    import numpy as np
    decoded = subprocess.run(
        [os.environ.get("FFMPEG", "ffmpeg"), "-hide_banner", "-loglevel", "error",
         "-i", str(source), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    samples = np.frombuffer(decoded.stdout, dtype="<f4").copy()
    if samples.size == 0:
        parser.error("FFmpeg decoded no audio samples.")
    segments, info = model.transcribe(
        samples, language="en", task="transcribe", beam_size=5,
        word_timestamps=True, vad_filter=False, temperature=0.0,
        condition_on_previous_text=False, initial_prompt=None, hotwords=None,
    )
    results = []
    for segment in segments:
        results.append({
            "id": segment.id, "start": segment.start, "end": segment.end,
            "text": segment.text.strip(), "averageLogProbability": segment.avg_logprob,
            "noSpeechProbability": segment.no_speech_prob, "compressionRatio": segment.compression_ratio,
            "words": [{"text": word.word, "start": word.start, "end": word.end, "probability": word.probability}
                      for word in (segment.words or [])],
        })
        print(f"{segment.start:.2f}–{segment.end:.2f}: {segment.text.strip()}", file=sys.stderr, flush=True)
    transcript = " ".join(segment["text"] for segment in results)
    report = {
        "status": "asr_complete_human_review_pending",
        "input": str(source), "inputSha256": sha256(source), "durationSeconds": info.duration,
        "model": {"repository": MODEL_REPOSITORY, "directory": str(model_dir),
                  "modelSha256": sha256(model_dir / "model.bin"), "device": "cpu", "computeType": "int8"},
        "runtime": {"python": sys.version.split()[0], "fasterWhisper": importlib.metadata.version("faster-whisper"),
                    "ctranslate2": importlib.metadata.version("ctranslate2")},
        "audioDecode": {"decoder": "FFmpeg", "sampleRate": 16000, "channels": 1,
                        "format": "float32 PCM", "samples": int(samples.size), "pyavUsedForDecode": False},
        "recognition": {"language": "en", "beamSize": 5, "wordTimestamps": True,
                        "vadFilter": False, "conditionOnPreviousText": False, "temperature": 0,
                        "initialPrompt": None, "hotwords": None, "referenceUsedForRecognition": False},
        "languageProbability": info.language_probability, "transcript": transcript, "segments": results,
        "review": {"listening": "pending", "alignment": "pending",
                   "limitations": "Automatic recognition and word alignment only. Verify names, numbers, negations, omissions, sentence joins and timestamp boundaries by listening. This does not establish pleasant delivery or complete product comprehension."},
    }
    if args.reference_file:
        reference = args.reference_file.resolve()
        report["referenceComparison"] = {"file": str(reference), **compare(reference.read_text(), transcript)}
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".pending")
    temporary.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(destination)
    print(json.dumps({"status": report["status"], "report": str(destination), "segments": len(results),
                      "words": sum(len(segment["words"]) for segment in results), "durationSeconds": info.duration}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
