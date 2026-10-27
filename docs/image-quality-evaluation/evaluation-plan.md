# Image-quality evaluation plan

**Status:** Probe cost recalculated from OpenAI's own calculator on 25 October 2026. No images were generated. Generation waits for an explicit yes to the spend in section 4 and to sending the three considered questions.  
**Product source:** `PRODUCT_VISION.md` section 6. The pass bar there still belongs to the product owner. An agent score cannot meet it.  
**Review set:** `review-set.md`. It stays fixed for this comparison.  
**Results:** `results.md`. **Index:** `candidate-index.md`. **Gallery:** `gallery.html`.

## 1. What this experiment asks

Can one image model, with one shared prompt frame and four metaphor instructions, produce a first set of images that are conceptually different and worth keeping?

A polished picture fails when it is a stock illustration, a literal picture of the nouns, a familiar cliché, corporate or clip-art artwork, a scene that needs a long caption, or a title that only shortens the question.

The product path this stands in for is one explicit request from a considered question, a comparison of four images, a choice, and a one- or two-word title. This test does not build that screen.

## 2. Provider and model

V2 has not selected a provider. `PRODUCT_VISION.md` section 8 still lists the provider, the model, and retention terms as an open decision. This repository has no image client and no environment file for one.

V1, in `E:\Curitopia`, already calls the OpenAI Image API after an explicit confirmation:

| V1 use | Prompt behaviour | Request |
|---|---|---|
| Focus backdrop | `lib/focus-image/prompt.ts` asks for a wide, calm metaphor, and suggests pathways, layers, light, or a quiet network, in colours for a navy workspace | `1536x1024`, `quality: medium`, WebP |
| Investigation thumbnail | `lib/experiments/thumbnail-prompt.ts` asks for a small, simple symbol, recognisable at a small size | `1024x1024`, `quality: medium`, WebP |
| Story slide | `lib/stories/image.ts` asks for one specific metaphor, no text, an unresolved question, and a tall frame with quiet space for type | `1152x2048` on the current model, `quality: high`, WebP |

The model id is `OPENAI_IMAGE_MODEL` when that variable is set, and `gpt-image-2.5-flare` otherwise (`lib/focus-image/openai.ts`). `OPENAI_MODEL` is not used for images. The key is read from the server environment at call time. This plan did not open an environment file and does not know whether a key or any credit is present.

**Proposed model for the first comparison, if authorised:** `gpt-image-2.5-flare`.

That is the V1 default, so the first test does not introduce a second provider. It is not a V2 decision. Sunburst, a smaller model, or another vendor would be a later experiment, because the model would change at the same time as the prompt.

**Fixed generation settings, if authorised:**

| Setting | Value | Reason |
|---|---|---|
| Size | `1024x1024` | Large enough to judge. Square, so the set is not composed as a V1 story slide. |
| Quality | `high` | V1 already uses `high` for story art. `medium` is the backdrop and thumbnail setting this product is leaving. |
| Format | WebP | Matches the V1 image calls. |
| Count | `n: 1` per call | One variant per call, so a failure is tied to one prompt. |
| Reference images | None | No edit workflow. |
| Quality `auto` or `max` | Out | `auto` hides the quality actually used. `max` changes cost and finish at the same time. |

## 3. Why no images were requested

The probe settings are chosen. The spend is not yet approved.

No image was generated. The three considered questions have not been sent. No environment file was opened. `gallery.html` is still an empty layout, and `docs/image-quality-evaluation/images/` stays gitignored.

## 4. Probe cost, from OpenAI's calculator

Checked on 25 October 2026 against the calculator in [Image generation — GPT Image 2.5 and GPT Image 2 output tokens](https://developers.openai.com/api/docs/guides/image-generation#gpt-image-25-and-gpt-image-2-output-tokens), with the model set to **GPT Image 2.5 (Sunburst and Flare)**, quality **high**, width **1024**, height **1024**.

That calculator does not offer Flare as its own row. Sunburst and Flare share one estimate. The page also says the models can use different token counts for the same quality setting, and that the response `usage` is the measurement that matters. The Flare model page prices image output at $30 per 1M tokens and text input at $5 per 1M tokens. It says the GPT Image 2 calculator does not estimate GPT Image 2.5 token use; the figure below is from the 2.5 calculator on the image-generation guide, not from that older calculator and not from a third-party table.

| Calculator setting | Output tokens | Image-output estimate |
|---|---|---|
| `1024×1024`, `high` | 1,756 | $0.05268 |
| `1024×1024`, `xhigh` | 3,122 | $0.09366 |
| `1024×1024`, `max` | 7,024 | $0.21072 |

The note under the calculator: per image, at $30 per 1M image-output tokens. Text input, image input, and streaming partial images are excluded. `1,756 × 30 / 1,000,000 = 0.05268`.

**Twelve calls at `high`:** `12 × $0.05268 = $0.63216` in image output, if each response uses 1,756 output tokens.

Text input is extra. The twelve prompts are 11,879 characters in total. OpenAI does not publish a character-to-token rate for this model, so this plan does not convert those characters into a billed token count. At $5 per 1M text tokens, text input costs $0.01 only after 2,000 tokens across the whole probe, and $1 only after 200,000 tokens. The exact text charge will be `usage.input_tokens_details.text_tokens`. There is no image input and no streaming, so those lines should be zero.

### What $1.50 is

$1.50 is a planning ceiling for this probe. It is not either of the other two things:

- **Not a provider billing limit.** OpenAI bills the tokens in `usage`. Nothing in this repository sets an OpenAI project budget, and this check did not open the provider dashboard. A call that has already been accepted is billed even if the running total then sits above $1.50.
- **Not an application-enforced stop.** There is no runner yet, so no program is currently refusing a call. The rule below is the control the runner must implement before the first request.

The control that can be enforced before a request leaves is the call count and the request body. The dollar figure can be checked only after `usage` comes back.

| If every image matches this calculator row | Twelve-image output cost | Against $1.50 |
|---|---|---|
| `high` (the setting to send) | $0.63216 | under, with room for text tokens |
| `xhigh` | $1.12392 | still under, before text tokens |
| `max` | $2.52864 | over |

A `high` request whose real output jumped to the `max` token count would cross $1.50 inside the twelve calls. The runner cannot pull that call back. It can refuse the next one.

### Call rules for the probe

When, and only when, the approval in the next paragraph is given:

- At most **12** requests to the Image API. A failed or timed-out request counts. Call 13 is not sent.
- `max_retries: 0`. No automatic retry, and no manual retry. A weak picture is not regenerated.
- Each request is `model: gpt-image-2.5-flare`, `size: 1024x1024`, `quality: high`, `n: 1`, `output_format: webp`. No `partial_images`. No reference image.
- The only prompts are Q06, Q09, and Q10, variants A–D, from the shared frame in section 5.
- After each successful response, record `usage.input_tokens`, `usage.input_tokens_details.text_tokens`, `usage.input_tokens_details.image_tokens`, `usage.output_tokens`, `usage.output_tokens_details.image_tokens`, and `usage.total_tokens`.
- Compute image-output dollars as `output_tokens × 30 / 1,000,000`, and text-input dollars as `text_tokens × 5 / 1,000,000`. Image-input dollars, if any, are `image_tokens × 8 / 1,000,000`. The Flare model page says text output is not billed.
- If the running sum of those dollars is already above $1.50, send nothing further.
- On the first error, stop. Leave the remaining slots empty.

The considered questions that would be sent are:

- Q06: When does learning increase doubt instead of reducing it?
- Q09: How can someone be present among others and still be unreached?
- Q10: Does wanting certainty keep me from seeing what is already unresolved?

**Do not send them until you explicitly approve both this estimate and that sending.** The estimate to approve is **$0.63216 of image output for 12 images at the calculator's `high` token count, plus text input at $5 per 1M tokens, expected to be cents and measured from `usage`.** $1.50 is the ceiling the runner must stop before exceeding on a later call. It is not a guarantee the provider will stop at $1.50.

The 48-image set is not part of this approval. At the same `high` calculator rate it would be `48 × $0.05268 = $2.52864` in image output, before text tokens, and it needs its own yes.

## 5. Prompt strategy

**One variable.** The model, size, quality, format, and shared frame stay constant. Across the four candidates for a single question, the only change is the metaphor instruction: tension, trace, scale, or relation.

The considered question is the subject. The subconscious line stays in the review set and stays out of this prompt. Adding it would be the next test, after this one has results.

The "compelling image" sentence in the review set stays out of the prompt. It is how a person scores the picture.

**Shared frame, version `image-eval-1`:**

```text
Create one image that interprets the considered question below.
Use a single dominant visual metaphor. Make it specific enough that the question can be felt without a caption.
Do not illustrate the nouns in the question as a literal scene.
Do not render letters, words, numbers, captions, logos, or watermarks.
Do not use an infographic, clip-art icons, corporate presentation art, or a stock-photo pose.
Avoid lightbulbs, generic silhouettes on a horizon, a person paired with a question mark, floating puzzle pieces, an hourglass as a symbol of time, and flat icon scenes.
The image is not an answer and not evidence. Leave the question unresolved.

Considered question: "{considered}"

Metaphor instruction: {variant}

Also avoid: {case avoid list}
```

**Variants:**

| Id | Name | Instruction |
|---|---|---|
| A | tension | Show the unresolved tension as two concrete forces in the same frame. Neither one wins. |
| B | trace | Show the residue or after-effect of the question, not the event itself and not a symbol standing for the topic. |
| C | scale | Show one ordinary object at the wrong scale, so the question becomes physical. One object, not a collage. |
| D | relation | Show a precise relationship between two things. If a person is necessary, show a particular gesture, not a generic silhouette. |

Candidate id is `{question}-{variant}`, from `Q01-A` through `Q12-D`. Forty-eight candidates. Each call uses `n: 1`.

**Worked assembly, `Q06-A`:**

```text
Create one image that interprets the considered question below.
Use a single dominant visual metaphor. Make it specific enough that the question can be felt without a caption.
Do not illustrate the nouns in the question as a literal scene.
Do not render letters, words, numbers, captions, logos, or watermarks.
Do not use an infographic, clip-art icons, corporate presentation art, or a stock-photo pose.
Avoid lightbulbs, generic silhouettes on a horizon, a person paired with a question mark, floating puzzle pieces, an hourglass as a symbol of time, and flat icon scenes.
The image is not an answer and not evidence. Leave the question unresolved.

Considered question: "When does learning increase doubt instead of reducing it?"

Metaphor instruction: Show the unresolved tension as two concrete forces in the same frame. Neither one wins.

Also avoid: Lightbulbs, stacks of books as a wisdom symbol, graduation caps, glowing brains, and a person with a question mark.
```

The other 47 prompts are this frame with the matching question, variant, and avoid list from `review-set.md`. They are not written out 48 times, so a wording tweak cannot silently diverge.

## 6. What will not be done on the first run

- No second generation to rescue a weak picture. A weak set is a result. Record it and stop.
- No automatic retry and no manual retry. A failed call counts toward the 12 and is not repeated. Section 4 is the call rule.
- No change of model, size, or quality in the same table as the prompt comparison.
- No title inside the image prompt, and no request that the picture contain the title. Rendered text is a failure.
- No upload of reference images, and no use of the V1 thumbnail or focus-backdrop prompt as a candidate. Those prompts ask for a small symbol or a calm navy backdrop. That is the outcome this product is trying to leave.

## 7. Titles

The Image API returns a picture, not a title. A title invented from the question before anyone sees the picture tends to shorten the question. That is one of the stated failures.

For this experiment, titles are a separate step after the file exists:

1. The reviewer looks at the image and may write a one- or two-word title.
2. An agent may propose a title only from the image it has seen, not from the review-set "compelling image" note.
3. The two titles stay labelled. The agent's title is not the reviewer's, and neither is a keep decision.

Same-request title generation is not available on the image call used here. Whether a later text call should offer titles is a conclusion for `results.md` after real images exist. The working product assumption remains: the title field stays empty until the person types or asks.

## 8. How a later run is scored

Each image is scored 0, 1, or 2 on four axes. Total is out of 8.

| Id | 0 | 1 | 2 |
|---|---|---|---|
| A. Conceptual relevance | Misses or misrepresents the question | Plausible, and obvious or weak | The underlying idea is communicated in a meaningful way |
| B. Visual distinctiveness | Generic or interchangeable | Some distinctive elements, mostly familiar | A memorable visual idea with a point of view |
| C. Avoidance of stock clichés | Dominated by cliché, clip art, or corporate imagery | Some familiar tropes remain | No dominant cliché; the approach feels considered |
| D. Title quality | A caption, a shortened question, or a title that misses the metaphor | Relevant and ordinary | A memorable one- or two-word title that names the metaphor |

Agent scores and the product owner's scores stay in separate columns. A high agent total is not a claim that the image is compelling. The keep column is only the product owner's.

The vision's pass bar, applied to the owner's scores: median relevance and distinctiveness of 2 across the review set, stock avoidance never 0, and the owner would keep at least half of the questions without an immediate regenerate. This plan does not relax that bar.

Also record, per question:

- Clock time from the first request to the fourth image.
- Number of steps. The designed path is one batch of four, then look, then an optional title. Count anything else.
- Whether the four pictures differ in metaphor, or only in palette and crop.
- Whether a useful title was easy to say after seeing the image.
- Regenerations. The planned number is zero. A failed call is recorded and not repeated.

Judge the images in `gallery.html` at the size the page uses, not as a tiny strip. The layout cell is 420 pixels square.

## 9. What each run size can establish

**Probe, 12 images, Q06, Q09, and Q10.** These three are the cases most likely to collapse into a lightbulb, a lonely silhouette, or a question mark. The probe can show whether the four instructions produce four different metaphors, and whether the shared avoid list stops the obvious cliché on hard cases. It cannot support a median across all seven themes, and it cannot say the approach is reliable.

**Full set, 48 images.** This is the first comparison that can be put against the pass bar. It still cannot say the product owner's own questions would succeed. The review set is synthetic, plus three considered lines from the journey document.

## 10. Experience the product would be copying

Designed, not measured:

| Moment | Designed shape |
|---|---|
| From a settled considered question to four candidates | One explicit action. Four calls, same model, four variants. |
| While waiting | The considered question stays visible. The previous set, if any, stays until the new four are all present. |
| If none is worth keeping | Stop. The miss is data. A new prompt version is a new experiment. |
| Title | A separate step. Empty until the person writes or accepts one. |
| Save | The chosen file only. |

Latency is unknown. V1's image client times out at 55 seconds per call. Four sequential calls can therefore sit on the screen for a few minutes even when every call succeeds. The probe should write down the actual wait before anyone treats that timeout as a product requirement.

## 11. Files and boundaries

- Prompts, scores, and notes live in this directory as markdown.
- Image files, if a later run creates them, go in `docs/image-quality-evaluation/images/` and stay uncommitted.
- No application code, schema, hosted project, V1 edit, secret file, or git commit is part of this evaluation.
