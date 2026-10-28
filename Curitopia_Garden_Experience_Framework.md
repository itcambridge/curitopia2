# Curitopia V2 — Garden Experience Framework

**Status:** Product experience framework for Curitopia V2. `PRODUCT_VISION.md`, `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, and `ENTITY_RELATIONSHIP_MODEL.md` follow this file.  
**Purpose:** Capture the emotional metaphor, four-stage creative cycle, and interaction principles that should guide Curitopia V2.  
**Implementation note:** This document describes the intended experience. It does not approve or freeze a database schema.

## 1. Product idea

Curitopia is a personal place to nurture curiosity. It helps people move from an unfinished thought to a considered question, then to a concept: a compelling image and a title of one or two words that makes the idea easy to remember and to connect.

The intended journey is:

**Sow freely → Tend what matters → See what unfolds → Name what matters.**

The product should feel natural, inviting, and inspirational—not like a sequence of forms, a course, or a productivity dashboard. It should encourage a flow state by reducing friction and allowing ideas to develop at their own pace.

## 2. The garden metaphor

The garden is the emotional centre of Curitopia. It represents a person's evolving curiosity, not a score of their productivity or learning.

- **Seeds:** freshly captured questions, kept in their original wording.
- **Shoots:** questions the user chooses to retain for further attention.
- **Branches:** relationships between connected questions, including questions grouped or merged by the user.
- **Blossoms:** concepts the user chooses to keep. Each blossom is a meaningful image, a title of one or two words, and the question or questions that informed it. The title is how the idea stays memorable. The blossom is never finished.
- **Field notes:** the user's personal record of thoughts and discoveries.
- **Curiosity Shelf:** a lightweight place for ideas the user wants to keep close at hand.
- **Open the Lab:** an optional space for deeper investigation, testing a hunch, and developing an idea. The Lab supports the garden; it is not a required gateway to visualising a question.

### How the garden changes

The garden may gradually grow as genuine activity occurs. A newly captured question can appear as a seed; a retained question can develop a shoot; relationships can form branches; and a saved visual concept can appear as a blossom.

Growth should be expressed through restrained illustration and gentle transitions—not points, streaks, leaderboards, deadlines, or pressure to produce more. Parked questions remain welcome. Nothing withers because a person takes a break. The system must never imply that a question or person has failed to progress.

The garden should be beautiful and legible before it becomes technically elaborate. An evolving illustration is an acceptable first version; a complex interactive tree is not a prerequisite.

## 3. The repeatable four-stage cycle

The stages organise the work, but they must not become a rigid wizard. Users can move between stages at any time, revisit old work, and capture new questions without having to finish the current activity first.

### Stage 1 — Gather

**Microcopy direction:** “Sow freely.” / “What else is on your mind?”

Purpose: capture quantity before quality. Help the user record spontaneous, unfinished thoughts without interrupting them to refine, categorise, or judge them.

Experience principles:
- Fast, keyboard-friendly entry; pressing Enter adds a question and readies the input for the next thought.
- Preserve the original wording as entered.
- Keep the growing collection visible so the user can feel the garden taking shape.
- Do not require AI refinement, theme selection, or investigation setup.
- Do not generate images automatically while the person is capturing thoughts.

**Output:** a collection of raw questions. They do not need to be polished or useful yet.

### Stage 2 — Curate

**Microcopy direction:** “Tend what matters.” / “Which thoughts deserve more attention?”

Purpose: help the user select the questions worth exploring without turning curation into a judgement of the person or their ideas.

Experience principles:
- Make it easy to keep, park, discard, and restore questions.
- Suggest possible duplicates or related questions, but let the user decide.
- Support merging related questions while preserving the original wordings and their provenance.
- Make destructive actions explicit and reversible where practical.
- Clearly label any automated duplicate hint; never claim AI has analysed content unless a model actually did so.
- Avoid forcing every question to be refined or visualised.

**Output:** a smaller, deliberately chosen set of questions, with other ideas still available to revisit.

### Stage 3 — Visualise

**Microcopy direction:** “See what unfolds.” / “What might this question look like?”

Purpose: make a considered question tangible through compelling, conceptually meaningful visual interpretations.

Experience principles:
- The user selects which question to visualise.
- Help the user develop a considered question while preserving the original wording.
- Generate images only after an explicit user action.
- Show a small set of full-size candidates that are genuinely different in metaphor or concept—not merely colour or composition variants.
- Give imagery room to breathe. Avoid burying the art in explanatory UI.
- Allow candidates to be rejected and another candidate selected, without pretending a weak result is compelling.
- Candidate images are temporary until selected and kept.
- If the considered question changes after generation, clearly show that existing candidates were made for the earlier wording.
- Quality matters more than minimising every second or API call. The goal is a worthwhile image, reached with as little friction as practical.

**Output:** a selected visual associated with the question or questions it interprets.

### Stage 4 — Distil

**Microcopy direction:** “Name what matters.” / “What is the essence of this idea?”

Purpose: bring a compelling image and the idea behind it together as a memorable visual concept.

Experience principles:
- The person arrives with the image they chose, the considered wording it was made for, and the source questions.
- Pair that image with a title of one or two words. One word is valid. Two is the maximum.
- The title should catch the essence of the idea and still mean something later, without the conversation that produced it. A generic, literal, or interchangeable title fails the image it sits under.
- “Spacetime Fusion” and “Russian Blackholes” are examples of concise, memorable handles. They are not a pattern the product should impose.
- Brevity is not the whole aim. The title should stay faithful to the question and the image, and be easy to say beside other concepts.
- If the person asks, the product suggests three distinct titles. Suggestions are recommendations. The person selects, edits, asks again, or writes their own. The field is never filled or saved for them. Asking again does not make a new image. See `PRODUCT_VISION.md`.
- A missing or failed suggestion must not block a manually entered valid title.
- Preserve links to the source question or questions. A concept may emerge from more than one related question and, in the future, may draw on an investigation.
- Let users edit a title, revisit the source, and refine the concept later. Retitling updates the concept they already saved.
- Saving a concept records something worth returning to. It does not certify that the idea is finished.

**Output:** a named concept that can be revisited, retitled, reinterpreted, and connected over time.

## 4. The Library of Curiosities

**The Library of Curiosities is a collection of concepts. They are never completed.**

The concept is the central unit. It is not merely a saved image or a saved question. It is a visual expression of an idea, with a concise title and provenance to one or more questions. The library is a place to revisit, compare, and connect those mental objects.

The library is not a final-results page, a checklist of achievements, a productivity system, or a rigid map of everything the person knows. It is a living collection of things the user has chosen to keep.

A concept may be revisited, retitled, reinterpreted, connected to more questions, or developed into a deeper investigation. Its presence in the library means “worth keeping and returning to,” not “finished.”

A future Connect activity lets the person choose two concepts and explore what joins them: a shared question, a similarity, a tension, or a new question. “Spacetime Fusion” and “Russian Blackholes”, placed side by side, could prompt that kind of looking. The example is about exploration. It does not claim a scientific link. Suggestions, if a model offers any, stay optional. The person can accept, edit, reject, or record a thought, and can plant a new question. Connect is not part of the current library and has no stored relationship yet. The journey is in `USER_JOURNEYS.md`.

Avoid labels such as “completed concepts,” “finished work,” or progress indicators that imply the library is the end of a required pipeline. Prefer language such as “kept concepts,” “in your library,” “return to this,” or “still unfolding.” The archive should feel cared for and enduring, while remaining open-ended.

## 5. Repeatable workspace framework

The interface should open on the person's curiosities. Each curiosity is one persistent workspace, with a consistent shell and stage-specific work areas. Switching curiosities leaves the previous curiosity's questions and concepts behind.

Persistent elements may include:
- The Curitopia identity and a compact stage navigation.
- The current workspace or garden context.
- Useful counts, clearly described as counts of current items rather than achievement scores.
- A route to the Library of Curiosities.
- A clear indication when data is browser-local versus saved to an account.

Each stage should have a distinct interaction rhythm while retaining the same visual system:
- **Gather:** expansive, immediate, low-friction; the input and growing list are central.
- **Curate:** calm and selective; compare, group, keep, park, merge, or restore.
- **Visualise:** spacious and image-led; large candidates and clear selection controls.
- **Distil:** contemplative and compositional; image, a one- or two-word title, and source-question context form one concept. The person names it. A suggestion may help, and never decides.

Navigation should allow stages to be reopened in any order. Do not require all stages to be completed before the user can continue elsewhere. New questions can be captured at any time.

The garden metaphor should provide continuity, not force every control to use botanical language. Use evocative copy sparingly and authentically; clear labels remain important for actions.

## 6. Brand language and tone

The following existing phrases fit the product world and can be retained where they help:

- “Follow the thread.”
- “See what unfolds.”
- “Question garden.”
- “Plant a new seed.”
- “Field notes.”
- “Curiosity Shelf.”
- “Open the Lab.”
- “Test your hunch.”
- “Library of Curiosities.”

The tone should be warm, human, curious, and inspirational. Avoid a childish gardening game aesthetic, overly mystical claims, gamified productivity mechanics, or an excess of metaphors that obscure what an action does.

## 7. Product and data-model implications

The primary retained artefact is a **concept**, not an image field on one question. Questions and concepts are many-to-many: one question may inform many concepts, and one concept may be informed by many questions. A concept remains in the Library if a source question is edited, parked, or removed. It keeps the wording its image was made for, and its title, until the person changes the title. It is never completed.

The model is a `concepts` record plus a `concept_questions` link that also remembers the source wording at the time of the link. That shape is deployed in `supabase/migrations/20261026000000_initial_v2_schema.sql`. Candidate images stay temporary until a concept is kept. Title suggestions, when they exist, stay temporary too. Optional themes are in that schema, through `themes` and `theme_questions`, and they are not a required stage. Investigations can be introduced later without becoming a prerequisite. A stored relationship between two concepts is not in the schema. Designing it waits until Connect is scheduled.

## 8. Principles to protect

1. **Quantity before quality in Gather.** Do not make the user polish a thought before capturing it.
2. **User judgement over automated judgement.** AI may suggest a question, a title, or a connection. The user decides what matters, and nothing is saved until they say so.
3. **The concept is the payoff.** A compelling image and a memorable one- or two-word title, kept together. Avoid generic thumbnails, literal stock-style illustration, and titles that could belong to any image.
4. **One garden, multiple ways of working.** The stages are views over an evolving workspace, not a forced wizard.
5. **Saved does not mean completed.** Concepts in the Library of Curiosities remain open to reconsideration.
6. **No shame-based growth mechanics.** No dead plants, missed-day penalties, or productivity scores.
7. **Preserve provenance.** Keep original question wording and links when questions are merged or concepts combine multiple questions.
8. **Be truthful about AI and persistence.** Clearly distinguish demo fixtures from generated images, and browser-local data from account-backed storage.
9. **Build the experience before overbuilding the infrastructure.** Validate the quality and usefulness of the capture-to-image journey, then let proven needs guide the schema.

## 9. Suggested implementation order

1. Keep the four-stage navigation and consistent workspace shell.
2. Make Gather genuinely fast for many questions.
3. Make Curate reversible and provenance-preserving.
4. Validate image quality and conceptual variety in Visualise.
5. Make Distil create and reopen named concepts linked to one or more questions. Title suggestions come only after the text model is understood, and only when the person asks.
6. Keep the Library of Curiosities as an open collection of concepts, never a “completed work” screen.
7. Leave the deployed concept and question tables in place. Do not add a concept-to-concept table until Connect is designed.
8. Add Themes, title suggestions, and deeper Investigations UI when they provide clear value, without interrupting the primary creative loop.
9. Add Connect as an exploratory way to hold two concepts together, after its relationship model is chosen.

## 10. Explicit correction

Everywhere the product documents or UI imply that concepts are completed, finished, or final, replace that framing. **The Library of Curiosities is a collection of concepts; they are never completed.** A concept is an image, a one- or two-word title, and its question provenance, kept open for another look.
