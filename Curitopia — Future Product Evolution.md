# Curitopia — Future Product Evolution

**Status:** Emerging product direction. For future consideration and architectural planning.  
**Date:** 7 November 2026  
**Implementation status:** Exploratory. No database changes or implementation work is authorised by this document.

---

## 1. Where Curitopia is today

Curitopia has evolved from a five-stage workflow into a simpler visual-thinking environment built around three primary surfaces:

1. **Garden** — capture questions and nurture curiosity.
2. **Visualise** — turn questions into meaningful visual representations and save concepts.
3. **Library** — collect, revisit, filter and compare concepts.

The Library supports both focused exploration within an individual curiosity and open exploration across all curiosities.

Users can select two concepts and bring them together in a side-by-side comparison. They can record a temporary observation or turn their thinking into a new question.

The underlying principle is that the user, rather than the application or AI, decides what is interesting and what deserves further exploration.

## 2. An important new discovery: ideas can emerge from other ideas

Recent use of Curitopia has revealed a more interesting creative process than the original question-to-image journey.

A concept does not always originate from a question. Sometimes it emerges from comparing two existing concepts.

### Example: Beyond Ornament

Two independently created concepts were compared:

- **Preferential Engineering**
- **Common Variety**

Considering them together revealed an underlying common principle:

**Reductive Development**

Both ideas explored how a system might be improved by removing unnecessary complexity and retaining what is essential.

This produced a new concept:

**Beyond Ornament**

Its underlying question concerned the relationship between function and form: what is necessary, and what is merely decorative?

The important point is that Beyond Ornament was not simply a combination of two images. It represented a new abstraction that emerged from considering the ideas together.

Neither original concept explicitly contained that abstraction.

The user discovered something new by bringing them into conversation.

## 3. The emerging direction: Curitopia as a recursive thinking environment

This experience suggests a significant evolution in the product's purpose.

The original journey was:

**Question → Image → Concept**

The emerging journey is:

**Concept A + Concept B → Comparison → Insight → New Question → New Concept**

The resulting concept can then be compared with other concepts, potentially generating further insights.

This creates a recursive cycle in which discoveries become the starting points for new discoveries.

<escape>
Question
   |
   v
Visualise
   |
   v
Saved Concept
   |
   +------------------+
   |                  |
   v                  v
Compare with      Compare with
another concept   another concept
   |                  |
   v                  |
Emerging insight      |
   |                  |
   v                  |
New question          |
   |                  |
   v                  |
New visual concept    |
   |                  |
   +------------------+
          |
          v
     Further discovery
</escape>

Curitopia should support this naturally without requiring every concept to follow the same route.

A concept can originate directly from a question or from a discovery resulting from comparison.

## 4. A new intellectual principle: reductive development

The Beyond Ornament example also reveals a particular type of connection.

The relationship was not primarily visual similarity. It was a shared underlying principle.

Both concepts explored how removing unnecessary elements can make a system more effective.

This suggests that connections between concepts can take several forms:

- **Similarity:** two ideas share characteristics.
- **Analogy:** two different systems operate according to a similar principle.
- **Contrast:** two ideas reveal something through their differences.
- **Tension:** two ideas expose a contradiction or competing objectives.
- **Abstraction:** several ideas reveal a common underlying principle.
- **Emergence:** considering ideas together produces an entirely new thought.

These are possible ways of understanding connections, not categories that users must choose when comparing concepts.

The user should remain free to recognise a connection in their own terms.

## 5. A new product entity: Discovery

The current comparison feature is intentionally temporary. Concepts can be brought together and an observation can be written, but the comparison and reflection disappear when the user leaves.

The next significant product evolution could introduce a durable entity called a **Discovery**.

A Discovery is not simply a connection between two concepts.

It is the insight that emerged when the user considered those concepts together.

A Discovery might contain:

- The user's own observation or insight.
- Links to the concepts that prompted it.
- The original titles and question context of those concepts.
- An optional new question arising from the discovery.
- Links to concepts subsequently created from that discovery.
- Creation date and provenance.

A Discovery should be independently meaningful, even when revisited without the original comparison session.

For example:

**Discovery: Reductive Development**

Source concepts:
- Preferential Engineering
- Common Variety

Observation:
Both ideas demonstrate how removing unnecessary complexity can improve a system.

Resulting question:
Where else can reductive development be applied?

Subsequent concept:
Beyond Ornament.

This is an illustration of the proposed structure, not an approved database schema.

## 6. Important architectural distinction: provenance versus lineage

The existing architecture already distinguishes between questions and the concepts they inform.

That relationship must be preserved.

Future development introduces a second, different relationship.

### Question provenance

Records which questions informed the creation of a visual concept.

The existing entities are:

- `questions`
- `concepts`
- `concept_questions`

These relationships preserve original wording and considered wording snapshots.

### Concept lineage

Records which earlier concepts contributed to a Discovery and which subsequent concepts emerged from it.

This is not the same as question provenance.

We must never overload `concept_questions` to represent relationships between concepts.

A concept could therefore have two kinds of intellectual ancestry:

1. The question or questions that informed its creation.
2. The earlier concepts and discoveries that influenced its development.

These relationships serve different purposes and should remain distinct.

## 7. Potential future data architecture

The existing database provides a good foundation. The emerging requirements suggest a small number of additional entities may eventually be needed.

### A. Discoveries

An account-owned record of an insight.

Possible attributes:

- `id`
- `user_id`
- `observation`
- `created_at`
- `updated_at`

A Discovery should not necessarily belong to one curiosity. It might emerge from concepts originating in several different curiosities.

### B. Discovery source concepts

A relationship between a Discovery and the concepts that inspired it.

Potential table: `discovery_concepts`.

This would record:

- Discovery ID.
- Source concept ID.
- User ID.
- Position or ordering.
- Relevant provenance snapshots.

This allows a Discovery to retain its intellectual ancestry.

### C. Questions emerging from discoveries

A Discovery may generate one or more new questions.

These should be ordinary Curitopia questions, stored in the existing `questions` table and assigned to a curiosity explicitly chosen by the user.

A separate relationship could record which Discovery inspired the question.

Potential table: `discovery_questions`.

### D. Concepts emerging from discoveries

When a question generated from a Discovery is subsequently visualised and saved, the resulting concept should retain a link back to the Discovery.

Potential table: `concept_discoveries`.

This creates a traceable path:

Original concepts → Discovery → New question → New visual concept.

These are architectural proposals only. Their final structure, constraints, deletion behaviour and RLS policies require further design.

### E. Preserve the existing concept model

The existing `concepts` table should remain the authoritative record for a saved visual concept.

A concept must continue to retain:

- Its title, maximum two words.
- Its original artwork.
- Its originating question context.
- Its image-generation provenance.
- Its contributing question relationships.

A concept created from a Discovery should not require the existing concept model to be replaced.

The new relationship should extend the existing model rather than redesign it.

## 8. Potential future user experience

The likely evolution of Curitopia would introduce a further activity within the existing Library and comparison experience.

### Explore together

Users select two concepts and bring them together.

### Capture a Discovery

When an insight emerges, the user can explicitly save it.

The Discovery retains the concepts that prompted the insight and the user's own observation.

Saving a comparison as a Discovery should be optional. Not every comparison produces something worth preserving.

### Develop the Discovery

The user can:

- Revisit the original concepts.
- Edit their observation.
- Create a new question.
- Choose which curiosity should contain that question.
- Visualise the new question.
- Save a new concept.

### Explore again

The resulting concept returns to the Library and can be compared with other concepts.

A new discovery can emerge from that comparison.

The process remains open-ended.

## 9. Principles to protect during this evolution

1. **User discovery comes first.** AI should not dictate what a comparison means.
2. **Do not automatically create connections.** The user decides when an insight is worth recording.
3. **Preserve intellectual ancestry.** A new concept should retain links to the ideas that influenced it.
4. **Do not confuse provenance and lineage.** Question-to-concept links and concept-to-discovery links serve different purposes.
5. **Maintain curiosity ownership.** Concepts and questions remain associated with their original curiosities.
6. **Allow cross-curiosity thinking.** A Discovery may bring together concepts from entirely different subjects.
7. **Do not require every comparison to produce a Discovery.** Exploring without an outcome is still worthwhile.
8. **Avoid overbuilding a knowledge graph.** Introduce only the relationships needed to support demonstrated user behaviour.
9. **Preserve user agency.** Nothing should be saved, interpreted or rewritten on the user's behalf without an explicit action.
10. **Keep the experience fluid.** Discoveries should emerge naturally from comparison, not become another mandatory workflow stage.

## 10. Recommended evolution roadmap

The following sequence is proposed.

| Phase | Focus | Objective |
|---|---|---|
| 1 | Real-world use | Understand how people compare concepts and what they want to preserve. |
| 2 | Discovery experience design | Define what a Discovery is and how it should be created, revisited and edited. |
| 3 | Data model design | Design account ownership, source concept links, question relationships and concept lineage. |
| 4 | Discovery persistence | Allow users to save an observation and the concepts that inspired it. |
| 5 | Question creation | Link new questions explicitly to their originating Discovery. |
| 6 | Concept lineage | Link subsequent visual concepts back to the Discovery that inspired them. |
| 7 | Visual exploration | Explore ways of presenting families of related concepts and discoveries. |

The first implementation should be deliberately small.

A user should be able to save a Discovery containing an observation and two source concepts. The resulting record should be revisitable.

Question creation and concept lineage can follow once the basic Discovery experience has been validated.

## 11. What Curitopia might ultimately become

Curitopia is moving beyond a question organiser or image-generation tool.

It has the potential to become a personal visual thinking environment that helps people:

- Follow their own curiosity.
- Give abstract ideas a visual form.
- Recognise unexpected relationships.
- Identify shared underlying principles.
- Develop new questions from those insights.
- Build new concepts from previous discoveries.
- Follow the evolution of their own thinking over time.

The Library becomes more than a collection of saved images. It becomes a collection of intellectual artefacts, each with its own history and potential to inspire something new.

The central idea is:

**Curiosity generates questions. Questions generate concepts. Concepts reveal connections. Connections generate discoveries. Discoveries generate further curiosity.**

The process has no fixed endpoint.

---

**Standing:** This document captures an emerging product direction. It does not authorise migrations, application changes or a rewrite of the existing architecture. Real-world use of the current Curitopia experience should inform the next design decisions.