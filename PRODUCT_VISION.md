# Curitopia V2 product vision

**Status:** Working product direction. Experience, tone, and the four-stage cycle follow `Curitopia_Garden_Experience_Framework.md`.  
**Persistence:** The proposed, unapplied migration is `supabase/migrations/20261026000000_initial_v2_schema.sql`. Questions and visual concepts are many-to-many. Optional themes are `themes` and `theme_questions`. `docs/schema-inventory/proposals/v2-revised-schema-proposal.md` is the earlier image-on-question sketch and must not be executed.  
**Companions:** `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, `ENTITY_RELATIONSHIP_MODEL.md`.  
**Out of scope for this document:** application changes, SQL, a hosted Supabase project, V1, and secrets.

V2 has its own Supabase project, its own accounts, and its own private storage when that project is eventually created. V1 stays as it is. A V1 account, row, or file is not present in V2 unless a later import is explicitly approved.

## 1. Product intent

Curitopia is a personal place to nurture curiosity. It helps a person move from an unfinished thought to a considered question, then to a compelling image with a one- or two-word title.

The emotional centre is a garden: evolving curiosity, not a productivity score. The working cycle is repeatable and optional at every step:

**Gather → Curate → Visualise → Distil.**

In the garden’s language: sow freely, tend what matters, see what unfolds, name what matters.

The payoff is a visual concept worth returning to: a distinctive image and a title that names its metaphor. A generic illustration, a decorative backdrop, or a small thumbnail is a failed image even when it arrives quickly. Saving that concept does not finish the idea.

Speed matters as the absence of extra steps. It does not outrank thoughtfulness or image quality, and it is not a score.

The earlier promise, "Ask. Experiment. Create.", put investigation and a story export at the centre. Investigation remains an optional later capability, the Lab. It is not a stage of this cycle and not a gate in front of an image.

## 2. The garden

The garden shows how curiosity is taking shape. It is not a streak, a level, or a questions-per-minute gauge.

| Garden | In the workspace |
|---|---|
| Seed | A question just captured, in its original wording |
| Shoot | A question the person retains for more attention |
| Branch | A relationship the person makes, including a merge that keeps every original wording |
| Blossom | A visual concept they choose to keep: an image, a short title, and the question or questions that informed it |
| Field notes | The personal record around the work. A label for the place, not a separate product |
| Curiosity Shelf | A lightweight holding place for ideas to keep close. Not the Library, and not a required stage |

Growth follows real activity. A pause does not wither anything. Parked questions stay welcome. The garden must not imply that a person has failed to progress.

The illustration can stay simple. A complex interactive tree is not required. Botanical language is sparing: actions keep clear names such as Keep, Park, and Merge.

The visual system stays warm and editorial: cream and paper surfaces, a coral accent, serif display type, and the field-notes voice. That identity carries the garden. It is not a game skin.

## 3. The four-stage cycle

The stages are views over one workspace. They are not a wizard. A person can open any stage, capture another question, or return to the Library without finishing the activity in front of them.

### Gather — sow freely

Capture many raw questions. Enter adds one and clears the field. The original wording is stored as typed. The growing collection stays visible. Nothing here requires a considered question, a theme, an investigation, or an image.

### Curate — tend what matters

Keep, park, discard, or restore. Suggest similar wording only as a labeled text match unless a model actually ran. Merging keeps the source wordings. No recommendation deletes a question.

### Visualise — see what unfolds

The person chooses which question to interpret. They write or accept one considered question. The original wording stays. Images are requested only by an explicit action, as a small set of full-size candidates that differ in metaphor. Candidates are temporary. If the considered question changes, those images remain attached to the earlier wording and are not presented as a reading of the new text.

### Distil — name what matters

Pair the chosen image with a one- or two-word title for the metaphor, not a shortened caption of the question. The concept remembers the question or questions that informed it. The title can be edited later. Saving means "worth returning to."

## 4. The Library of Curiosities

The Library of Curiosities is an archive of visual concepts. Concepts are never completed. They remain open to revisiting, renaming, connecting, and developing.

The Library is not a finished-work screen, a checklist of achievements, or the end of a required pipeline. A concept in the Library means the person wants to keep it and come back. Prefer "kept", "in your library", "return to this", and "still unfolding." Do not use "completed concepts" or "finished work."

Questions that have not become a visual concept live in the workspace, not as trophies in the Library. Counts anywhere in the product are counts of current items, not scores.

## 5. Questions and visual concepts

A question has two texts:

- **Original text** is the capture. Developing the considered question leaves it in place. Correcting the capture is a separate, explicit action.
- **Considered text** is the question an image interprets. The person can write it or accept one proposal. It may match the original.

A visual concept is the thing the Library archives: one selected image, a one- or two-word title, and the questions that informed it. The relationship is many-to-many. One question may inform many concepts. One concept may be informed by many questions. Candidate images exist only for the comparison in progress. Rejected candidates are not saved.

A concept is its own record. Editing, parking, or removing a source question leaves the concept in the Library, still open. The concept keeps the considered wording the image was made for, so a later edit of a question does not silently rewrite that image. While a question still exists, the link shows that it informed the concept, including the original wording as it stood when it was linked. Parking does not drop the concept. Removing a question drops only that link.

The simplest model that supports this is three kinds of record: `questions` for the live texts, `concepts` for the image, the title, and the wording the image was made for, and `concept_questions` for the many-to-many link and its provenance snapshot. There is no completed state on a concept. That shape is the recommendation. Column names, keys, and delete mechanics stay provisional until reviewed. See `ENTITY_RELATIONSHIP_MODEL.md`. Do not treat the earlier image columns on `questions` as the model.

Stopping after Gather, after Curate, or after a considered question is a valid way to leave the work. None of those states is a failure, and none of them is required before the others can be opened.

## 6. Supporting capabilities

**Themes** are optional labels for grouping questions. A question can be in none, one, or several. A theme can be empty. Creating, renaming, or deleting a theme does not change question text or a visual concept. Optional themes are already approved for the initial schema, through `themes` and `theme_questions`. They are not a step the person must take in Gather, Curate, Visualise, or Distil.

**Investigations**, in the interface the Lab, are optional and later. A person opens the Lab to test a hunch or develop an idea across questions. The Lab can hold notes, hypotheses, tests, observations, and discoveries. An investigation item of kind `concept` is a written thought inside the Lab. It is not a Library visual concept and it does not own the image. The Lab is not a fifth stage and is not required before Visualise or Distil.

**The Curiosity Shelf** can hold ideas close at hand. It is not specified as storage yet.

**Storytelling** can be reconsidered after visual concepts exist. The V1 Story workflow — slide arrangement and a locally exported silent portrait video — is not part of this release.

**Out of the garden**, because they turn curiosity into a mode, a rank, or a score:

- Quickfire and Focus as exploration modes, including central and satellite roles
- Question hiding and priority
- A questions-per-minute gauge
- An exploration container and its backdrop image
- Dead plants, missed-day penalties, streaks, and leaderboards

Gather still welcomes quantity. What stays out is the machinery that scored or ranked that quantity.

## 7. Initial release

**Validate before treating the image path as settled**

- The cycle from a raw question to a visual concept, judged by the rubric in section 8.
- A prompt and model pairing that can produce an image worth keeping.
- A comparison and titling interaction that is short and still careful.

**Workspace already explored in the browser prototype**

Gather, Curate, Visualise, and Distil, with concepts kept only in this browser. That prototype is not the database design.

**Database, proposed and not applied**

- Accounts in the new Supabase project.
- Questions, with original text, considered text, and the prototype's curation states. Merge is a pointer.
- Visual concepts and `concept_questions`, in the many-to-many shape in section 5. The proposed columns are in the migration above. They are not the image columns on `questions`.
- Optional themes: `themes` and `theme_questions`.
- One private bucket, `concept-images`, for the selected image.
- Owner-scoped row-level security from the start.

**After the cycle is usable**

- Theme screens, when grouping is useful. The tables do not wait on those screens, and the screens are not a required stage.
- The Lab, still without item images, and still not a gate.
- Any storytelling that starts from visual concepts.

**Outside this release**

- Importing V1 accounts, rows, or files.
- Persisting candidate images, story media, focus backdrops, or investigation thumbnails.
- Public sharing, music, narration, galleries, and screensavers.
- A ratings table, a generation log, or a job queue.

## 8. Image quality

Compelling images are a product risk. A schema cannot create them. Persistence stores the image the person chose to return to. Prompting, the model, and the comparison screen determine whether that image was worth keeping.

### What the image is for

The image interprets the considered question's tension or shift in perspective. It uses one dominant, specific metaphor. It should still feel meaningful at a large size. It is not an illustration of the nouns in the sentence, and it is not evidence for a claim.

The title is a one- or two-word handle on that metaphor. It is for recognition later. It is not a compressed restatement of the question, and it does not close the concept.

### How a generation is made

These are evaluation rules for the prompt experiments, not a claim that the first wording is final:

- The request is sent only after an explicit action.
- The considered question is the subject. The original text may travel with it as tone, clearly secondary.
- Ask for one metaphor, visually specific, with emotional weight.
- Ask the set to differ in metaphor.
- Exclude rendered text, logos, watermarks, infographic layout, and stock tropes: lightbulbs, generic silhouettes at a horizon, flat corporate illustration, clip-art icons, and a person paired with a question mark.
- Store the selected file in the format the model returned when that format is PNG, JPEG, or WebP. Do not convert it into a thumbnail.
- Show the set large enough that composition and mood can be judged.

The stored-file ceiling in the proposed schema is 8 MiB, for PNG, JPEG, or WebP. Four images in a set, and the provider and its retention terms, still need confirmation. Section 10 lists the open decisions.

The kept concept should remember `image_model` and `prompt_version` on the concept record. The version is a short label for the template in source control. The prompt body is not copied into the database. Those columns are in the proposed migration. That file has not been applied.

### How quality will be judged

Use a fixed review set of about eight to twelve of the product owner's own questions, covering abstract, personal, and concrete subjects. For each question, run the current prompt and model, then score every image by hand. Do not treat a successful database test as an image-quality test.

Each score is 0, 1, or 2:

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| Conceptual relevance | Misses the question, or pictures a noun from it | Related, and still generic | Someone who knows the considered question can feel why this image exists |
| Distinctiveness and resonance | Interchangeable with stock | Pleasant and forgettable | The person would look again because the question feels slightly different |
| Stock avoidance | Uses a listed trope or a template look | Avoids the tropes and still looks like a default model style | Specific |
| Title | Generic, or longer than two words | Accurate and flat | Memorable, and tied to this image's metaphor |
| Time to a kept result | Record minutes from a new capture to an image they would actually keep, and note where the wait or the extra step was | | |

A prompt and model candidate is good enough to build on when, across the review set, median relevance and distinctiveness are 2, stock avoidance is never 0, and the reviewer would keep at least half of the questions without an immediate regenerate. That bar is for the validation phase. Keeping an image does not mean the concept is completed.

Change one of prompt, model, or comparison layout at a time. Once the product is saving concepts, group them by `prompt_version` and `image_model` to see which pairing people actually keep. The review notes stay outside the product until a later decision asks for in-product ratings.

### What the interface owes the image

- The considered question stays visible while images are generated and compared.
- Regenerating asks for a new set and leaves the current set in place until the new one arrives.
- Saving is one step after a choice and a title, and the result stays open in the Library.
- The Library shows a recognizable image, the title, and, on open, the wording the image was made for and the questions that still inform it.
- Editing, parking, or removing a source question leaves the concept in the Library. The screen keeps the wording the image was made for. It does not delete the concept, and it does not mark it finished.
- Choosing a replacement image requires a title for that image before the replacement is saved.

## 9. Behaviour around AI

- Opening a screen does not call a model.
- Question help sends the original text, and the current considered text when the person is asking for another proposal. It does not send the rest of the workspace.
- Image generation sends the considered question and, as secondary tone, the original text.
- The proposal is one considered question: the same uncertainty, made specific enough to picture, with no added facts and no list of tasks. The person accepts it, edits it, or discards it. Nothing is written until they do.
- Duplicate hints that are only text matches say so. They are not described as a model reading.
- Title help, when asked, returns one- or two-word options tied to the chosen image's metaphor. The field stays empty until the person types or accepts one.
- Generated text and images are not marked as observations, test results, or discoveries.
- Provider secrets stay on the server. The browser uses the signed-in person's session when an account exists. Until then, the prototype says it is stored only in the browser.

Question help and image generation are specified in `USER_JOURNEYS.md`.

## 10. Decisions that need confirmation

The many-to-many relationship in section 5 is adopted. Optional themes are in the proposed migration. That migration is written and has not been applied. The items below are not confirmations to create a project or to run SQL.

1. **Apply the concept tables.** The proposed shape is `concepts` plus `concept_questions`, with the image and the wording it was made for on the concept, and provenance snapshots on the link. A removed question sets the live link to null and leaves the snapshots. Applying `supabase/migrations/20261026000000_initial_v2_schema.sql` still needs an explicit yes.
2. **Investigation tables** wait. The Lab is optional and is not part of the four-stage cycle. An investigation item kind called `concept` must not be confused with a Library visual concept. Whether that kind is renamed is open.
3. **No exploration entity.** Quickfire, Focus, hiding, priority, and the questions-per-minute gauge stay out. Gather is the quantity stage and does not bring those mechanics back.
4. **The Story / MP4 workflow** stays out. Later storytelling, if any, starts from visual concepts in the Library.
5. **Four images** in a comparison set.
6. **Stored image ceiling of 8 MiB** is the schema default for the private `concept-images` bucket: PNG, JPEG, or WebP, no thumbnail conversion. Creating the project and applying the migration still need an explicit yes.
7. **Image provider, model, and retention terms** are chosen before the next live generation. The rubric is how that choice is accepted or rejected.
8. **Authentication** is email and password on the new project, when that project is created. Accounts are new. This does not import V1 users.
9. **One considered-question proposal** at a time, then edit or regenerate.
10. **Title suggestions** appear only when the person asks.
11. **The Curiosity Shelf** is an experience idea. It has no table until someone specifies what it stores.
12. **Question curation.** The proposed schema stores `gathered`, `retained`, `parked`, and `discarded`, and stores a merge as `merged_into_id`. That matches the prototype. Applying it still needs the same yes as the rest of the migration.

## 11. Implementation sequence

1. **Prove the image.** Run the review set against prompt and model candidates. Adjust until the rubric in section 8 passes. This step does not need the V2 schema.
2. **Keep the four-stage workspace honest.** Gather is fast, Curate is reversible, Visualise is explicit, Distil names a concept, and the Library is an open archive. The browser prototype is a place to learn this, not a schema.
3. **Review the proposed concept tables** in `supabase/migrations/20261026000000_initial_v2_schema.sql`, then apply them only after an explicit yes. Do not migrate the earlier image columns on `questions`. Themes stay optional in the journey. The SQL has not been executed.
4. **Add theme screens** when grouping is useful. Those screens are not a required stage.
5. **Add the Lab** in a later release. No item thumbnails. No requirement to investigate before an image.
6. **Revisit storytelling** only if visual concepts are strong enough that arranging them would add something one concept does not.

Do not start the database at step 2 with a provider and prompt that have not been scored. Do not treat the Library as the last required step of a pipeline.
