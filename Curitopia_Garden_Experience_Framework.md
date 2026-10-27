# Curitopia V2 — Garden Experience Framework

**Status:** Product experience framework for Curitopia V2. `PRODUCT_VISION.md`, `PRODUCT_ARCHITECTURE.md`, `USER_JOURNEYS.md`, and `ENTITY_RELATIONSHIP_MODEL.md` follow this file.  
**Purpose:** Capture the emotional metaphor, four-stage creative cycle, and interaction principles that should guide Curitopia V2.  
**Implementation note:** This document describes the intended experience. It does not approve or freeze a database schema.

## 1. Product idea

Curitopia is a personal place to nurture curiosity. It helps people move from an unfinished thought to a considered question, explore meaningful visual interpretations, and give an idea a memorable name.

The intended journey is:

**Sow freely → Tend what matters → See what unfolds → Name what matters.**

The product should feel natural, inviting, and inspirational—not like a sequence of forms, a course, or a productivity dashboard. It should encourage a flow state by reducing friction and allowing ideas to develop at their own pace.

## 2. The garden metaphor

The garden is the emotional centre of Curitopia. It represents a person's evolving curiosity, not a score of their productivity or learning.

- **Seeds:** freshly captured questions, kept in their original wording.
- **Shoots:** questions the user chooses to retain for further attention.
- **Branches:** relationships between connected questions, including questions grouped or merged by the user.
- **Blossoms:** visual concepts the user chooses to keep—an image paired with a short title and linked to the question or questions that inspired it.
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
- Pair the chosen image with a memorable one- or two-word title.
- The title should name the metaphor or core idea, not merely shorten the question or act as a caption.
- Preserve links to the source question or questions. A concept may emerge from more than one related question and, in the future, may draw on an investigation.
- Let users edit a title, revisit the source, and refine the concept later.
- Saving a concept records something worth returning to; it does not certify that the idea is finished.

**Output:** a named visual concept that can be revisited, reconsidered, and developed over time.

## 4. The Library of Curiosities

**The Library of Curiosities is an archive of visual concepts. They are never completed.**

The library is not a final-results page, a checklist of achievements, or a collection of work that has been declared done. It is a living archive of things the user has chosen to keep: compelling images, short titles, their source questions, and the relationships that give them meaning.

A concept may be revisited, retitled, connected to more questions, reconsidered, or developed into a deeper investigation. Its presence in the library means “worth keeping and returning to,” not “finished.”

Avoid labels such as “completed concepts,” “finished work,” or progress indicators that imply the library is the end of a required pipeline. Prefer language such as “kept concepts,” “in your library,” “return to this,” or “still unfolding.” The archive should feel cared for and enduring, while remaining open-ended.

## 5. Repeatable workspace framework

The interface should use one persistent workspace with a consistent shell and stage-specific work areas.

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
- **Distil:** contemplative and compositional; image, short title, and source-question context form one visual artefact.

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

The primary retained artefact is a **visual concept**, not an image field on one question. Questions and concepts are many-to-many: one question may inform many concepts, and one concept may be informed by many questions. A concept remains in the Library if a source question is edited, parked, or removed. It keeps the wording its image was made for. It is never completed.

The model is a `concepts` record plus a `concept_questions` link that also remembers the source wording at the time of the link. The proposed migration is `supabase/migrations/20261026000000_initial_v2_schema.sql`. It has not been applied. Candidate images stay temporary until a concept is kept. Optional themes are in that proposed schema, through `themes` and `theme_questions`, and they are not a required stage. Investigations can be introduced later without becoming a prerequisite.

## 8. Principles to protect

1. **Quantity before quality in Gather.** Do not make the user polish a thought before capturing it.
2. **User judgement over automated judgement.** AI may suggest; the user decides what matters.
3. **Compelling imagery is the payoff.** Avoid generic thumbnails and literal, stock-style illustration.
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
5. Make Distil create and reopen named visual concepts linked to one or more questions.
6. Establish a reliable Library of Curiosities that is explicitly an archive, never a “completed work” screen.
7. Finalise the clean V2 database schema around the proven concept/question relationship and private image-storage lifecycle.
8. Add Themes and deeper Investigations UI when they provide clear value, without interrupting the primary creative loop.

## 10. Explicit correction

Everywhere the product documents or UI imply that visual concepts are completed, finished, or final, replace that framing. **The Library of Curiosities is an archive of visual concepts; they are never completed.**
