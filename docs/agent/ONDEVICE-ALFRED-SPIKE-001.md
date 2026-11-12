# ONDEVICE-ALFRED-SPIKE-001: on-device Alfred (BIG-IDEAS-001 item 7), measured

Gavin, 2026-11-12: "Measure it for real". This is a spike only: no app code.

## Method
- **Models:** two small open models that run in a phone browser, `onnx-community/Qwen2.5-0.5B-Instruct` and
  `onnx-community/Qwen3-0.6B-ONNX`, both 4-bit, run through transformers.js on CPU. The weights are the same ones a phone
  would run, so answer quality carries over; speed on a phone GPU would differ.
- **Facts:** synthetic BEYOND records in the shape the free helper reads (water, protein, steps, sleep, shift, due
  task, Alfred spend, last workout).
- **Questions:** 24 in the free helper's domain. 13 can be answered from the facts. 11 deliberately can't, and the
  right answer to those is "Not recorded."
- **Prompt:** "answer only from FACTS, else reply Not recorded; never guess."

## Results
| Model | Right | Wrong or invented | Said "not recorded" when it was recorded | Time per answer (CPU) |
|---|---|---|---|---|
| Qwen2.5-0.5B (about 280 MB) | 15/24 | **9** (e.g. "4" hours deep sleep; water answered with the protein figure) | 0 | 1.3 s |
| Qwen3-0.6B, no thinking (about 335 MB) | 12/24 | 0 | **12 of 13** answerable questions | 1.8 s |
| Qwen3-0.6B, thinking | 12/24 | **4** (e.g. "183.2 lb" for last month) | 8 | 20 s |

The free helper already answers these question types deterministically from records, and never invents.

## Phone support and licences
- **Phones:** WebGPU runs on iOS 26 Safari, and on Android Chrome 121+ with Android 12+ and an Adreno 600+ or Mali-G78+ GPU.
- **Download:** 280–700 MB once, from Hugging Face (a new host), kept outside BEYOND's 2 MiB precache.
- **Licences:** WebLLM, transformers.js and the Qwen models are Apache-2.0. Llama 3.2 uses its own community licence.

## Decision: DEFER (Gavin, 2026-11-12: "Defer for now.")
Neither model meets Alfred's "never guess" rule while staying useful. One invents a wrong answer for more than a third
of questions; the other refuses almost everything it could answer. The free helper covers this domain exactly, and
Alfred through Anthropic covers open questions. Revisit when a 1–3B model runs comfortably on a phone. A browser test
could rerun this spike with the same question set.
