# Server audio transcription fallback: feasibility

Status: assessed on 2026-10-04; no transcription service installed or deployed.

## Existing machine

Key-only SSH to `meta@192.168.31.32` identified `META-ROGALLY`: AMD Ryzen Z1
Extreme (8 cores/16 threads), 27.7 GiB system memory, AMD Radeon integrated GPU.
`uv` is installed; no ffmpeg command was found in the SSH environment.

This machine can run CPU transcription. Its AMD GPU is not a CUDA device, so
faster-whisper's NVIDIA benchmarks do not predict its performance. No audio
benchmark has been run and real-time throughput remains unverified.

## Proposed first implementation

Keep native YouTube captions as the cheapest first choice. On absent or failed
caption acquisition, offer an explicit transcription action. Send video ID,
desired original audio language, and current playback time through the existing
loopback/Tailscale companion pattern to a separate transcription worker.

The server acquires the original audio using a pinned yt-dlp dependency and
transcribes it with faster-whisper small/int8 on CPU initially. PyAV can decode
audio without a system ffmpeg installation; yt-dlp downloads/remuxing may still
require an ffmpeg executable, which must be verified for the chosen audio format.
Use the original Korean audio for Korean speech, rather than an automatically
dubbed English track. Return timestamped source segments and use the existing
subtitle translation profile and renderer to produce Chinese.

Prefer prerecorded-video jobs with progressive chunks and caching. Prioritize
the current playback window, merge overlapping chunk text, preserve absolute
video timestamps, and cancel obsolete per-video jobs. Cache by video ID, audio
track/language, model version, and chunk interval. Keep transcription language
and translation language separate; Whisper's speech translation mode targets
English and is not the Chinese translation stage.

A URL-only userscript request cannot guarantee access to protected media. The
server's audio acquisition can encounter independent bot/403 restrictions even
when captions are bypassed. Browser cookies should not be exported by default.
Account-only media and browser-captured audio need separate design/authorization.
Capturing only currently playing audio also prevents ahead-of-playback processing.

## Acceptance before deployment

1. Acquire 2-5 minutes of the original Korean audio through the server's own
   existing network path, without assuming the local browser's successful node
   applies to the server.
2. In a project-local uv environment, measure acquisition time, transcription
   time, memory, timestamp alignment, Korean name/number accuracy, and first
   translated segment latency on the ROG.
3. Compute real-time factor as transcription seconds / audio seconds. A factor
   below 1 is necessary for sustained single-stream processing; it does not by
   itself prove satisfactory startup latency or concurrency.
4. Validate seek, video navigation, cancellation, cache reuse, and a bounded
   queue. Use private loopback/Tailscale access with existing trust boundaries.

CPU small/int8 is an initial benchmark candidate, not an accuracy promise. If
Korean quality is insufficient, compare medium/large models and a GPU-equipped
machine before choosing a production model. Word alignment/diarization from
WhisperX adds dependencies and is unnecessary for an initial single-video caption
fallback.

## Primary sources

- [faster-whisper requirements, timestamps, VAD, and CPU/GPU benchmarks](https://github.com/SYSTRAN/faster-whisper)
- [Whisper language and transcription/translation behavior](https://github.com/openai/whisper)
- [WhisperX alignment and diarization](https://github.com/m-bain/whisperX)
- [yt-dlp YouTube subtitle 429 investigation](https://github.com/yt-dlp/yt-dlp/issues/13831)
