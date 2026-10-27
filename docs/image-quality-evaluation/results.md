# Image-quality results

**Status:** The reduced Q09 probe ran on 25 October 2026. Four images were saved. Recorded spend $0.21493. No score and no keep. See `probe-q09.md`. The other eleven questions were not sent. The twelve-image set in section 7 is still unapproved.  
**Plan:** `evaluation-plan.md`. **Questions:** `review-set.md`. **Slots:** `candidate-index.md`. **Layout:** `gallery.html`.

## 1. What was tested

Q09 A–D were generated and saved. Q01–Q08 and Q10–Q12 were not. No candidate was scored.

Inspected, without opening secrets or user data:

- `PRODUCT_VISION.md`, `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, and `ENTITY_RELATIONSHIP_MODEL.md`.
- V1 image call sites and their prompt builders: focus backdrop, investigation thumbnail, and story slide.
- OpenAI's published token prices for `gpt-image-2.5-flare`, and the image-generation guide's output-token calculator for GPT Image 2.5 at `1024×1024` / `high`, on 25 October 2026.

Not inspected: environment files, API keys, V1 accounts, V1 rows, and stored image files.

Four Q09 requests were sent, with retries off. Those files are `images/Q09-A.webp` through `images/Q09-D.webp`. The other gallery cells stay empty. Timings and token usage are in `probe-q09.md`. No regeneration was sent.

## 2. What remains unsent

Q09 was sent as its own four-call probe. The twelve-image set, and Q06 and Q10, were not.

OpenAI's 2.5 calculator, with Sunburst and Flare on one row, estimates **$0.05268** of image output for one `1024×1024` image at `high` (1,756 output tokens). Twelve probe images are **$0.63216** of image output if usage matches that count, plus text input at $5 per 1M tokens. The twelve prompts are 11,879 characters. That text line is not in the calculator and will be taken from `usage`.

$1.50 is a planning ceiling the runner must honour by refusing another call once the summed `usage` cost has passed it. It is not an OpenAI billing limit, and there is no program enforcing it yet. The hard pre-request control is a maximum of 12 calls, with retries off. Detail is in `evaluation-plan.md` section 4.

**Still unapproved:** an explicit yes to that twelve-image estimate, and to sending these two remaining considered questions to OpenAI:

- Q06: When does learning increase doubt instead of reducing it?
- Q10: Does wanting certainty keep me from seeing what is already unresolved?

Q09 was authorized separately and is recorded in `probe-q09.md`.

## 3. Document findings

These come from the prompt source, not from pictures.

- V1 already has one provider and one default model. It does not have one image job. Backdrops, thumbnails, and story slides use different prompts, sizes, and quality settings.
- The thumbnail prompt asks for a small, simple symbol. That is the result V2 treats as a failure even when the icon is tidy.
- The focus prompt asks for a wide, calm scene and offers pathways, layers, light, or a quiet network, matched to a navy workspace. Those are backdrop instructions. They also suggest the same family of metaphors for every question, which works against a four-image set that must differ in idea.
- The story prompt is the nearest relative: one specific metaphor, no rendered text, and an unresolved question. It also asks for a shared story finish and empty space for type. V2's kept image is not a slide in a sequence, so that house style should not be copied wholesale.
- The Image API call returns a picture. A title cannot be part of that same response. A title composed from the question text, before anyone sees the image, is the shortening failure this test is meant to catch.

## 4. Scores

No candidate was scored. Agent totals and owner totals are both empty. There is no median, no keep rate, and no pass or fail against the vision bar.

| Question | Images | Agent median / 8 | Owner keeps | Notes |
|---|---|---|---|---|
| Q09 | 4 | — | — | Generated. Not scored. Titles blank. |
| Q01–Q08, Q10–Q12 | 0 | — | — | Not generated |

Per-image columns, when a run exists, are: id, prompt version, model, agent A/B/C/D, agent total, owner A/B/C/D, owner total, owner title, agent title, keep. They are not filled in here.

## 5. Experience measures

| Measure | Result |
|---|---|
| Time from considered question to first four candidates | Q09: 90.8 s for four sequential calls. First image returned in 23.0 s. |
| Steps | Designed as one batch of four. Not exercised. |
| Creative regenerations | 0 planned. 0 occurred, because there was no run. |
| Technical retries | Disabled. None occurred. |
| How often the four candidates differed in concept | Not scored. Q09-A through Q09-D are in the gallery for the owner to compare. |
| Whether a title emerged from the image | Unknown. No titles were proposed. |

## 6. Recommendations

These are decisions for the next experiment. They are not a claim that a prompt works.

1. **Do not prototype the capture-to-image product on this evidence.** There are no images to keep.
2. **Hold the model at `gpt-image-2.5-flare` for the first paid comparison**, if that spend is accepted. Changing vendor or model at the same time would make a weak picture unreadable.
3. **Use prompt version `image-eval-1` as written.** Four metaphor instructions, one shared frame. Do not mix in the V1 thumbnail prompt or the focus-backdrop prompt.
4. **Which strategy produced the strongest variety** cannot be answered. Tension, trace, scale, and relation are untested hypotheses. The probe exists to see whether they diverge before 48 images are bought.
5. **Likely failure modes to watch for,** predicted from the questions and from V1's old prompts, not observed: literal rooms and houses for Q02 and Q09, lightbulbs and book stacks for Q06, lonely horizons for Q09, gears for Q08, wilted flowers for Q12, and the same misty pathway reused across the set because the old focus prompt rewarded it. If those appear, the avoid list was too weak or the model ignores it. If all four variants look alike, the metaphor instructions are not doing enough and the next experiment should change only that.
6. **Keep titles as a separate step.** The image call does not return one, and a title written from the question misses the point of the test. After images exist, the owner titles the pictures they would actually consider. An agent title, if tried, is a second step and stays in its own column.
7. **Next smallest experiment,** still unsent: Q06, Q09, and Q10, variants A–D. Twelve calls, `gpt-image-2.5-flare`, `1024x1024`, `quality: high`, retries off. Official calculator image-output estimate **$0.63216**, plus measured text input. The probe can show cliché collapse and conceptual variety on three hard cases. It cannot clear the full review set.

## 7. Decision required

Approve or hold. An approval needs both of these in plain language:

1. The expected probe spend is **$0.63216 in image output** if each image uses the calculator's 1,756 tokens, **plus text input at $5 per 1M tokens**. $1.50 is the runner's stop-before-the-next-call ceiling, not a provider cap.
2. The three considered questions in section 2 may be sent to OpenAI.

The 48-image set is a separate decision. At the same calculator rate its image output would be $2.52864 before text tokens.

Until that yes, this evaluation stays a plan. Success is not declared.
