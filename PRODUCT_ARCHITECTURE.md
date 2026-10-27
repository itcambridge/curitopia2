# Curitopia Product Architecture

**Status:** Working architecture for V2. Experience and tone follow `Curitopia_Garden_Experience_Framework.md`. Scope, the image-quality rubric, and the title rubric live in `PRODUCT_VISION.md`.  
**Persistence:** The deployed account model is `supabase/migrations/20261026000000_initial_v2_schema.sql`. Questions and visual concepts are many-to-many. A concept stays in the Library when a source question is edited, parked, or removed. Optional themes are `themes` and `theme_questions`. There is no table relating two concepts. `docs/schema-inventory/proposals/v2-revised-schema-proposal.md` is the earlier image-on-question sketch and is not a migration.  
**Journeys and entities:** `USER_JOURNEYS.md`, `ENTITY_RELATIONSHIP_MODEL.md`.  
**Earlier schema drafts** in `docs/schema-inventory/proposals/` are historical. They are not deployable.

This document does not authorise application changes, new SQL, or any edit to V1.

## 1. Design driver

The garden is one workspace. The four stages are how a person moves through it. The Library of Curiosities is where a visual concept stays open, not where the work is declared done.

1. **Gather.** Capture questions without losing the original wording.
2. **Curate.** Keep, park, discard, restore, or merge, with provenance intact.
3. **Visualise.** Develop a considered question and explicitly compare a small set of images.
4. **Distil.** Name the chosen image with one or two words and remember which questions informed it. A title is part of the concept, not a caption. Suggestions, when they exist, are not the saved title.
5. **Return.** Reopen the concept from the Library, retitle it, reinterpret it, or develop it. A later Connect activity can bring two concepts together. That return is not a completion ceremony.

A table, a step, or a stored state earns a place by serving that cycle or by being an optional support that does not sit in front of it. Themes are optional. The Lab, meaning investigations, is the optional deeper support and is not a stage. Story export is neither.

The garden expresses evolving curiosity. Counts are counts of items. They are not a score, a streak, or a questions-per-minute gauge.

## 2. Principles

1. **The original wording survives consideration and merges.** The considered question is a second text. A merge keeps every source wording.
2. **A concept is the kept artefact.** It holds one meaningful image, a title of one or two words, the wording that image was made for, and links to the questions that informed it. The image makes the idea tangible. The title makes it memorable and connectable. One word is valid. A generic title that does not add meaning to the image is a failed title. One question may inform many concepts. One concept may draw on many questions. It is not an attachment on a question or on a Lab item.
3. **Saved does not mean completed.** A concept in the Library can be revisited, retitled, reinterpreted, connected, and developed. Editing, parking, or removing a source leaves the concept open. The product has no completed-concept state. Retitling updates the existing concept. It does not create another, and a newer model must not rename it unasked.
4. **Candidates are temporary.** They last for the comparison. They are not Library records. If the considered question changes, the set stays tied to the wording that was sent.
5. **Quality is a prompt, model, and interface problem.** The concept record remembers which model and prompt version produced a kept image. It does not score images, it does not store rejected ones, and it does not store unused title suggestions.
6. **The Lab is optional.** A question can be visualised with no theme and no investigation. Opening the Lab is not required before an image.
7. **Evidence and speculation stay distinct inside an investigation.** That distinction matters when the Lab exists. It does not gate image generation. An image is not an observation, a test, or a discovery. A Lab item of kind `concept` is a written note, not a blossom in the Library.
8. **Private by default.** Questions, concepts, themes, investigations, and image files belong to the signed-in person. Export or sharing is a later decision.
9. **No scored growth.** The garden does not wither, penalise a pause, or rank the person. Quickfire, Focus, hiding, priority, and a questions-per-minute table are not part of the model.
10. **The person owns the work directly.** An exploration container, a mode, a central question, and a backdrop image are not part of the model.

## 3. Product surfaces

These are responsibilities. Stage navigation is persistent, and every stage can be opened without finishing another.

The shell keeps the warm editorial system: cream and paper, coral accent, serif display, field-notes voice. The garden metaphor is the continuity. Control labels stay plain.

### Workspace

One place for the cycle. It shows the current garden in ordinary counts: questions gathered, questions retained, concepts in the Library. Saved questions and concepts belong to the signed-in account. Candidate images do not.

### Gather, Curate, Visualise, Distil

The four work areas in `PRODUCT_VISION.md` section 3. Gather is fast and list-centred. Curate is selective and reversible. Visualise is image-led. Distil is the composition of image, title, and source questions. The title field is always editable. A future suggestion control may offer three one- or two-word candidates when the person asks. Those candidates are temporary. Saving is the only way one of them becomes the concept title.

### Library of Curiosities

The collection of concepts. It shows the image and the title at a size that can be recognized, and on open the wording the image was made for and the questions that still inform it. It is an open, evolving collection of mental objects, not a pile of image files and not a knowledge graph. It does not hold every captured question, and it has no achievement state. A concept remains open after it is saved, including after a source question changes or goes away. A future Connect surface may start here, by the person choosing two concepts. That surface is not in this release.

### Themes

Optional grouping of questions, already included in the initial schema as `themes` and `theme_questions`. A theme is not a required stage. Manual first. A later suggestion must be explicit and reversible. Membership does not copy question text. Dissolving a theme leaves the questions and any concepts.

### The Lab

A later surface for deliberate thinking across questions: notes, hypotheses, tests, observations, and discoveries, plus a written item kind `concept` that is not a visual concept. One investigation can relate to several questions. Items do not carry images. The Lab supports the garden. It is not the way into Visualise.

The entity sketch is in `ENTITY_RELATIONSHIP_MODEL.md`. The Lab is not in the deployed schema. That schema does include questions, concepts, and optional themes.

### Later storytelling

If it is built, it arranges visual concepts that already have an image and a title. It is not specified in this release. The previous Story model — a browser-only slide draft and a locally encoded silent MP4 — is not a requirement to preserve.

## 4. Repository state

The V2 application is the four-stage workspace and the Library for a signed-in account. Saved questions and saved concepts come from that account. Candidate images, and any future title suggestions, stay temporary until the person saves a concept. An earlier home screen counted questions per minute and offered an experiment action. That screen is not the specification. The questions-per-minute gauge stays out of the product.

V1, including its Supabase project, is outside this repository and is not a source of rows or files for V2.

## 5. Data boundaries

The deployed columns are in `supabase/migrations/20261026000000_initial_v2_schema.sql` and explained in `docs/schema-inventory/proposals/v2-initial-schema-proposal.md`. Candidate drafts can still sit in the browser. Saved concepts do not.

- **Question** is owned by the person. It holds live `original_text`, optional `considered_text`, and `disposition` of `gathered`, `retained`, `parked`, or `discarded`. A merge is `merged_into_id`, not a fifth disposition. Editing those texts does not rewrite a concept. The prototype does not hard-delete questions.
- **Visual concept** is an independent Library record: `image_path`, a one- or two-word `title`, `image_model`, `prompt_version`, and `for_considered_text`. It has no completed state, no anchor column, and no required surviving question. Saving another chosen image creates another concept, so one question can inform many. A demo fixture in the browser can have a data URL and no model. Those fixtures are not rows. There is no column for a title suggestion.
- **Concept link** is `concept_questions`. It stores snapshots of the source question's original and considered wording. Parking leaves the link. Removing the question sets `question_id` to null and leaves the concept, the image path, and the snapshots.
- **Theme** is an optional label. `themes` and `theme_questions` join a theme and a question that share an owner. A question needs no theme. Theme names are unique per owner, ignoring case and surrounding spaces. There is no description column and no theme screen yet. A duplicate should be shown as "You already have a theme with this name."
- **Kept image file** lives in the private bucket `concept-images`, at `{user_id}/{concept_id}/{filename}`. The limit is 8 MiB, for PNG, JPEG, or WebP. Only the image the person saves is uploaded. A failed save removes the new object through the Storage API when it can, and reports a cleanup failure when it cannot. The application does not delete `storage.objects` with SQL. There is no thumbnail bucket. Replacing the image on an existing concept is not the current save path.
- **Investigation, investigation link, and investigation item** are the later Lab. Item kinds stay `concept`, `note`, `hypothesis`, `test`, `observation`, and `discovery`. Items have no image path. The kind `concept` here is not a Library visual concept.
- **Absent on purpose:** explorations, focus images, investigation thumbnails, story tables, story buckets, a `visions` table, hidden and priority flags, Quickfire/Focus columns, a questions-per-minute table, candidate-image rows, title-suggestion rows, any completed-concept flag, and any link from one concept to another. The last absence is a future design, not a decision that concepts must stay isolated. See section 7.

Row level security is enabled for `authenticated` and scoped by `auth.uid()`. The browser uses the signed-in JWT. It does not use a service-role client. Writing this section does not authorise new SQL.

## 6. AI boundaries

- No model call is implied by navigation, by typing in Gather, by accepting a considered question, or by arriving in Distil with an image.
- Send the smallest context the action needs. Question help sends the question text. Image generation sends the considered question and, as secondary tone, the original text. It is a separate images request. Title help must not use that request.
- Do not send the rest of the workspace, theme names, or investigation items for those actions.
- A proposal is written only after the person accepts it or edits it into place. Capture text is never overwritten by a proposal. A title suggestion is never written over a title the person has edited, and it is never saved for them.
- Image and title generation must not invent empirical claims or present the picture as proof.
- Model calls and secrets stay server-side. The client uses the signed-in session when an account exists.
- Provider choice and whether that provider retains prompts or images are a product decision in `PRODUCT_VISION.md`. They are not settled by this architecture.

**Title help is proposed, not built.** The text path that exists today is a chat completion. The configured model id is an environment setting. The user message is text. If the key or model is absent, or the call fails, question help shows a local demo scaffold and does not retry. That path does not propose titles and does not attach an image. Image generation is a different endpoint and a different cost. Do not call it to name a concept.

When title help is built, a request should consider the considered wording, the metaphor direction already stored with the selected image, and the source questions. Include the image itself only if the configured text model is known to accept image input. That capability is not recorded in the current client. Do not assume a model name or a multimodal API. Three suggestions, each one or two words, validated with the same check the database uses. Invalid suggestions are dropped. A timeout, a missing model, a malformed response, or a weak set leaves manual entry available and does not block a valid save. Another set of suggestions does not regenerate the image. Suggestions live in the screen until the person saves a title. They are not a table.

The rubric for images, and the six qualities of a title, are in `PRODUCT_VISION.md`. Architecture does not add a second rubric. AI title quality has not been tested.

## 7. Concept connections, not yet a schema

`concept_questions` records which questions informed a concept. It does not record a relationship between two concepts. Connect, in `USER_JOURNEYS.md`, is the future activity where a person chooses two concepts and explores a shared question, a similarity, a tension, or a new question. AI may suggest perspectives. The person accepts, edits, rejects, or records one, and may plant a question from it.

No relationship types, join table, or migration are specified here. Designing that model is an open decision, taken when Connect is scheduled. Until then the Library can show concepts beside one another without storing a link between them.

## 8. Initial release and tests

The release boundary and the implementation order are in `PRODUCT_VISION.md`. In short: score images, keep the four-stage workspace honest, keep the deployed many-to-many concept tables, then theme screens when useful, then title suggestions after the text model is checked, then the Lab, then Connect after its relationship is designed, then any storytelling.

Tests split the same way:

- **Image and journey tests** use the rubric and the four-stage cycle. They can run before any V2 table exists.
- **Persistence tests** are the smoke checks in `docs/schema-inventory/proposals/v2-initial-schema-proposal.md`. They cover ownership, the two question texts, merge and restore, a question informing more than one concept, a concept informed by more than one question, a concept that remains after a source is edited or removed, one- or two-word titles, optional theme membership, private storage, cleanup failure, and the absence of thumbnail storage and of a completed-concept status. They do not certify image quality, title-suggestion quality, or a concept-to-concept link. This document does not record them as a completed hosted run.

## 9. Decisions still requiring a yes

Established, proposed, and open decisions are maintained in `PRODUCT_VISION.md` section 10. This document does not keep a second copy. The open architectural decision that belongs here is section 7: how, if at all, a relationship between two concepts is stored. Do not add that table from this file.

The previous assumption that one kept image is a set of columns on `questions` is not in force. Themes are in the deployed schema and are not a required journey step. Do not treat this file as approval to run new SQL.
