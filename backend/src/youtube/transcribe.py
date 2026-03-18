#!/usr/bin/env python3
"""
Local Whisper transcription script using faster-whisper.
Usage: python3 transcribe.py <audio_file_path> [model_size] [language]
Prints transcription to stdout.
Models: tiny, base, small, medium, large-v3
Language: e.g. 'en', 'my' (Burmese), 'ko' (Korean), 'ja' (Japanese), or None for auto-detect
"""
import sys
import os
import json

def transcribe(audio_path: str, model_size: str = "base", language: str = None) -> str:
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    # Pass language=None to auto-detect, or a specific code like 'my', 'ko', 'ja'
    lang = language if language and language != "auto" else None
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        language=lang,
        condition_on_previous_text=False,  # prevents repetitive/looping hallucinations
        vad_filter=True,                   # skip silent parts to reduce garbage output
    )
    print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})", file=sys.stderr)
    return " ".join(segment.text.strip() for segment in segments)

def transcribe_many(audio_paths, model_size: str = "base", language: str = None) -> None:
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    lang = language if language and language != "auto" else None

    for index, audio_path in enumerate(audio_paths):
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            language=lang,
            condition_on_previous_text=False,
            vad_filter=True,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        print(
            json.dumps(
                {
                    "index": index,
                    "path": audio_path,
                    "text": text,
                    "language": info.language,
                    "language_probability": info.language_probability,
                },
                ensure_ascii=False,
            ),
            flush=True,
        )

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 transcribe.py <audio_file> [model_size] [language]", file=sys.stderr)
        sys.exit(1)

    if sys.argv[1] == "--jsonl":
        if len(sys.argv) < 5:
            print("Usage: python3 transcribe.py --jsonl <model_size> <language> <audio_file> [...audio_files]", file=sys.stderr)
            sys.exit(1)

        model_size = sys.argv[2]
        language = sys.argv[3]
        audio_files = sys.argv[4:]
        for audio_file in audio_files:
            if not os.path.exists(audio_file):
                print(f"Error: File not found: {audio_file}", file=sys.stderr)
                sys.exit(1)
        transcribe_many(audio_files, model_size, language)
        sys.exit(0)

    audio_file = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language   = sys.argv[3] if len(sys.argv) > 3 else None

    if not os.path.exists(audio_file):
        print(f"Error: File not found: {audio_file}", file=sys.stderr)
        sys.exit(1)

    result = transcribe(audio_file, model_size, language)
    print(result, end="")
