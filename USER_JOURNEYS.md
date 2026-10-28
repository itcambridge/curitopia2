# Curitopia Key User Journeys

**Status:** Working journeys for V2. They describe intended behaviour.  
**Experience framework:** `Curitopia_Garden_Experience_Framework.md`.  
**Source of truth for scope and image quality:** `PRODUCT_VISION.md`.  
**Entities:** `ENTITY_RELATIONSHIP_MODEL.md`. Saved concepts use the deployed `concepts` and `concept_questions` tables. A link between two concepts is not in that model.

The primary journey is the four-stage cycle. Themes and the Lab are optional. None of these journeys depends on a V1 account or on V1 data. Saving a visual concept does not complete it.

## Shared rules

- The original capture remains available after a considered question exists, and after a merge.
- AI writes nothing until the person accepts, edits, or supplies the text themselves. Opening a page is not a request. Typing in Gather is not a request.
- A person can leave any stage and open another. The cycle is not a wizard.
- A theme is optional. The Lab is optional. A visual concept can be kept with neither.
- A concept in the Library of Curiosities stays open. It can be retitled, reinterpreted, connected, and developed. Retitling updates that concept. It is not finished work.
- A Lab item does not receive a copy of that image. An investigation item of kind `concept` is a written note, not a Library concept.
- Hidden questions, priority, Quickfire, Focus, and a questions-per-minute gauge are not part of these journeys. Gather still allows many questions.
- The workspace, the Library, and the image are private to the owner.
- Candidate images last for the comparison. The kept file is the one the person selects for a concept.
- Counts are counts. The garden does not score the person or wither when they pause.

---

## Journey 1 — From a raw question to a visual concept

### Intent

The person wants to sow several unfinished thoughts, tend the ones that matter, see one of them as an image, and name that image. They can stop anywhere, and they can come back.

### Entry

The list of curiosities after sign-in, or a curiosity already open.

### Happy path

1. They choose an existing curiosity or name a new one. Opening it restores that curiosity's saved questions and concepts, and the stage last stored for it. Another curiosity's questions are not on this screen.
2. **Gather.** They write thoughts in their own words. Enter keeps each wording and clears the field. Curitopia does not rewrite a capture into a tidier question, and it does not generate an image.
3. **Curate.** They keep what deserves attention, and park, discard, or restore the rest. If two wordings look alike, the screen can say so and must say when that hint is only a text match. A merge keeps both original wordings. Nothing is deleted by the hint.
4. **Visualise.** They choose one question. They write a considered question, or ask for one proposal, then edit, accept, or ask again. The original text stays. When they ask for images, Curitopia shows a small set of full-size interpretations. The considered wording stays on screen.
5. They compare the set and choose one image. That choice is the current draft. It is not saved. Hiding a candidate, or choosing a different one, does not save it either. If none is worth keeping, they ask for another set. The set they are looking at remains until the new one is ready. Accepting the considered question does not start this step.
6. **Distil.** They arrive with the selected image, the considered wording it was made for, and the source questions. They can attach other questions that informed it. They write a title of one or two words. One word is valid. The title should carry the idea, not caption the picture.
7. If they ask, Curitopia proposes three distinct one- or two-word titles. That help is specified in `PRODUCT_VISION.md`. Suggestions stay temporary. They can select one, edit it, ask for another set, or ignore them and type their own. Asking again does not generate another image.
8. They explicitly save the concept to the Library. Curitopia keeps the image, the title they confirmed, the model, the prompt version, and the links to the source questions. The concept appears in the Library of Curiosities as something to return to. A suggestion that was never chosen is not stored.
9. Later they reopen it, retitle it, connect another question, return to the list of curiosities, or leave it as it is. Retitling updates this concept. The Library does not mark it complete.

### Guardrails

- An empty or whitespace-only capture is not saved.
- Help for the question sends this question's text, not the rest of the workspace.
- Image generation requires a considered question and a fresh explicit action.
- The image is an interpretation, not evidence and not a verdict on the question.
- A title is one or two words. The interface and the database enforce that. A title suggestion that fails the check is discarded. It does not bypass the check, and it does not stop the person typing a valid title. A title is not saved without an image, and an image is not saved without a title and a considered question.
- The title field is always available. A missing text model, a timeout, a malformed response, or a weak set of suggestions does not block a save.
- Title suggestions are not the stored title. Opening Distil does not request them, does not fill the field, and does not save the concept.
- Requesting titles does not regenerate the image and does not call image generation.
- Retitling a saved concept updates that concept. It does not create a duplicate, and a later model does not rename it unasked.
- Rejected candidates are not written into the Library and are not stored in the private bucket.
- If the considered question changes after a set was generated, the screen says the images were made for the earlier wording.
- Editing a source after a concept is saved leaves the current image and title in place. It does not delete the concept, and it does not rewrite the wording the image was made for.
- Keeping another image adds a concept. The current screen does not replace the image on an existing concept. Whether replacement should exist is open in `PRODUCT_VISION.md`.
- Correcting the original wording is a separate action from editing the considered question.
- One question may inform many concepts, and one concept may include many questions. Editing, parking, or removing a source leaves every concept it informed in the Library, with the wording each image was made for. Unmerging does not pretend the other sources were never linked.

### What good looks like

- The person can reach a concept without creating a theme or opening the Lab.
- The original thought is still visible beside the considered question.
- The image is recognizable in the Library and named by a title they can remember.
- They can gather more questions after saving, without the concept being treated as finished.
- On the review set in `PRODUCT_VISION.md`, the result meets the rubric for relevance, distinctiveness, stock avoidance, title, and time to a result they would keep.

### Validate with the reviewer

- Did the considered question become clearer without abandoning the original thought?
- Did any image change how the question feels, or did the set look like stock illustration?
- Was the title a memorable handle on the idea, or a shortened caption that could fit any similar image?
- Did the Library feel like a place to return, or like a pile of finished work?
- Where did the wait or an extra click make them want to stop?

---

## Journey 2 — Group questions with a theme

### Intent

The person has several questions and wants a light way to see a cluster, without copying questions or blocking Journey 1.

### Entry

The workspace, once theme screens are available. `themes` and `theme_questions` are already part of the initial schema. Using them is optional.

### Happy path

1. The person creates a theme with a short name.
2. They link existing questions to it. Each question stays itself, including both texts and any concept that cites it.
3. A question can remain ungrouped, or it can sit in more than one theme.
4. They open a question from the theme and continue Journey 1 if it does not yet have an image.
5. They rename or delete the theme later. Questions and concepts remain.

### Guardrails

- Linking is manual until a later suggestion exists. If a suggestion exists, it is explicit and reversible.
- Deleting a theme removes the memberships and the theme.
- A theme does not own an image. The visual concept does.
- An empty theme is allowed.

### What good looks like

- A cluster is visible without a second copy of any question.
- Grouping is reversible and optional.
- Journey 1 still works for a question that has no theme.

### Open, without blocking the experience

- Whether a theme needs a description as well as a name. The working sketch stores a name.
- Whether theme suggestions should exist later.

---

## Journey 3 — Open the Lab

### Intent

The person wants to think further about one uncertainty that several questions share, and to keep notes, hypotheses, tests, observations, and discoveries in one place.

This journey is the optional Lab. It is not a stage of Gather, Curate, Visualise, or Distil. It is not required before an image. Its tables are not in any approved database release. The shape below is a sketch so the Lab does not have to be rediscovered, and so it is not mistaken for the Library.

### Example

Questions already in the workspace, whether or not they inform a visual concept:

- "Can dream memories be distorted after waking?"
- "Why do familiar places recur in dreams?"
- "How reliable is my memory of a dream?"

The person investigates dream memory once and links all three. Any blossom already in the Library stays a visual concept. The Lab does not absorb it.

### Happy path

1. From a question or a concept, the person opens the Lab and gives the investigation a short title. This is "Open the Lab" and "Test your hunch," not a fifth required stage.
2. The investigation shows its linked questions and can link others that belong to the same person.
3. They add items of the kinds they need, in any order. A note is enough. A test is not mandatory. A written item of kind `concept` is a thought in the Lab, not an image in the Library.
4. They open the same investigation from any linked question and see the same items.
5. They unlink a question without deleting the investigation or the items.
6. Each linked question still has its own original text and considered text. A visual concept that cites those questions keeps its own image and title. The investigation does not take ownership of that image.

### Guardrails

- A question can belong to more than one investigation.
- An investigation can link to more than one question. The database sketch allows an investigation with no linked questions; the interface starts from a question or a concept and creates the first link.
- Links across owners are rejected.
- Item kinds keep their meanings. A hypothesis is not shown as a discovery. An image is not an item kind.
- Items have no thumbnail and no image file.
- Unlinking a question does not delete shared items. Removing a source question does not delete a visual concept or its image file. The concept stays in the Library.
- There is no direct link from a theme to an investigation. Starting from a theme means linking the questions the person selects.

### What good looks like

- Shared notes exist once.
- Each question remains a question.
- Each visual concept remains in the Library, still open.
- The person can see which questions the investigation covers.

### Not in this journey

- A stored note explaining why a link exists. The linked question is the explanation until a screen needs more.
- V1 experiments. They stay in the V1 project.
- Any requirement to pass through the Lab before Visualise.

---

## Journey 4 — Connect two concepts

### Standing

Future. Not a stage of the four-stage cycle, and not in the current database. `concept_questions` links a concept to questions. It does not link a concept to another concept. The relationship model is an open decision in `PRODUCT_VISION.md` and `PRODUCT_ARCHITECTURE.md`. This journey records the intended experience so it is not designed later as a knowledge graph or a task system.

### Intent

The person has two concepts they want to hold side by side. They want to see what, if anything, connects them: a shared question, an unexpected similarity, a tension, or a new question that appears only when the two are together.

### Entry

The Library of Curiosities, once the activity exists. Both concepts already have an image and a title. Neither is completed by being chosen.

### Example

Two concepts titled “Spacetime Fusion” and “Russian Blackholes” might be brought together to explore how physical models, cosmological ideas, and pictures of the universe sit near each other in this person’s curiosity. That is an illustration of the activity. It does not assert a scientific relationship between those names.

### Happy path

1. The person chooses two concepts from the Library.
2. Curitopia shows both images and titles, and the questions that informed each, including wording kept after a source question changed.
3. The person can sit with the pair, or ask for a few possible readings. A reading might be a shared underlying question, a surprising similarity, a tension or contradiction, a relationship between ideas that looked unrelated, or a new question that emerges from the pair.
4. Any model output is a suggestion. The person accepts it, edits it, rejects it, or writes their own note about the connection.
5. They can plant a new question from what they noticed. That question enters Gather as their wording. It does not rewrite either concept.
6. They can leave the pair with nothing recorded. Looking is a complete use of the activity.

### Guardrails

- The person chooses the two concepts. The product does not decide which pair matters.
- Suggestions do not dictate a conclusion, invent a fact, or present either image as evidence.
- Accepting a suggestion does not mark either concept completed, and it does not merge the two concepts into one.
- Recording a connection, when storage exists, is explicit. The shape of that record is not designed yet.
- The activity stays exploratory. It is not a map the person must maintain, and it is not a productivity board.

### What good looks like

- Two memorable titles are enough to start. The person does not need the original conversation in front of them.
- A connection can be declined without leaving debris in the Library.
- A new question, if they plant one, is theirs.

---

## Journey removed from this release

The previous journey "Create a Story directly from Curiosity" — selecting slides, generating per-slide artwork, and exporting a silent portrait MP4 — is not a V2 journey. Story drafts, a story table, and a story bucket are not part of the release.

If storytelling returns, it should be designed against visual concepts and their titles, and accepted as a new journey. It should not be copied forward from the old workflow in order to have feature parity.

---

## Invariants

1. **One primary cycle.** Gather, Curate, Visualise, Distil, and return through the Library. Themes, the Lab, and a future Connect activity sit beside that cycle. Connect is not a fifth required stage.
2. **The Library is a collection of open concepts, not a finish line.** A concept is an image, a one- or two-word title, and its question provenance. Concepts are never completed.
3. **No silent mutation.** Considering, grouping, linking, and regenerating do not overwrite the original capture. Replacing an image is an explicit save.
4. **Provenance.** Merged questions keep their original wordings. A question may inform many concepts, and a concept may cite many questions. The concept keeps the wording its image was made for after a source is edited, parked, or removed. Those snapshots live on `concept_questions`. A relationship between two concepts is not stored.
5. **Privacy.** Owner boundaries are enforced on the server for rows and for the image file, once an account exists. Model calls send only the text the action needs.
6. **Distinct Lab meanings,** when that release exists. Image generation does not write those item kinds.
7. **Explicit AI.** No generation from merely opening or leaving a view, or from capturing a question.
8. **The garden is not a score.** No questions-per-minute gauge, no withering, no completed-concept progress.
9. **Accessible controls.** Icon-only controls have accessible names, keyboard access, visible focus, and tooltips.
10. **Stopping is allowed.** A capture with no considered question, a considered question with no image, a parked question, an ungrouped question, and an investigation with no test are all valid.
