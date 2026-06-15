---
title: "Field Notes: building a small-model estimator that tells the truth"
description: How Quillwright turns a photo and a voice note into a tradesperson's estimate — with an orchestra of small models, on your own machine, and not a single number invented by an LLM.
pubDate: 2026-06-15
author: Aarya Prakash
tags:
  - small-models
  - agents
  - evals
  - fine-tuning
draft: true
---

_How Quillwright turns a photo and a voice note into a tradesperson's estimate — with an
orchestra of small models, on your own machine, and not a single number invented by an LLM._

## The job nobody wants

Every tradesperson does the same unpaid hour after the real work is done: writing up the
estimate. Parts, quantities, labor, a defensible total. Quillwright is an on-device,
human-supervised agent that does that draft from a **field capture** — a job photo plus a
spoken note — and hands back an itemized, editable estimate.

The constraints we set ourselves were the interesting part: **small models** (≤32B), **no
third-party AI APIs**, and a hard rule that **no customer-facing number ever comes from a
language model.** Those three constraints shaped every decision below.

## An orchestra, not a soloist

There's no single model doing the work. Each role in the pipeline resolves to a small,
purpose-fit model:

- **Perception** — MiniCPM-V (OpenBMB) reads the job photo into observations ("RUN
  CAPACITOR", a nameplate model number).
- **Agent Brain** — NVIDIA Nemotron-3-Nano drives a narrow tool-calling loop: which items,
  what quantities, when it's done.
- **Audio** — Cohere Transcribe turns the voice note into text on-device.
- **Multilingual** — Cohere Aya translates the customer-facing copy (Spanish, French,
  Mandarin) — descriptions only, never the numbers.
- **Embedding** — a small embedder powers semantic recall of similar past jobs.

The brain's tool surface is deliberately tiny — essentially _add a priced item_ and
_finish_. That narrowness is **why a 4B model is reliable** here: it does routing and
judgment, not arithmetic.

## Facts-from-Tools: the rule that runs through everything

The correctness rule is simple to state and ruthless to enforce: **any number that reaches
the customer — price, quantity, tax, total — comes from a tool (a catalog lookup, a
deterministic `compute`) or from a human edit. Never from the model's free generation.**

It holds in the obvious places (the brain calls `lookup_price`, not "I think this costs
$40") and the non-obvious ones:

- **Edits** re-run through a server-authoritative recalc. The browser never computes its own
  total.
- **Translation** changes words, not digits.
- **Document Capture** (reading a supplier quote) produces _Proposed Line Items_ — the
  document is the source, but a price only becomes customer-facing once a human confirms it.
- **The refinement chat** keeps a sanitized history: when you reopen an estimate and keep
  editing, the model sees _what you asked_ ("make it 2 hours") but takes the _numbers_ from
  the current line items — a stale dollar figure can never leak back in. Even the
  conversation's own compaction is done in code, not by asking a model to summarize.

## The eval story (the part I'd tell another builder)

Here's the moment that changed how we built this. We ran the agent by hand on a handful of
jobs and it looked **perfect**. Then we wrote an eval set and scored it.

**Item F1: 0.367.**

![Agent Brain item F1](/blog/quillwright/brain_f1.png)

Manual testing had been lying to us — we'd unconsciously fed it the cases it handled. The
eval set didn't. Two fixes, both measured:

1. **Fuzzy catalog lookup** — "refrigerant" should find `refrigerant_r410a`. F1 jumped to
   **0.880**.
2. **Prompt tuning** the brain's tool-calling — to **0.967**, with quantity accuracy going
   from 0.40 to 1.00.

The lesson isn't "we got a good number." It's that the good number only existed because we
were willing to be told a bad one first.

## Memory that gets smarter, measured the same way

Quillwright recalls similar past jobs to inform a new estimate. The first version used
keyword matching. We measured **recall@1 = 0.750**. Swapping in a small embedder for a
semantic re-rank moved it to **0.875** — with one honest remaining miss we left in, because
a benchmark with no failures is a benchmark you don't trust.

![Episodic recall](/blog/quillwright/recall.png)

## Fine-tuning a small vision model on receipts — and on the real domain

The 🎯 artifact is a MiniCPM-V LoRA fine-tune. On the public **CORD** receipt benchmark, the
tune lifted item F1 from **0.588 → 0.681** (+0.09). But CORD is receipts, not trade
invoices — so we also generated a grounded-synthetic set of trade invoices (built from a
real 381-entry trade catalog) and fine-tuned on that. In-distribution, the tune went from
**0.703 → 0.933** (+0.23), with price accuracy hitting 1.00.

![MiniCPM-V fine-tune](/blog/quillwright/finetune.png)

The +0.23 is the honest headline: a small model, fine-tuned on the actual domain, closes
most of the gap to a clean read. The +0.09 on CORD is the conservative one — it's a harder,
out-of-domain benchmark, and we report it anyway.

## Artifacts

Both LoRA adapters are on the Hub, and every number above is reproducible from the eval
scripts in the repo:

- 🎯 [`Aarya2004/minicpmv-trade-lora`](https://huggingface.co/Aarya2004/minicpmv-trade-lora)
  — the in-domain trade-invoice tune (0.703 → 0.933).
- [`Aarya2004/minicpmv-cord-lora`](https://huggingface.co/Aarya2004/minicpmv-cord-lora) —
  the conservative CORD baseline (0.588 → 0.681).

| Metric                               | Before | After |
| ------------------------------------ | ------ | ----- |
| Agent Brain item F1                  | 0.367  | 0.967 |
| Episodic recall@1                    | 0.750  | 0.875 |
| MiniCPM-V item F1 (trade, in-domain) | 0.703  | 0.933 |
| MiniCPM-V item F1 (CORD, OOD)        | 0.588  | 0.681 |

## "On your own machine" — and the honesty around it

The hero claim is _no cloud_. The honest version of that claim has two parts:

- The **Private Stack** is open small models with no third-party AI APIs. Locally, those
  models genuinely run on the dev machine via Ollama / llama.cpp — and we filmed an
  **Airplane-Mode Proof**: Wi-Fi off, a real forge completing.
- The **hosted demo Space** is wired live to **Modal** GPUs — the **Best Stack**: a
  Nemotron-3-Nano 30B brain, Nemotron-Omni for vision and audio, Aya-Expanse for
  multilingual. It's the same agent loop and the same Facts-from-Tools guarantees as the
  local run, just with more headroom; the apps scale to zero when idle, so the Space can fall
  back to a lightweight CPU mode (and says so on the page) when the models aren't wired. The
  local Private Stack and the hosted Best Stack are the same family at two tiers — flip one
  env var and the brain moves from a 4B on a laptop to a 30B on a GPU without touching the
  agent code.

We hold the same line everywhere a feature could over-claim. The "Finalize & Send" feature
really texts or emails the estimate **on the local path** with your own provider creds; on
the public Space it drafts only and tells you nothing was transmitted. Same for the phone
call and the phone-capture QR: real on the tunneled local machine, honestly framed.

## Three ways in

Once the core was solid, the capture surface grew — each path lands in the _same_ pipeline
and the _same_ Facts-from-Tools guarantees:

1. **The Workspace** — type/paste a note, add a photo, watch the Digital Apprentice stream.
2. **Call a phone number** — describe the job out loud; it transcribes the call, forges a
   **draft** estimate, reads the total back, and texts you the PDF. A human approves later.
3. **Scan a QR** — capture a photo and voice note on your phone; the desktop forges it live
   on screen.

## What I'd carry to the next project

- **Write the eval before you trust the demo.** 0.37 was the most useful number in the whole
  build.
- **Keep the model's job small.** The brain is reliable because it never touches arithmetic.
- **Make the honesty structural, not aspirational.** "The model never emits a number" is a
  code path, not a promise — and it's the same code path on every capture surface.

_Quillwright — tell it about the job; it drafts the estimate._
