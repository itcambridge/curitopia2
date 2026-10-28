# Curitopia V2 product vision

**Status:** Working product direction. Experience, tone, and the four-stage cycle follow `Curitopia_Garden_Experience_Framework.md`.  
**Persistence:** The deployed account model is `supabase/migrations/20261026000000_initial_v2_schema.sql`. Questions and visual concepts are many-to-many through `concept_questions`. Optional themes are `themes` and `theme_questions`. There is no persisted relationship between two concepts. `docs/schema-inventory/proposals/v2-revised-schema-proposal.md` is the earlier image-on-question sketch and must not be executed.  
**Companions:** `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, `ENTITY_RELATIONSHIP_MODEL.md`. AI title help is specified in section 9 and is requested from Distil. Connecting two concepts is a future journey in `USER_JOURNEYS.md`.  
**Out of scope for this document:** application changes, SQL, V1, and secrets.

V2 has its own Supabase project, its own accounts, and its own private storage. V1 stays as it is. A V1 account, row, or file is not present in V2 unless a later import is explicitly approved.

## 1. Product intent

Curitopia is a personal place to nurture curiosity. It helps a person move from an unfinished thought to a considered question, then to a compelling image with a one- or two-word title.

The emotional centre is a garden: evolving curiosity, not a productivity score. The working cycle is repeatable and optional at every step:

**Gather → Curate → Visualise → Distil.**

In the garden’s language: sow freely, tend what matters, see what unfolds, name what matters.

The payoff is a concept worth returning to. A concept is the central unit of the Library of Curiosities. It is not merely an image, and it is not a saved question. It is a visual expression of an idea: one compelling image, a title of one or two words, and provenance linking it to one or more questions.

The image makes the idea tangible. The title makes it easy to remember, to say, and to set beside another concept. Together they ask the person to simplify a complex thought without losing what matters in it. Some influential ideas travel because they can be said in a few memorable words. Curitopia should help someone find that kind of expression for their own idea. It should not stamp a simplistic label on a complex subject.

A title of one word is entirely valid. Two words are the maximum. Brevity is not enough. The title should carry the essence of the idea, stay memorable, and still mean something later without the conversation that produced it. The image and the title work together. A generic, literal, or interchangeable title fails when it could sit under hundreds of other images and add nothing to this one.

“Spacetime Fusion” and “Russian Blackholes” are examples of that kind of handle: short enough to recall, and specific enough to suggest an idea rather than a caption. They illustrate the principle. They are not a required shape, and they are not a claim about physics.

A generic illustration, a decorative backdrop, or a small thumbnail is a failed image even when it arrives quickly. Saving a concept means it is worth returning to. The person can revisit it, retitle it, reinterpret it, and connect it. A concept is never marked completed.

Speed matters as the absence of extra steps. It does not outrank thoughtfulness or image quality, and it is not a score.

The earlier promise, "Ask. Experiment. Create.", put investigation and a story export at the centre. Investigation remains an optional later capability, the Lab. It is not a stage of this cycle and not a gate in front of an image.

## 2. The garden

The garden shows how curiosity is taking shape. It is not a streak, a level, or a questions-per-minute gauge.

| Garden | In the workspace |
|---|---|
| Seed | A question just captured, in its original wording |
| Shoot | A question the person retains for more attention |
| Branch | A relationship the person makes, including a merge that keeps every original wording |
| Blossom | A concept they choose to keep: a meaningful image, a one- or two-word title, and the question or questions that informed it |
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

The person arrives with the image they chose, the considered wording that image was made for, and the source questions. Distil is where that material becomes a concept. The title names the idea, not a shortened caption of the question. One word is valid. Two words are the maximum.

Title help, when the person asks for it, is specified in section 9. Suggestions stay beside the field until the person selects one, edits one, or writes their own. Nothing is saved until they explicitly save the concept to the Library. Saving means "worth returning to." The title can be changed later on that same concept.

## 4. The Library of Curiosities

The Library of Curiosities is a collection of concepts: compact, memorable mental objects a person can revisit, compare, and connect. It is more than an archive of saved images. Each concept keeps its image, its title, and its provenance. Concepts are never completed. They remain open to revisiting, retitling, reinterpreting, connecting, and developing.

The Library is not a finished-work screen, a checklist of achievements, a productivity system, or the end of a required pipeline. A concept in the Library means the person wants to keep it and come back. Prefer "kept", "in your library", "return to this", and "still unfolding." Do not use "completed concepts" or "finished work."

A later Connect activity, described in `USER_JOURNEYS.md`, lets the person choose two concepts and explore what happens when they are brought together. That activity is not part of the current Library, and it has no table.

Questions that have not become a visual concept live in the workspace, not as trophies in the Library. Counts anywhere in the product are counts of current items, not scores.

## 5. Questions and visual concepts

A question has two texts:

- **Original text** is the capture. Developing the considered question leaves it in place. Correcting the capture is a separate, explicit action.
- **Considered text** is the question an image interprets. The person can write it or accept one proposal. It may match the original.

A visual concept is the thing the Library archives: one selected image, a title of one or two words, and the questions that informed it. The image and the title are one expression. The title is not a filename, a caption, or a compressed copy of the question. The relationship to questions is many-to-many. One question may inform many concepts. One concept may be informed by many questions. Candidate images exist only for the comparison in progress. Rejected candidates are not saved. Title suggestions are not saved either, until the person puts one into the title and saves the concept.

A concept is its own record. Editing, parking, or removing a source question leaves the concept in the Library, still open. The concept keeps the considered wording the image was made for, so a later edit of a question does not silently rewrite that image. While a question still exists, the link shows that it informed the concept, including the original wording as it stood when it was linked. Parking does not drop the concept. Removing a question drops only that link.

The account model is three kinds of record: `questions` for the live texts, `concepts` for the image, the title, and the wording the image was made for, and `concept_questions` for the many-to-many link and its provenance snapshot. There is no completed state on a concept, and no relationship between two concepts. See `ENTITY_RELATIONSHIP_MODEL.md`. Do not treat the earlier image columns on `questions` as the model.

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
- A comparison and titling interaction that is short and still careful. AI title suggestions, specified in section 9, are a proposed aid. They are not required for this validation, and they have not been tested.

**Workspace**

Gather, Curate, Visualise, Distil, and the Library. For a signed-in account, saved questions and saved concepts are account records. Candidate images stay in the browser until the person saves one concept. Older browser copies of concepts are not the Library.

**Database, deployed**

- Accounts in the V2 Supabase project.
- Questions, with original text, considered text, and the curation states. Merge is a pointer.
- Visual concepts and `concept_questions`, in the many-to-many shape in section 5. They are not the image columns on `questions`.
- Optional themes: `themes` and `theme_questions`.
- One private bucket, `concept-images`, for the selected image.
- Owner-scoped row-level security.
- No table that relates one concept to another. That design is open. See section 10.

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

The title is a one- or two-word handle on the idea the image is carrying. It is for recognition later, including when the concept sits beside others in the Library. It is not a compressed restatement of the question, and it does not close the concept.

A useful title is:

- **Concise.** One or two words, never more. One word is enough when it carries the idea.
- **Distinctive.** Not a generic phrase that could name hundreds of concepts.
- **Evocative.** It invites another look, rather than only describing the picture.
- **Faithful.** It keeps the essential idea. It does not invent a meaning the question and the image do not support.
- **Memorable.** Easy to recall, say, and use in conversation.
- **Useful beside another concept.** Meaningful enough that two titles can be compared or connected.

Do not force every title into a metaphor. Do not prefer obscure wording for its own sake. Cleverness is not a substitute for clarity. “Spacetime Fusion” and “Russian Blackholes” show how a short title can stay specific. They are examples, not a pattern to copy.

The application and the database both reject a title of more than two words. A suggestion that fails that check is dropped. It must not be stored by bypassing the check, and it must not block the person from typing a valid title.

### How a generation is made

These are evaluation rules for the prompt experiments, not a claim that the first wording is final:

- The request is sent only after an explicit action.
- The considered question is the subject. The original text may travel with it as tone, clearly secondary.
- Ask for one metaphor, visually specific, with emotional weight.
- Ask the set to differ in metaphor.
- Exclude rendered text, logos, watermarks, infographic layout, and stock tropes: lightbulbs, generic silhouettes at a horizon, flat corporate illustration, clip-art icons, and a person paired with a question mark.
- Store the selected file in the format the model returned when that format is PNG, JPEG, or WebP. Do not convert it into a thumbnail.
- Show the set large enough that composition and mood can be judged.

The stored-file ceiling is 8 MiB, for PNG, JPEG, or WebP. Four images in a set, and the provider and its retention terms, still need confirmation. Section 10 lists what is established, what is proposed, and what is open.

The kept concept remembers `image_model` and `prompt_version` on the concept record. The version is a short label for the template in source control. The prompt body is not copied into the database. Title suggestions do not get their own columns.

### How quality will be judged

Use a fixed review set of about eight to twelve of the product owner's own questions, covering abstract, personal, and concrete subjects. For each question, run the current prompt and model, then score every image by hand. Do not treat a successful database test as an image-quality test.

Each score is 0, 1, or 2:

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| Conceptual relevance | Misses the question, or pictures a noun from it | Related, and still generic | Someone who knows the considered question can feel why this image exists |
| Distinctiveness and resonance | Interchangeable with stock | Pleasant and forgettable | The person would look again because the question feels slightly different |
| Stock avoidance | Uses a listed trope or a template look | Avoids the tropes and still looks like a default model style | Specific |
| Title | Generic, interchangeable, or longer than two words | Accurate and flat | Concise, faithful, and memorable beside this image |
| Time to a kept result | Record minutes from a new capture to an image they would actually keep, and note where the wait or the extra step was | | |

A prompt and model candidate is good enough to build on when, across the review set, median relevance and distinctiveness are 2, stock avoidance is never 0, and the reviewer would keep at least half of the questions without an immediate regenerate. That bar is for the validation phase. Keeping an image does not mean the concept is completed.

Title suggestions, once they exist, can be reviewed on a small set of representative concepts rather than on every generation. Score each suggestion with the six qualities above, and discard any that are not one or two words. Note whether the three suggestions in a set are genuinely different readings or three small variations of one phrase. Concepts already used to discuss this idea, such as ones titled “Spacetime Fusion” and “Russian Blackholes”, are suitable examples in that set. They are not a required naming style. This review has not been run. Do not treat the current image rubric as evidence that AI-written titles are good.

Change one of prompt, model, or comparison layout at a time. Once the product is saving concepts, group them by `prompt_version` and `image_model` to see which pairing people actually keep. The review notes stay outside the product until a later decision asks for in-product ratings.

### What the interface owes the image

- The considered question stays visible while images are generated and compared.
- Regenerating asks for a new set and leaves the current set in place until the new one arrives.
- Saving is one step after a choice and a title, and the result stays open in the Library.
- The Library shows a recognizable image, the title, and, on open, the wording the image was made for and the questions that still inform it.
- Editing, parking, or removing a source question leaves the concept in the Library. The screen keeps the wording the image was made for. It does not delete the concept, and it does not mark it finished.
- Choosing a replacement image requires a title for that image before the replacement is saved. The current Distil screen does not replace the image on an existing concept. Keeping another image adds a concept, and the earlier one stays. Replacement remains specified here and is not what the screen does.

## 9. Behaviour around AI

- Opening a screen does not call a model.
- Question help sends the original text, and the current considered text when the person is asking for another proposal. It does not send the rest of the workspace.
- Image generation sends the considered question and, as secondary tone, the original text.
- The proposal is one considered question: the same uncertainty, made specific enough to picture, with no added facts and no list of tasks. The person accepts it, edits it, or discards it. Nothing is written until they do.
- Duplicate hints that are only text matches say so. They are not described as a model reading.
- Generated text and images are not marked as observations, test results, or discoveries.
- Provider secrets stay on the server. The browser uses the signed-in person's session.

Question help and image generation are specified in `USER_JOURNEYS.md`.

### Title help in Distil

Distil has a Suggest titles control. Opening Distil does not call a model, does not choose a title, and does not save a concept. The quality of the suggestions has not been reviewed.

When the person asks:

1. They have already chosen an image in Visualise and come to Distil with that image, the considered wording it was made for, and the source questions.
2. Curitopia proposes three title candidates. Each is one or two words.
3. The three should be meaningfully different readings where the material supports that. They should not be three small variations of one phrase.
4. The person selects a candidate, edits it, asks for another set, or writes a title without using any of them.
5. The person explicitly saves the concept to the Library.

Suggestions are recommendations. The person owns the final wording. The product must not select a title for them, overwrite a title they have edited, or save a concept without that explicit save. Manual entry stays available even while a request is in flight.

A suggestion is temporary. It is not the concept's stored title until the person adopts it and saves. Asking for another set does not regenerate the image and does not call the image-generation path. Title help must not incur an image-generation charge. After a concept is saved, changing the title updates that concept. It does not create a second concept, and a later model or prompt must not rename saved concepts on its own.

What the suggestion should consider:

- The considered question or questions behind the concept.
- The selected image and the metaphor direction already used to make it.
- What the image communicates beyond a literal depiction of the topic.
- The central tension, relationship, surprise, or insight.
- That the title may later be seen beside other concepts in the Library.

Question help is a separate chat completion. Its user message is question text, and a missing or failed call falls back to a local demo scaffold. Title help is also a chat completion, and it does not use that scaffold as a title. Image generation is a separate request and is not used to name a concept. The selected image is attached only for a model this application has confirmed can accept one, and only when the file is a PNG, JPEG, WebP, or GIF. `gpt-6-luna` is confirmed. A demo drawing is not attached. An unconfirmed model id receives the wording and metaphor only, and the screen says the image was not shown.

If the text model is missing, times out, returns a malformed response, or offers only weak or invalid suggestions, the person can still save a concept with a title they typed, provided it passes the one- or two-word check. Invalid suggestions are discarded. They do not bypass validation.

### Proposed help when connecting two concepts

Also not built. If a later Connect activity asks a model for perspectives, those perspectives are suggestions. The person can accept, edit, reject, or record one, and can plant a new question from it. The model does not decide what the person must think. That activity is in `USER_JOURNEYS.md`. It does not add a table by itself.

## 10. Decisions

**Established**

- Questions and visual concepts are many-to-many through `concepts` and `concept_questions`. A removed question clears the live link and leaves the snapshots. The concept stays open.
- A title is one or two words, at most 40 characters, with a single ordinary space if there are two. The application and the database both enforce it.
- Optional themes are `themes` and `theme_questions`. They are not a required stage.
- There is no exploration entity. Quickfire, Focus, hiding, priority, and the questions-per-minute gauge stay out.
- The Story / MP4 workflow stays out.
- The private `concept-images` bucket stores the selected image, up to 8 MiB, as PNG, JPEG, or WebP. There is no thumbnail conversion.
- Authentication is email and password on the V2 project. V1 accounts are not imported.
- One considered-question proposal at a time, then edit or ask again.
- Curation states are `gathered`, `retained`, `parked`, and `discarded`. A merge is `merged_into_id`.
- A concept is never completed.

**Built, and not yet reviewed for quality**

- Title suggestions in Distil, as specified in section 9. They appear only when the person asks. They are not the stored title until the person saves.
- The selected image is sent only when the configured text model is one this application has confirmed can accept an image. For `gpt-6-luna`, the image is included when the file is a PNG, JPEG, WebP, or GIF. A demo drawing is not sent. Other model ids are not given the image until their capability is confirmed.

**Still open**

1. **How two concepts are connected.** The person should be able to choose two concepts and explore a shared question, a similarity, a tension, or a new question. The current schema cannot store that relationship. `concept_questions` links concepts to questions, not concepts to concepts. The relationship model is designed when Connect is scheduled. Do not add a table, a type list, or a migration in advance.
2. **Investigation tables** wait. The Lab is optional and is not part of the four-stage cycle. An investigation item kind called `concept` must not be confused with a Library visual concept. Whether that kind is renamed is open.
3. **Four images** in a comparison set. The screen asks for four. Treating four as a permanent product rule is still a confirmation.
4. **Image provider, model, and retention terms.** The application can call a configured text model and a separate image generation. Which provider is kept, and what it retains, is still a product decision. The rubric is how an image choice is accepted or rejected.
5. **The Curiosity Shelf** is an experience idea. It has no table until someone specifies what it stores.
6. **Image replacement on an existing concept.** The documents describe it. The current screen adds a new concept instead. Whether replacement is still wanted is open.

## 11. Implementation sequence

1. **Prove the image.** Run the review set against prompt and model candidates. Adjust until the rubric in section 8 passes. This step does not need the V2 schema.
2. **Keep the four-stage workspace honest.** Gather is fast, Curate is reversible, Visualise is explicit, Distil names a concept, and the Library is an open archive. The account stores saved concepts. It does not store candidate images or unsaved titles.
3. **Keep the deployed concept tables as they are.** Do not migrate the earlier image columns on `questions`. Themes stay optional in the journey. Do not add a concept-to-concept table until Connect is scheduled and the relationship is designed.
4. **Add theme screens** when grouping is useful. Those screens are not a required stage.
5. **Add title suggestions** only after the configured text model is checked, including whether it can accept the selected image. Until then, Distil keeps manual titles. Do not call image generation to produce a title.
6. **Add the Lab** in a later release. No item thumbnails. No requirement to investigate before an image.
7. **Add Connect** as an exploratory return to two existing concepts, after its relationship model has been decided. It is not a fifth stage and not a knowledge graph.
8. **Revisit storytelling** only if visual concepts are strong enough that arranging them would add something one concept does not.

Do not start the database at step 2 with a provider and prompt that have not been scored. Do not treat the Library as the last required step of a pipeline.
