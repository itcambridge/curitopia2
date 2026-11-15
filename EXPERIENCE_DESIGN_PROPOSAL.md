# Experience design proposal

**Status:** Design proposal, refined for Phase 3b. No application change is approved by this document.
**Specification:** `EXPERIENCE_SPEC.md` version 0.3. That file is unchanged by this refinement.
**Reference:** Section 10 of that specification, and the prototype transcript in `Original_test_md`.
**Date:** 2026-11-13

## 1. Recommendation

Build Experience as **the Clearing**.

The Clearing is one calm workspace. A conversation discovers meaning. Adopted meaning settles into an open landscape of depth: what the person cares about but cannot determine sits further away; what they can shape sits in the middle; what they can choose sits near. One experiment appears as an invitation on that ground, connected to the curiosity and the choices that make it possible.

The conversation and the landscape are the same experience. A proposal is drawn where it would live if the person kept it. The thread of how the AI arrived there stays available, and the person can correct it.

This follows the specification’s central line: curiosity gives a reason to explore, agency reveals a place to act, and an experiment gives a reason to become curious again.

## 2. Concepts considered

### 2.1 The Clearing — recommended

The situation is a landscape of depth, not three filing columns. The latest conversational move is visible with the landscape. Earlier turns stay in a thread the person can reopen.

**Strengths**

- Relationships can be seen: a concern, the influence that might touch it, and the choice that makes an experiment possible.
- Proposals occupy the place they describe, so the screen does not become a chatbot beside a dashboard.
- Desktop has room for the ground. Mobile can become a reading of the same ground, one band at a time.
- Concern, Influence, and Control remain the mental model without becoming three task lists.
- One experiment can sit in the open space as an invitation.

**Weaknesses**

- A spatial layout can become decorative if every item is drawn at once. The design has to keep the ground sparse and hide editing until an item is chosen.
- Connecting lines are easy to overuse. Only a few confirmed relationships should be drawn.
- The first implementation must resist sliding back into three columns with permanent Edit, Move, and Remove controls.

### 2.2 The Margin — alternative

The conversation is the whole screen, as in the prototype transcript. Each AI move appears as a paper slip in the thread: a reading, a proposed direction, a few candidate phrases, or one experiment. When the person keeps something, it gathers at the top as a short adopted record. Relationships are written in a sentence under an item. There is no spatial map.

**Strengths**

- Closest to the successful prototype, which was a sequence of cognitive moves in prose.
- The same layout works on a phone and a wide screen. A phone does not have to shrink a diagram.
- Authorship is obvious: a slip is a hypothesis until the person keeps it.
- Easier to build, and easier to keep accessible, because it is a document.

**Weaknesses**

- The specification asks the landscape to make relationships and openings visible. A transcript can describe a connection and still feel like a chat log.
- Adopted items gathered at the top can turn into another list of notes.
- The Margin does less to change the feeling of the current screen. It removes the columns, and it does not yet give the person a situation to look across.

### 2.3 Why the Clearing is the recommendation

The prototype’s value was the thinking. The specification’s new demand is that the same thinking become visible as a situation, with an experiment as an opening inside it. The Margin preserves the thinking and underuses the visual half of the brief. The Clearing keeps the thread, and it gives adopted meaning a place.

The current three-column map is not a third concept to develop. It already exists, and the specification sets it aside as a data-entry foundation.

## 3. The Clearing

### 3.1 What the person sees

The page keeps the current entry and return. The curiosity name remains the title. Beneath it, the North Star is one serif sentence when the person has one. While it is still a proposal, the sentence is visibly tentative and offers Keep, Edit, and Leave.

The ground below uses depth:

- **Far.** Concern. Shorter, quieter phrases. They matter, and their outcome is not the person’s to determine.
- **Middle.** Influence. Phrases the person may be able to shape.
- **Near.** Control. Phrases the person can choose, practise, or manage. These sit closest and are the easiest to read.

A phrase is a line of the person’s language, or a candidate in the AI’s language until it is kept. It is not a card with a checkbox. Permanent Edit, Move, and Remove controls stay off the ground. Choosing a phrase reveals where it sits for now, the one-line meaning of that circle, and the actions Edit, Move, Remove, and Link.

### 3.1.1 Agency is dynamic

Concern, Influence, and Control are a reading of reach at this moment. They are not a filing the person is stuck with, and they are not a score.

A phrase can move in either direction. A concern can become something the person can influence after they learn, practise, gain trust, access, or authority. A phrase can also move outward when they see that an outcome really does depend on someone else, on a deadline, or on conditions they cannot determine. That outward move is a useful discovery. The interface uses the same Move action for both directions. It does not praise one and regret the other. It does not count moves, animate a promotion, or draw a trail of past places.

The detail of a selected phrase says which circle it is in **for now**, and shows that circle’s one-line meaning:

- Concern: matters to me, and I cannot determine the outcome.
- Influence: I can shape this, and I cannot guarantee it.
- Control: I can choose, do, practise, or manage this.

Move lists all three circles. Choosing another one shows the destination’s one-line meaning and asks the person to confirm. Cancel leaves the phrase where it is. After confirm, the phrase is simply in the new band.

The AI may suggest a move. The suggestion names the current circle, the proposed circle, and the reason. The phrase stays in the current circle until the person confirms. Dismissing the suggestion leaves the phrase where the person last put it.

There is no dashboard of agency, no before-and-after chart, and no motion that plays on its own. Change is visible because the phrase now sits in a different band, and because the thread can show the sentence “Moved to Influence” or “Left in Concern” after the person decides.

The experiment, when one has been offered or kept, is a single invitation on the ground. Its name is serif. One sentence says why it belongs to this curiosity. Opening it shows how the person might try it, and what they might learn even if the outcome goes another way. It has no status, date, or owner.

### 3.2 Where the conversation sits

On a wide screen, from the large breakpoint already used for a side column, the latest exchange sits in a quiet column beside the ground. The ground uses the remaining width and stays sparse: a handful of phrases, not a board of cards. The person’s reply is one field. The AI’s latest reading is prose. A structured proposal also appears in the place it would occupy if kept.

“The thread” opens earlier turns in that column. The person can scroll to a previous reading or a tangent and reply from there. The curiosity name, the North Star, and the ground stay in view, so a tangent does not replace the situation.

On a 375px-wide screen the page is one column, in this order: the latest exchange, the North Star, the three bands as one shared ground, then the invitation if one exists. “The ground” moves to the bands. “The thread” opens earlier turns above the field. Relationships are sentences under the phrase. The phone does not draw lines and does not shrink the desktop diagram.

The model is not called when the page opens. The person speaks first. The facilitator then receives every concept of this curiosity, as described in `EXPERIENCE_AI_ARCHITECTURE.md`. The screen does not ask the person to pick questions or concepts for that context, and it does not treat an unconverted question as part of it.

### 3.3 Visual language

Use the existing materials: cream page, paper panels, stone lines, deep teal text, Georgia for the North Star, the experiment name, and a kept insight, and sans for controls and explanations. Coral marks the one commitment on the view, such as Keep on a proposal the person is ready to hold. Quiet outlined actions carry Edit, Leave, and Remove.

Botanical imagery stays out of this screen. The garden already carries that metaphor. The Clearing should feel open and editorial, not like a game of planting, scoring, or tending.

Distance is shown by size, weight, and position, and also by the words Concern, Influence, and Control. Colour is not the only distinction. Far items are not greyed out in a way that fails contrast. Body text stays at the colours already specified for paper.

Whitespace is part of the design. A first reading may hold a handful of phrases and one invitation. The person can reveal the rest. Filling the ground with every candidate is a failure of this concept.

### 3.4 Relationships

A relationship is one sentence between two kept phrases. It shows leverage. It is not a general graph, and the person does not draw arbitrary arrows.

The first version allows only these links:

- An influence may affect a concern: “{influence} may affect {concern}.”
- A choice may shape an influence: “{choice} may shape {influence}.”

A concern does not link straight to a choice. The path goes through an influence. One concern may have more than one influence, and one choice may shape more than one influence, until the cap.

At most three relationships are on the ground at once. Link is unavailable at three, with the sentence “Three connections are on the ground. Remove one to add another.”

**How a person makes one.** They select a kept phrase and choose Link. The page lists only eligible partners in the neighbouring circle. They pick one. The sentence appears with Keep and Leave. Keep holds the relationship. Leave discards it. There is no free-form relationship builder and no drag-to-connect.

**How the AI makes one.** It proposes the same kind of sentence, with a reason. If it is unsure, the sentence begins with “Possibly” and stays tentative. Keep holds it. Leave removes it from the ground. The proposal remains in the thread.

**How it is seen.** Every relationship has the written sentence. On a wide screen, lines appear only for the phrase that is selected, and only for its own links. The resting ground does not draw the whole web. On a phone there are no lines. Removing a phrase removes its relationships.

In Phase A these relationships are held for the visit. They are not a database record. The page says so. A later schema, if the links prove useful, is described in the implementation plan and is not part of this refinement.

## 4. Conversation and landscape

| Moment | In the thread | On the ground |
|---|---|---|
| The person describes a situation | Their words remain in the thread as their statement | Nothing is written onto the ground |
| The AI separates forces or offers a reading | The reading is prose, labelled as a reading | Nothing is adopted |
| The AI proposes a North Star | The proposal is explained | The sentence appears in the North Star place as tentative |
| The AI proposes phrases for the landscape | Each phrase has a reason | Tentative phrases appear in the far, middle, or near ground |
| The person keeps, edits, or leaves a phrase | The decision is recorded in the thread | Only a kept phrase becomes durable |
| The AI offers an experiment | The reason names the source curiosity, question, or concept | One invitation appears, unkept until the person keeps it |
| The person follows a tangent | The thread keeps the earlier focus available | The ground does not rearrange itself unless the person adopts a change |
| The person returns in the same visit | The thread is still in the page | Kept North Star and phrases are still there. Unkept proposals are not treated as beliefs |
| The person returns in a later visit, before thread storage exists | The thread from the earlier visit is gone, and the page says the conversation was held for that visit | The kept North Star and kept phrases are restored from the Experience |

A proposal may be deferred. Defer leaves it in the thread and off the durable ground.

## 5. Key interactions

The person can:

- Write in their own words, with or without the model.
- Choose specific questions and concepts from this curiosity to bring in. Nothing from the curiosity is treated as selected until they do.
- Read a reasoning, and answer “that is not what I meant.”
- Keep, edit, leave, or defer a North Star, a phrase, a relationship, or an experiment.
- Move a kept phrase from any circle to any other circle, and read the reason when a move is only a suggestion.
- Open the thread and reply to an earlier turn.
- Follow a tangent, then return to the North Star and the original description, which stay on the page.
- Leave without keeping anything. The curiosity and its questions remain as they were.

There is no step counter and no required order. The AI may offer a reading before a map, or an experiment before a complete landscape, when the conversation has earned it. The person may ignore the offer.

Editing controls appear on the chosen phrase. They do not sit on every phrase at rest.

Drag-and-drop is not required. Move is a named action with the three destinations. Keyboard focus reaches the thread, the North Star, each phrase, and the invitation.

## 6. How an experiment becomes inviting

An experiment is discovered, not assigned. The AI offers one. A second may be mentioned only when it is a genuinely different scale of exposure, and it stays in the thread until the person asks to see it.

The invitation shows:

- A short name in the person’s or the AI’s words. “The Constructive Challenge” is the reference example.
- One sentence of why, tied to something already in this curiosity or this conversation.
- What the person might notice, including a result that is not the one they hoped for.
- The shape of trying it, as a short sequence they can open, written as a way of approaching a moment rather than as tasks.

The invitation uses paper and a coral edge, set on the ground near the choices it depends on. It does not use a checkbox, a due date, a progress mark, or a reminder.

Keeping an experiment means the person wants to hold it as an intention. It does not mean they have agreed to perform it, report on it, or finish it. They can remove it.

## 7. Reference journey, state by state

This is the interaction a developer implements. It uses the opening the person actually gave and the moves the prototype then made. The transcript records no acceptance, edit, or rejection. Each proposal therefore stays tentative until the person acts. Where the transcript stops, the screen waits.

The transcript also contains an AI passage about recurring tunnels and subway journeys. Section 10 of the specification does not require that passage. It is the example of a tangent in state 11. It does not become a dream-interpretation feature.

Phase A builds states 1, 2, and the manual parts of the ground: phrases, moves, and relationships, with no model. The later states describe the facilitated experience.

Wide and narrow layouts differ in placement, not in what is true. On a wide screen the thread is beside the ground. On a 375px screen the same regions stack: thread, North Star, ground, invitation.

### 7.1 Opening an existing Experience

**The person sees** “Opening the experience…”, then the curiosity name, “Return to {name}”, and either the restored North Star and phrases or the empty ground in 7.2. They do not see another curiosity’s phrases while this load runs.

**The person can** return to the curiosity, write, or continue. They cannot change the curiosity’s stage from this screen.

**The AI** says nothing. The page does not call the model.

**On the landscape** restored kept phrases sit in the circles last saved. Relationships from an earlier visit are absent until a later schema exists. The page does not invent them.

**Tentative** nothing, until a new proposal arrives.

**Durable** the Experience row, the North Star if one was saved, and kept phrases.

**Reject or edit** nothing is proposed yet. Edit and Move appear only after a phrase is selected.

**After a tangent** not applicable. The wider situation is the whole page.

### 7.2 An empty Clearing

**The person sees** the curiosity name, a North Star place that says “A direction can live here.” with “Write a North Star”, and one ground framed as a single situation. The three bands are visible and named, with their one-line meanings. Each band says “Nothing here yet.” The field is empty.

**The person can** write a North Star or add a phrase to any band. The facilitator’s context is the concepts already developed for this curiosity. The person does not choose a subset before the conversation.

**The AI** is silent.

**On the landscape** the three bands share one frame so they read as one situation. There are no phrases and no lines.

**Tentative** nothing.

**Durable** nothing new until the person saves a North Star or a phrase.

**Reject or edit** there is no proposal to reject.

### 7.3 Entering the professional situation

**The person sees** their words in the thread once they send them. The reference wording is the contractor paragraph: paycheck, project budget, hired technical skill, other people’s ways of working, ego, and deadlines. The ground is unchanged while they type.

**The person can** send that message, edit it before sending, or bring in selected questions and concepts first. They can also add phrases by hand.

**The AI**, after the message is sent, replies in prose, labelled “A reading”: the person is accountable for technical value and does not necessarily own the environment where that value has to be delivered. It may then ask whether to bring in existing questions or concepts. That invitation selects nothing by itself.

**On the landscape** no phrase is added by the reading.

**Tentative** the reading.

**Durable** the user message is part of the visit’s thread. Nothing new is stored as a North Star or a phrase.

**Reject or edit** the person replies that the reading is wrong. The reading stays in the thread as a past reading. The ground stays as they left it.

### 7.4 The interacting forces

**The person sees** three named readings in the thread:

- Technical responsibility: identify problems, recommend solutions, help deliver.
- Commercial reality: value is shown by useful work and delivery.
- Human dynamics: a disagreement about an approach can feel personal.

**The person can** reply about one force, or ignore them and write something else.

**The AI** presents the three as forces operating at once. It does not place them on the ground in this move.

**On the landscape** unchanged.

**Tentative** the three readings.

**Durable** unchanged.

**Reject or edit** a reply such as a correction stays in the thread. The AI’s next turn must be able to drop or reword a force. No force is stored as a phrase unless a later landscape proposal is kept.

### 7.5 Technical judgement and decision authority

**The person sees** one sentence set off in the thread, still labelled as a reading: they may be technically responsible for identifying an approach without having the authority to decide that it will be adopted.

**The person can** agree in their own words, correct it, or move on.

**The AI** offers that distinction and invites correction.

**On the landscape** unchanged.

**Tentative** the sentence.

**Durable** unchanged. Keeping a reading does not, by itself, write a North Star.

**Reject or edit** Leave is not required for a reading that was never a landscape object. A correcting reply is enough. The sentence remains visible in the thread as what was offered.

### 7.6 Proposing the North Star

**The person sees** a tentative serif sentence in the North Star place:

“How can I exercise my professional judgement while navigating different perspectives, maintaining trust and delivering meaningful outcomes?”

Keep, Edit, and Leave sit with it. The elaboration — confidence without attachment to being right, challenging constructively, knowing when to influence rather than insist — is in the thread beside the sentence, not in the stored field.

**The person can** keep, edit, leave, or ignore it and keep typing.

**The AI** proposes the direction. The transcript mentions moving away from an earlier framing about ego. That earlier wording is not in the file as something the person wrote. The screen must not invent a previous North Star. It shows this sentence as a proposal only.

**On the landscape** the North Star place holds the tentative sentence. The bands are still empty unless the person has added phrases by hand.

**Tentative** the sentence and the elaboration.

**Durable** only after Keep. Keep stores the sentence in `north_star` if it fits 400 characters. The elaboration stays in the thread. Edit lets them change the sentence, then Keep stores their wording. Leave clears the tentative sentence and does not write. A North Star they had already saved is left intact if they Leave a new proposal.

**After a tangent** the North Star place remains at the top of the ground, including on the phone, above the bands.

### 7.7 Introducing the landscape

**The person sees** tentative phrases, each marked tentative, with its reason available when the phrase is selected.

Far: whether colleagues accept a recommendation; whether someone feels challenged; organisational politics and ownership; the deadline; how the organisation values the contribution.

Middle: trust and credibility; how recommendations are presented; helping people understand risk; alternatives and trade-offs; influencing a decision through evidence.

Near: quality of the analysis; clarity; listening before challenging; time; when and how to escalate; how to respond to disagreement.

The thread says the outer concerns still matter, and that the useful question is where energy goes.

**The person can** keep or leave each phrase, edit its wording, and move a kept phrase to another circle. They do not have to fill every band.

**The AI** proposes the phrases and the reason for each circle. It does not write them.

**On the landscape** tentative phrases appear in the three bands. Resting phrases do not show Edit, Move, and Remove. Selecting one shows those actions plus “for now” and the circle’s one-line meaning.

**Tentative** every phrase the person has not kept.

**Durable** a kept phrase, stored with `addCircleItem` in the circle they confirmed. An edit stores their wording. Leave removes that phrase from the ground and leaves it in the thread. Remove on a kept phrase deletes the row.

**Reject or edit** leaving one phrase does not leave the others. Moving a kept phrase asks for confirmation and then updates `circle`. Either direction uses that same confirm step.

### 7.8 Relationships between selected phrases

**The person sees** at most three proposed sentences, for example “How technical recommendations are presented may affect whether colleagues accept a recommendation.” and “Whether you listen before challenging may shape how technical recommendations are presented.” An unsure link begins with “Possibly” and includes the reason.

**The person can** Keep or Leave each sentence. They can also select a kept phrase and use Link to choose one eligible neighbour, then Keep or Leave the resulting sentence.

**The AI** proposes only the allowed pair types, and stops at three. It explains the leverage in the thread.

**On the landscape** a kept sentence is under both phrases. On a wide screen, selecting a phrase draws only that phrase’s links. On a phone, the sentence is the whole representation. The resting wide layout does not draw every line at once.

**Tentative** a proposed or “Possibly” link.

**Durable** in the current schema, nothing. A kept link is held for the visit and the page says so. Leaving it removes the sentence and any line.

**Reject or edit** Leave drops that link only. The phrases stay. There is no editor for custom relationship types.

### 7.9 The Constructive Challenge

**The person sees** one invitation, visually tentative, named The Constructive Challenge. Opening it shows the five movements from the prototype: the shared goal and the timing, the other person’s reasoning, the risk or trade-off, alternatives, and who decides on what evidence. It also says that if a decision goes another way, the risk can be understood and documented and the work can continue.

**The person can** open it, Keep, Edit the name or the reason, or Leave. They are not asked to start it, schedule it, or report on it.

**The AI** offers this one experiment and no list of alternatives.

**On the landscape** the invitation sits with the near band, because it depends on choices the person can make. It is not a phrase in Control, and it has no status.

**Tentative** the invitation.

**Durable** in this phase, only for the visit after Keep, with a visible note that it is not stored yet. Leave removes it from the ground. The proposal remains in the thread.

### 7.10 Why the experiment is relevant, and a specific disagreement

**The person sees** one or two sentences on the invitation: it comes from the situation they described, and it sits with the proposed direction. The source shown is their own description. If they had selected a question or concept, the invitation could name that record only when the server had loaded it.

Below that, still in the thread, two optional sets appear, each with a free-text reply and “None of these”:

- The technical approach seems wrong.
- A better approach exists, and the current design is already agreed.
- A risk is visible, and raising it might delay delivery.
- The disagreement is about how the problem is being approached.

And, separately:

- Protecting relationships while getting the right outcome.
- Knowing when to push back and when to let go.
- Getting decisions made before deadlines.
- Feeling that expertise is not being recognised.

**The person can** answer one set, both, neither, or type a situation the lists miss.

**The AI** asks which situation feels familiar, and what is hardest. It does not choose for them.

**On the landscape** the North Star, the kept phrases, the kept sentences, and the invitation stay as they were.

**Tentative** the invitation, if not kept, and the unanswered choices.

**Durable** unchanged by the questions themselves.

**The transcript ends here.** No choice is recorded. The screen waits. It does not pick a situation, does not advance a step, and does not mark the experiment as begun.

### 7.11 Returning to the wider situation

This is the screen while it waits, including after the tunnel-and-subway passage if that passage is present in the thread.

**The person sees** the passage in the thread as a reading, if the model offered it. The curiosity name, the North Star place, the ground, and the invitation remain. “The thread” can be closed so the situation is what fills the page. On the phone, the ground is still the next region after the North Star, not a separate mode they must unlock.

**The person can** reply to the tangent, scroll back to the distinction or the North Star proposal, or ignore the tangent.

**The AI** has not been answered. It does not continue, and it does not rewrite the North Star or move a phrase because of the tangent.

**On the landscape** unchanged, unless the person keeps or moves something themselves.

**Tentative** the tangent, as a reading.

**Durable** unchanged.

**Reject or edit** a reply that the tangent is not useful stays in the thread. The situation on the ground is the same either way.

### 7.12 Reflecting after a try

The transcript does not contain a reflection. This state is what the screen does when the person later describes a try. It does not fire on its own, and this document does not invent their account.

**The person sees** their message in the thread. The reply, labelled as a reading, separates what they report, what they had expected, and what they learned. The invitation is not marked complete.

**The person can** correct the reading, or stop.

**The AI** does not request a report. It responds only because they wrote.

**On the landscape** unchanged by the reading alone.

**Tentative** the reading.

**Durable** unchanged until they keep a new phrase, a new question, or a move.

**Reject or edit** a correction in the next message. Nothing is moved or completed by the reading.

### 7.13 A possible change in agency

This state follows only if, in a later conversation, the model suggests a move. The transcript does not contain that suggestion. The example shape, not a claimed event, is: “How recommendations are presented may now sit in Control, because you can choose the form of the next recommendation.” An outward example is equally valid: “Whether colleagues accept the recommendation still sits in Concern, because their decision is theirs.”

**The person sees** the phrase still in its current band, and a tentative note naming the current circle, the proposed circle, and the reason, with Confirm and “Leave it here”.

**The person can** confirm or dismiss. Confirm uses the same Move confirmation as a manual move.

**The AI** suggests. It does not call `moveCircleItem`.

**On the landscape** the phrase moves only after confirm, with no reward and no animation of progress. Dismiss leaves it in the current circle. The suggestion remains in the thread.

**Tentative** the suggested move.

**Durable** the new circle, only after confirm.

**After a tangent** the phrase’s current circle is still the one the person last confirmed, including if they spent the previous turns on a specific disagreement.

## 7A. Empty, loading, error, and unavailable

| State | What the person sees | What remains possible |
|---|---|---|
| Loading | “Opening the experience…” The previous curiosity’s ground is not shown. | Return is available once the name is known. No model call. |
| Empty | State 7.2. | Write a North Star, add a phrase, or choose sources. |
| Experience row cannot be stored | The existing production or refused notice. The curiosity name is shown. | Read and return. No North Star or phrase editors, and no model call. |
| North Star column or phrase table missing | The existing notice that the content migration is not in this development database. | The Experience identity remains. Editors stay hidden. |
| Model unavailable or the route fails | The draft message stays in the field. A short error says nothing was saved by the model. | Manual North Star and phrase editing. Kept rows are untouched. |
| Second request already running | The existing “nothing extra was sent” response. | The first request continues. The ground does not duplicate phrases. |

## 8. Accessibility and responsive behaviour

- The ground is also a list of phrases grouped by Concern, Influence, and Control, so a screen reader does not depend on position.
- Each phrase has an accessible name that includes its wording and its circle.
- Keep, Edit, Leave, Move, and Remove are text actions. Icons alone are too ambiguous for these decisions. This uses the design system’s rule that an ambiguous action keeps its words.
- Focus is a 2px coral outline. Targets are at least 44px.
- Contrast uses the existing text colours on cream and paper. Coral is a fill or an edge, not small text on cream.
- Relationships have the written sentence. A line is drawn only on a wide screen, and only for the selected phrase.
- The phone layout stacks: thread, North Star, three bands, one invitation. It does not ask the person to pan a diagram.
- The wide layout places the thread beside the ground from the large breakpoint. Below that, it stacks. The wide ground stays sparse rather than filling the extra width with controls.
- Reduced motion keeps placement changes instant.
- The page remains usable when the model is unavailable: the person can still write a North Star and phrases by hand, using the persistence that already exists.

## 9. Boundaries this proposal keeps

Garden, Visualise, and Library stay as they are. Experience remains a separate screen for one curiosity and does not change `curiosities.stage`. One Experience row per curiosity remains the foundation. Another curiosity’s questions are not pulled in unless a later, explicit decision allows the person to select them.

The person is the authority on meaning. The Clearing shows proposals as proposals until they are kept.
