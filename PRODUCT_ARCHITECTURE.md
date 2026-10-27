# Curitopia Product Architecture

**Status:** Working architecture for V2. Experience and tone follow `Curitopia_Garden_Experience_Framework.md`. Scope and the image-quality rubric live in `PRODUCT_VISION.md`.  
**Persistence:** The proposed first migration is `supabase/migrations/20261026000000_initial_v2_schema.sql`. It has not been applied. Questions and visual concepts are many-to-many. A concept stays in the Library when a source question is edited, parked, or removed. Optional themes are `themes` and `theme_questions`. `docs/schema-inventory/proposals/v2-revised-schema-proposal.md` is the earlier image-on-question sketch and is not a migration.  
**Journeys and entities:** `USER_JOURNEYS.md`, `ENTITY_RELATIONSHIP_MODEL.md`.  
**Earlier schema drafts** in `docs/schema-inventory/proposals/` are historical. They are not deployable.

This document does not authorise application changes, SQL, a hosted project, or any edit to V1.

## 1. Design driver

The garden is one workspace. The four stages are how a person moves through it. The Library of Curiosities is where a visual concept stays open, not where the work is declared done.

1. **Gather.** Capture questions without losing the original wording.
2. **Curate.** Keep, park, discard, restore, or merge, with provenance intact.
3. **Visualise.** Develop a considered question and explicitly compare a small set of images.
4. **Distil.** Name the chosen image with one or two words and remember which questions informed it.
5. **Return.** Reopen the concept from the Library, rename it, connect it, or develop it. That return is not a completion ceremony.

A table, a step, or a stored state earns a place by serving that cycle or by being an optional support that does not sit in front of it. Themes are optional. The Lab, meaning investigations, is the optional deeper support and is not a stage. Story export is neither.

The garden expresses evolving curiosity. Counts are counts of items. They are not a score, a streak, or a questions-per-minute gauge.

## 2. Principles

1. **The original wording survives consideration and merges.** The considered question is a second text. A merge keeps every source wording.
2. **A visual concept is the kept artefact.** It holds the selected image, the short title, the wording that image was made for, and links to the questions that informed it. One question may inform many concepts. One concept may draw on many questions. It is not an attachment on a question or on a Lab item.
3. **Saved does not mean completed.** A concept in the Library can be revisited, renamed, connected, and developed. Editing, parking, or removing a source leaves the concept open. The product has no completed-concept state.
4. **Candidates are temporary.** They last for the comparison. They are not Library records. If the considered question changes, the set stays tied to the wording that was sent.
5. **Quality is a prompt, model, and interface problem.** The database should remember which model and prompt version produced a kept image, once the tables exist. It does not score images, and it does not store rejected ones.
6. **The Lab is optional.** A question can be visualised with no theme and no investigation. Opening the Lab is not required before an image.
7. **Evidence and speculation stay distinct inside an investigation.** That distinction matters when the Lab exists. It does not gate image generation. An image is not an observation, a test, or a discovery. A Lab item of kind `concept` is a written note, not a blossom in the Library.
8. **Private by default.** Questions, concepts, themes, investigations, and image files belong to the signed-in person. Export or sharing is a later decision.
9. **No scored growth.** The garden does not wither, penalise a pause, or rank the person. Quickfire, Focus, hiding, priority, and a questions-per-minute table are not part of the model.
10. **The person owns the work directly.** An exploration container, a mode, a central question, and a backdrop image are not part of the model.

## 3. Product surfaces

These are responsibilities. Stage navigation is persistent, and every stage can be opened without finishing another.

The shell keeps the warm editorial system: cream and paper, coral accent, serif display, field-notes voice. The garden metaphor is the continuity. Control labels stay plain.

### Workspace

One place for the cycle. It shows the current garden in ordinary counts: questions gathered, questions retained, concepts in the Library. It says when the copy is stored only in the browser.

### Gather, Curate, Visualise, Distil

The four work areas in `PRODUCT_VISION.md` section 3. Gather is fast and list-centred. Curate is selective and reversible. Visualise is image-led. Distil is the composition of image, title, and source questions.

### Library of Curiosities

The archive of visual concepts. It shows the image and the title at a size that can be recognized, and on open the wording the image was made for and the questions that still inform it. It is an open, evolving archive. It does not hold every captured question, and it has no achievement state. A concept remains open after it is saved, including after a source question changes or goes away.

### Themes

Optional grouping of questions, already included in the initial schema as `themes` and `theme_questions`. A theme is not a required stage. Manual first. A later suggestion must be explicit and reversible. Membership does not copy question text. Dissolving a theme leaves the questions and any concepts.

### The Lab

A later surface for deliberate thinking across questions: notes, hypotheses, tests, observations, and discoveries, plus a written item kind `concept` that is not a visual concept. One investigation can relate to several questions. Items do not carry images. The Lab supports the garden. It is not the way into Visualise.

The entity sketch is in `ENTITY_RELATIONSHIP_MODEL.md`. The Lab is not in the initial schema. That schema does include questions, concepts once their columns are reviewed, and optional themes.

### Later storytelling

If it is built, it arranges visual concepts that already have an image and a title. It is not specified in this release. The previous Story model — a browser-only slide draft and a locally encoded silent MP4 — is not a requirement to preserve.

## 4. Repository state

The V2 application in this repository is a browser-local prototype of the four-stage workspace and the Library. It is not connected to Supabase. An earlier home screen counted questions per minute and offered an experiment action. That screen is not the specification. The questions-per-minute gauge stays out of the product.

V1, including its Supabase project, is outside this repository and is not a source of rows or files for V2.

## 5. Data boundaries

The proposed columns are in `supabase/migrations/20261026000000_initial_v2_schema.sql` and explained in `docs/schema-inventory/proposals/v2-initial-schema-proposal.md`. That migration has not been applied. The browser prototype is still `localStorage`.

- **Question** is owned by the person. It holds live `original_text`, optional `considered_text`, and `disposition` of `gathered`, `retained`, `parked`, or `discarded`. A merge is `merged_into_id`, not a fifth disposition. Editing those texts does not rewrite a concept. The prototype does not hard-delete questions.
- **Visual concept** is an independent Library record: `image_path`, a one- or two-word `title`, `image_model`, `prompt_version`, and `for_considered_text`. It has no completed state, no anchor column, and no required surviving question. The prototype still keeps one concept per anchor and can store a demo image as a data URL. Those two behaviours are not columns in this schema.
- **Concept link** is `concept_questions`. It stores snapshots of the source question's original and considered wording. Parking leaves the link. Removing the question sets `question_id` to null and leaves the concept, the image path, and the snapshots.
- **Theme** is an optional label. `themes` and `theme_questions` join a theme and a question that share an owner. A question needs no theme. Theme names are unique per owner, ignoring case and surrounding spaces. There is no description column and no theme screen yet. A duplicate should be shown as "You already have a theme with this name."
- **Kept image file** lives in the private bucket `concept-images`, at `{user_id}/{concept_id}/{filename}`. The limit is 8 MiB, for PNG, JPEG, or WebP. The prototype still stores a data URL, not this path. The application replaces and deletes files through the Storage API. A failed cleanup is reported as a failure. The application does not delete `storage.objects` with SQL. There is no thumbnail bucket. The migration requires PostgreSQL 15 or later and has not been applied.
- **Investigation, investigation link, and investigation item** are the later Lab. Item kinds stay `concept`, `note`, `hypothesis`, `test`, `observation`, and `discovery`. Items have no image path. The kind `concept` here is not a Library visual concept.
- **Absent on purpose:** explorations, focus images, investigation thumbnails, story tables, story buckets, a `visions` table, hidden and priority flags, Quickfire/Focus columns, a questions-per-minute table, candidate-image rows, and any completed-concept flag.

Row level security in the proposed migration is enabled for `authenticated` and scoped by `auth.uid()`. The browser uses the signed-in JWT. It does not use a service-role client. Writing this section does not create the project.

## 6. AI boundaries

- No model call is implied by navigation, by typing in Gather, or by accepting a considered question.
- Send the smallest text the action needs: the original question for help, the considered question for images, the original as secondary tone during image generation, and the chosen image's metaphor context for a title suggestion.
- Do not send the rest of the workspace, theme names, or investigation items for those actions.
- A proposal is written only after the person accepts it or edits it into place. Capture text is never overwritten by a proposal.
- Image and title generation must not invent empirical claims or present the picture as proof.
- Model calls and secrets stay server-side. The client uses the signed-in session when an account exists.
- Provider choice and whether that provider retains prompts or images are a product decision in `PRODUCT_VISION.md`. They are not settled by this architecture.

The rubric for relevance, distinctiveness, stock avoidance, titles, and time until an image is worth keeping is in `PRODUCT_VISION.md`. Architecture does not add a second rubric.

## 7. Initial release and tests

The release boundary and the implementation order are in `PRODUCT_VISION.md`. In short: score images, keep the four-stage workspace honest, then write the database around many-to-many concepts and the already approved theme tables, then theme screens when useful, then the Lab, then any storytelling.

Tests split the same way:

- **Image and journey tests** use the rubric and the four-stage cycle. They can run before any V2 table exists.
- **Persistence tests** are the smoke checks in `docs/schema-inventory/proposals/v2-initial-schema-proposal.md`. They run only after the migration is applied to the new project. They cover ownership, the two question texts, merge and restore, a question informing more than one concept, a concept informed by more than one question, a concept that remains after a source is edited or removed, one- or two-word titles, optional theme membership, private storage, cleanup failure, and the absence of thumbnail storage and of a completed-concept status. They do not certify image quality. They have not been run.

## 8. Decisions still requiring a yes

The open list is maintained in `PRODUCT_VISION.md` section 10. This document does not keep a second copy.

The previous assumption that one kept image is a set of columns on `questions` is not in force. Themes are in the proposed initial schema and are not a required journey step. Do not treat this file, or the schema proposal, as approval to create a Supabase project or to run SQL.
