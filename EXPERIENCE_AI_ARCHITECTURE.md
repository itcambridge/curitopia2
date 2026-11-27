# Experience AI architecture

**Status:** Version 0.4. Curated exploration context. This revision is documentation only. It does not change the running route, prompt, or schema.
**Specification:** `EXPERIENCE_SPEC.md` version 0.3, especially sections 4, 9, and 10. That file is unchanged by this refinement.
**Date:** 2026-11-14

## 1. Responsibilities and boundaries

Experience AI is a facilitator for one curiosity’s situation. It does four kinds of work, and it stops before a fifth.

It may:

- Interpret a situation, including tensions, interacting forces, assumptions, and patterns grounded in what the person said and in the concepts they chose to develop for this curiosity.
- Propose a North Star as a direction, open to revision.
- Propose an agency landscape, with a reason for each placement, and distinguish an outcome from the actions or conditions that might affect it.
- Propose one experiment that grows out of this curiosity, and later help the person reflect on what a try revealed, including whether their reach has changed.

It does not:

- Write a North Star, phrase, relationship, or experiment into durable storage.
- Move a phrase between circles.
- Treat a hypothesis as the person’s belief.
- Diagnose, score, or promise that effort removes every constraint.
- Turn an experiment into a task, a reminder, or a completion record.
- Run because the Experience page opened.
- Read another person’s data, or this person’s other curiosities.
- Treat a question that was never developed into a concept as Experience context.
- Trust concept text, titles, or provenance supplied by the browser. The server loads those from the signed-in user’s rows.
- Use the image-prompt, title, or image routes for this work. Those routes have different jobs and different prompts.

The reference behaviour is the professional-judgement prototype: separate technical responsibility, commercial reality, and human dynamics; distinguish identifying an approach from having authority to adopt it; propose a direction; propose a map; notice The Constructive Challenge; explain the connection; then let the person choose a concrete disagreement.

`AI_BEHAVIOUR.md` is not in the repository. The standing AI rules used here are `PRODUCT_VISION.md` section 10, `USER_JOURNEYS.md`, and `EXPERIENCE_SPEC.md` section 4. Where the vision says AI helps only when requested, Experience still waits for the person to open the screen and to ask, or to send a message. Within that conversation the model may volunteer a reading or a proposal. That is the specification’s facilitation, and it is still a response to this Experience, not a background job.

## 2. What already exists

The app calls OpenAI chat completions from the server in two text paths:

- `POST /api/consider` loads one owned question and asks for a single image prompt. The system prompt forbids answering the question. The reply is plain text.
- `POST /api/titles` asks for exactly three titles as JSON Schema. The client sends the wording. Manual entry still works when the model fails.
- `POST /api/images` generates images from an accepted prompt. It is unrelated to facilitation.

Shared machinery worth keeping:

- `openAiSession` and `authenticateAiUser` bind the call to the signed-in user.
- `beginAiTurn` refuses a second call for the same user and endpoint in this process.
- `configuredTextModel` reads the server text-model environment.
- The API key stays in server environment. The browser uses the user session.
- Title suggestions already prove a strict JSON Schema response.
- `loadOwnedQuestionText` is the pattern for loading source text on the server from ids, rather than trusting the browser to supply another person’s rows.

A facilitator route, prompt, and structured reading now exist. The conversation is still held only for the visit. `reserve_ai_request` exists in the database and is not called. `DATABASE_BASELINE.md` records the decision to leave it unused and to control spend manually. This architecture does not wire it up.

The running route loads every concept for the opened curiosity, and the `concept_questions` provenance for those concepts, on every turn. It does not query the questions table, and it does not cap or drop that collection. Client-supplied question and concept ids are still accepted and are not used to choose it. A background sample is refused. Accepted experiments are still held only for the visit. Proposal attribution is still the single `sourceQuestionId` and `sourceConceptId` on an experiment.

Experience writes today are guarded by `experienceWriteTarget`. Only the development project ref `tnohnytbddsbchueghcf` is allowed. The production ref is refused even if it were added to the allowlist. A missing or malformed public URL is refused. The facilitator must use that same guard before any read of Experience content and before any model call that includes it.

## 3. Conversation context

Curiosity, questions, concepts, and Experience are different acts.

- **Curiosity** is the subject the person wants to explore.
- **Questions** are individual enquiries made while exploring it.
- **Explored concepts** are questions the person chose to develop into saved concepts. That conversion is the selection.
- **Experience** is the process of understanding what that exploration means, including agency and possibilities.
- **Experiments** are optional invitations to discover something by trying. They are not tasks.

Four kinds of material stay distinct in the prompt and on the page.

| Kind | Where it comes from | How the prompt names it |
|---|---|---|
| User statement | The latest message, and earlier `user` turns in the validated transcript | “The person said” |
| Curated exploration | Every concept of this curiosity, loaded by the server, with the provenance of the questions those concepts were developed from | “Concepts the person chose to develop” |
| Kept Experience | The accepted North Star and the accepted Concern, Influence, and Control phrases | “The person has kept this” |
| AI hypothesis | An earlier `assistant` turn, or a new proposal | “A reading” or “A proposal” |

There is no background sample. An unconverted question is not attached because it is recent, and it is not attached because a control was left on. The model may focus on one concept, connect several, or leave some unused. It still receives the complete collection on every turn. It must answer the latest message, and it must not force every concept into every reply.

An inferred relationship between concepts is a hypothesis. The prompt must not present it as something the person stated or endorsed.

### 3.1 What the browser may send

- `curiosityId` and `experienceId`
- `message`: the latest user text, a separate field
- `turns`: earlier transcript messages, untrusted
- a client token so a double submit does not start two generations

The browser does not send a system prompt, a developer prompt, an ownership claim, or the text of a question or concept as if that text were a verified record. If the person pastes a question into `message`, that paste is a user statement, not a concept and not provenance.

`selectedQuestionIds`, `selectedConceptIds`, and `includeBackground` are not part of this context model. If a client still sends them, the server does not use them to include, exclude, or rank concepts, and it does not use them to add questions.

### 3.2 Where the curated collection comes from

No concept of the opened curiosity is excluded because the Experience screen did not show a checkbox. The person already selected it by developing a question into a concept.

The records are the ones in the repository, not an assumed shape from older notes.

`concepts` is one saved artwork for one curiosity. The columns that carry meaning for the facilitator are `id`, `title`, `for_considered_text`, `curiosity_id`, `user_id`, and `created_at`. `title` is one word or two. `for_considered_text` is the considered wording the selected image was made for. It is a snapshot of that generation question, not a live pointer and not a description. There is no description column. `image_path`, `image_model`, and `prompt_version` identify the stored image. They are not sent.

`concept_questions` is many-to-many provenance from a concept to the questions that informed it. Each row has `concept_id`, a nullable `question_id`, `original_text_snapshot`, a nullable `considered_text_snapshot`, `curiosity_id`, and `user_id`. The snapshots are the wording at the time the link was saved. Deleting the live question sets `question_id` to null and leaves the snapshots. A later edit to the live question does not rewrite them. Saving a concept writes at least one link. A later edit can remove links.

`questions` holds live enquiries: `original_text`, nullable `considered_text`, and `disposition` (`gathered`, `retained`, `parked`, `discarded`). A question that never became a concept stays in this table only. Experience does not read it for facilitation.

The concept is the unit of selection. An originating question explains that concept. It is not chosen again inside Experience.

### 3.3 What the server loads

After authentication and the development-project guard, the server uses the signed-in user’s client. It does not use a service role. It derives the curiosity and the concept collection from those rows. It does not accept concept text from the client.

On every `POST /api/experience` it loads:

- the curiosity name, for the opened curiosity
- the Experience row only when its id belongs to that curiosity and that user
- the kept North Star and kept phrases
- every `concepts` row for that curiosity
- every `concept_questions` row for those concepts

It does not query `questions` to build this context. The snapshots are the origin the concept still carries. Live question text can change later, and reading the questions table would be a route back to enquiries the person did not develop.

For each concept the prompt receives:

- `id`
- `title`
- `for_considered_text`, named as the wording the image was made for
- `created_at`, so the collection has an order without using that order to drop anything
- references to its provenance entries

Provenance is sent once for each distinct source, not copied onto every concept that shares it.

- The same live `question_id` is one source. Identical snapshot text for that question is sent once. If two links to that question have different snapshot text, both wordings are sent, each once, with the concepts that use each wording. Different history is not collapsed.
- A link whose `question_id` is null is keyed by its snapshot pair. Identical detached wording is sent once.
- Each provenance entry includes `original_text_snapshot`. It includes `considered_text_snapshot` only when that column is non-null. That considered snapshot is the wording captured for the link. It is not a separate essay, and it is omitted rather than invented when the column is null.
- The entry includes the live `question_id` when the link still has one.

A concept with no `concept_questions` rows is still included, using its title and `for_considered_text`. The prompt says the originating question could not be recovered. `for_considered_text` remains the generation wording. It is not relabelled as the original question.

Images are not sent.

The Library keeps a concept visible when its source question is discarded or removed. This version includes every concept row for the curiosity.

### 3.4 What stays out

- Questions that were never linked from a concept of this curiosity.
- A background sample of unconverted questions, and any control that would add one silently.
- Concepts belonging to another curiosity, or to another user.
- Themes, cover images, and the account-wide library as a wider corpus.
- Discarded or unselected material that is not part of these concept rows and their provenance links.
- Live `questions.original_text` and `questions.considered_text`.
- Service-role access.
- Provider secrets, and the prompts used by the image and title routes. The concept’s own `for_considered_text` is still sent, as the wording its image was made for.
- Unkept proposals described as adopted facts. Prior assistant turns are labelled as earlier readings.

### 3.5 Transcript validation

The transcript is untrusted client input. The server validates it before any provider call. Failure returns 400 and sends nothing.

| Rule | Limit |
|---|---|
| Allowed roles | `user` and `assistant` only |
| Any other role, including `system`, `developer`, and `tool` | Reject the request |
| Extra fields on a turn, or a client field named `system`, `developer`, `instructions`, or `prompt` | Reject the request |
| `turns` not an array, or a turn whose content is not a string | Reject the request |
| Empty content after trim | Reject the request |
| Message count in `turns` | At most 20 |
| Each turn, and `message` | At most 2000 characters after trim |
| Sum of turn contents | At most 12000 characters |
| `message` | Required, at least 1 character after trim |

`message` is the latest user statement. The server does not take the latest statement from the end of `turns`. If the last `user` turn has the same trimmed content as `message`, that duplicate turn is dropped so the model sees it once.

The provider messages are assembled only on the server, in this order:

1. The server’s system instructions. These are not read from the client.
2. An authoritative context block the server wrote: curiosity name, the complete curated concept collection and its deduplicated provenance, the kept North Star, and the kept phrases.
3. Each remaining transcript turn, prefixed so a `user` turn is “The person said” and an `assistant` turn is “Earlier reading”.
4. A final block, “Latest message from the person”, containing `message`.

A transcript turn cannot change that order or replace the system instructions.

### 3.6 Source ids on the way out

A concept id in the model’s JSON is kept only when it is one of the concept rows just loaded for this request. A question id is kept only when it is the live `question_id` on a provenance link of a concept id that was also kept on that same proposal. Any other id is discarded. The rest of a valid proposal can still be shown. The page does not link an invitation to a record whose id was discarded. Section 4.1 is the shape of those references.

### 3.7 Size and memory

The eight-concept ceiling is withdrawn. The server loads the complete concept set for the curiosity on every turn. It does not keep the latest eight, and it does not drop older concepts as the set grows. It does not summarise a concept in order to omit it.

Each stored text is already bounded: a title is at most 40 characters, and `for_considered_text` and each snapshot are at most 2000. The prompt sends those stored values. It does not add a second, silent cut that removes a concept. Shared provenance text is sent once, as section 3.3 describes. The kept landscape is included in full up to a modest cap; if it is longer, the prompt says the landscape was shortened.

If the provider rejects the turn because the context is too large, the route returns a plain failure. The landscape is unchanged. The route does not retry with a shorter concept list.

A later summary or hierarchical retrieval is a separate design. It is not part of the first implementation of this rule. If it is proposed, it has to keep every concept id addressable, label any summary as a summary rather than as the person’s exploration, and still be able to send a concept’s title, generation wording, and provenance in full. A summary must not become the only remaining copy of an older concept.

The first facilitated build keeps `turns` in the page for one sitting and sends them back as this untrusted transcript. That is enough for one visit. It does not survive a refresh. Persistence of turns is a later reviewed data change. Until then the page says the conversation is held for the visit. Kept North Stars and kept phrases still reload from the database.

### 3.8 How the facilitator is told to use the concepts

The server system instructions include this guidance, in substance:

> The concepts associated with this curiosity represent the user's curated exploration history. The user deliberately chose to develop these ideas further. Treat them as the primary context for understanding the user's journey.
>
> You may identify connections, tensions, recurring themes and contradictions across concepts. You may focus on one concept when it is most relevant to the current conversation.
>
> Do not assume the user has endorsed relationships you infer between concepts. Present those relationships as interpretations for the user to consider.
>
> Questions that were not developed into concepts are outside the scope of this Experience. Do not resurrect them as background material.

The same instructions say to respond to the latest message, and not to mention a concept merely to show that it was loaded.

## 4. Structured response

Add one route, `POST /api/experience`. Do not overload `/api/consider`.

Use chat completions, with a strict JSON Schema, following the title route’s `response_format`. Ask for one object:

| Field | Role |
|---|---|
| `say` | The prose the person reads in the thread. Required. |
| `move` | `reply`, `interpret`, `north_star`, `landscape`, `experiment`, or `reflect`. Required. Guides layout, and is not a wizard step. |
| `uncertainty` | Optional sentence when a connection is speculative. |
| `forces` | Optional named readings, used for the three-force moment. |
| `northStar` | Optional `{ wording, elaboration }`. `wording` must fit the existing 400-character North Star limit. |
| `phrases` | Optional candidates: `key`, `circle`, `body`, `because`, optional `meets` keys. `body` must fit the existing 240-character phrase limit. |
| `links` | Optional, at most three. Each links two phrase keys with `because` and `certainty` of `proposed` or `uncertain`. Only an influence-to-concern pair or a choice-to-influence pair is kept. |
| `experiment` | Optional single invitation: `name`, `why`, `sourceLabel`, optional `sourceQuestionId` or `sourceConceptId`, `approach` (short list), `mightReveal`. |
| `shift` | Optional suggestion that an existing kept phrase could move, with `phraseKey`, `from`, `to`, and `because`. Either direction is allowed. `because` is required. |
| `choices` | Optional short list. The interface always adds a free-text reply and “None of these.” |

The schema should set `additionalProperties` false and cap array lengths: a handful of forces, a modest set of phrases, one experiment, and at most two choice groups. Prefer one experiment. The prompt instructs the model to omit a field rather than invent a generic list.

`say` is always shown. Structured fields are proposals. The prompt’s job is the reference behaviour: do real interpretive work; separate outcome from leverage; explain placement; connect an experiment to a source; stay corrigible; ask one primary question when a question is useful; do not march through a fixed sequence.

`reasoning_effort` on the current text routes is `none`, so the token budget serves a short answer. Facilitation needs more thinking than an image prompt. Use a server-only setting for this route, with a timeout and a clear failure, and accept that a turn costs more than a title suggestion. Do not add a new vendor or an agent framework. It is still one chat completion.

Validate the JSON before it reaches the page. Drop a phrase whose circle is unknown, whose body is empty, or whose body exceeds 240 characters. Drop a North Star wording that fails the existing trim and length rules. Drop a link whose pair type is not allowed, whose keys are unknown, or that would exceed three links. Drop a shift that lacks `because`, names an unknown phrase, or names a circle outside the three. Drop a source id that fails section 4.1. If `say` is empty, return a failure and leave the page unchanged.

### 4.1 Provenance on a proposal

The running reading is one strict object: `say`, `interpretation`, `forces`, `interaction`, `followUp`, `northStar` (`wording`, `because`), `phrases` (`circle`, `body`, `because`), `revisions` (`itemId`, `body`, `because`), `shifts` (`itemId`, `circle`, `because`), and one `experiment` (`invitation`, `why`, `mightReveal`, `sourceLabel`, `sourceQuestionId`, `sourceConceptId`). North Star, phrase, revision, and shift proposals currently carry no concept id. The experiment carries one optional question id and one optional concept id. An id is kept only when it was among the records loaded for that request. A bad id does not drop the rest of a valid reply. The field table above is the earlier proposal shape. Provenance below attaches to the running proposals, not to fields the route does not return.

Version 0.4 adds an optional `sourceConceptIds` list to a North Star proposal, a circle phrase proposal, a phrase movement, and an experiment. At most four ids. The list is the concepts that materially informed that proposal. It is not a graph, and it does not record a relationship between the concepts themselves.

The server keeps an id only when it is a `concepts.id` loaded for that request. Any other id is removed. An empty list means the proposal does not claim a concept source. The proposal itself remains. The model is told the loaded ids and may copy only from that list. It must not invent an id.

The experiment may still carry `sourceLabel`, a short human phrase. That phrase is not checked against a row, and it is not evidence that the person endorsed the connection. `sourceQuestionId` is kept only when it is the live `question_id` on a provenance link of one of the validated source concepts. If no concept id validated, the question id is dropped too. A question that was never developed into one of those concepts cannot be cited. A movement’s `itemId` remains the kept circle phrase being moved. It is not a concept id.

The page can later show which concept titles informed a suggestion. This version does not add a provenance store or a concept-to-concept connection.

## 5. Authorship

The page and, later, any stored thread use the specification’s categories.

| Kind | How it is produced | What the page does |
|---|---|---|
| Source material | Every concept of this curiosity, loaded by the server, with provenance snapshots of the questions developed into those concepts | Named as the curated exploration. Not rewritten. An inferred link between concepts is a reading, not a statement the person made. |
| Background | Not used. Unconverted questions are not sampled. | Nothing is added to the prompt under that name. |
| User statement | The message the person sent | Kept in the thread as theirs. |
| AI hypothesis | `say`, `forces`, `uncertainty` | Shown as a reading. Not saved as a belief. |
| Candidate synthesis | `northStar`, `phrases`, `links`, `experiment`, `shift` | Shown as tentative, in the place it would occupy. A link is a sentence, kept only for the visit until a later schema. |
| User-confirmed insight | The person keeps or edits a reading or a North Star | The North Star sentence can use the existing column. A free-form insight beyond that waits for persistence. |
| Candidate map item or experiment | A phrase or invitation not yet kept | Visible, and removed from the ground if left or dismissed. |
| User-adopted item or experiment | The person keeps or edits | A phrase uses `addCircleItem` or `editCircleItem`. A move uses `moveCircleItem`. An experiment has nowhere durable to go until a later table exists, so the first build holds a kept experiment in the sitting and says so. |

The model output is never passed straight to `saveNorthStar` or `addCircleItem`. Those functions run only from Keep or from the person’s own typing.

## 6. Approval

Every candidate renders with Keep, Edit, and Leave.

- **Keep** writes through the existing development-guarded functions, after the same client-side preparation those functions already use. The thread records that the person kept it.
- **Edit** opens the wording, then Keep writes the edited text. The stored words are the person’s.
- **Leave** drops the candidate from the ground. The proposal remains in the thread so they can return to it.
- **Defer** is Leave plus leaving the proposal visible in the thread as unfinished. It writes nothing.

A suggested circle change shows the current place, the suggested place, and the reason. Either direction uses the same Confirm and “Leave it here”. Confirm runs `moveCircleItem`. Dismiss leaves the phrase where it is. Discovering that something sits further out is presented with the same quiet confirmation, not as a failure.

The person can also type a North Star or a phrase with no model involved, as they can today.

## 7. Experiment discovery

The prompt asks for one experiment when the conversation has enough specific material, and for none when it does not. The experiment names the concepts that informed it in `sourceConceptIds`, and says why in `why` and `sourceLabel`. Those concept ids have to be in the collection loaded for the turn. It does not cite a question that was not developed into one of those concepts.

The kinds of experiment the specification wants are instructions to the model, not five slots to fill:

- something they could try soon, inside their control
- something that might widen influence
- an assumption they could test
- a skill or relationship they could practise
- a possibility that appears only when two of their concepts are held together

The Constructive Challenge is the quality bar: specific to the tension, concrete enough to imagine, protective of the other person, and still faithful to the technical opinion. A generic “have a better conversation” is a failed response.

Safety copy belongs in the prompt: do not push the person to disclose, confront, spend, or take a professional risk they have not asked to explore. Prefer a reversible try. Offer the five-part shape as an approach they can open, not as assigned work.

Until an experiment table exists, Keep remembers the invitation in the sitting and the thread. Refresh loses that memory. The implementation plan treats durable experiments as a follow-on, after the invitation has been judged against the reference journey.

## 8. Reflection and agency growth

A reflect move happens when the person’s message is about something they tried or noticed, not on a timer. The model may return `shift` for an existing kept phrase, in either direction, with a reason. The page shows the current circle, the proposed circle, and that reason. Confirm is the only path to `moveCircleItem`.

The prose separates:

- what they say happened
- what they expected
- what they learned
- whether a skill, relationship, access, or credibility actually changed
- a new question, if one appeared

Movement inward is not a reward. Movement outward is not a failure. The model is told that a more accurate boundary is a valid outcome. A new question is offered in the thread. Planting it in the Garden uses the existing question insert, and only after the person asks to keep it as a question.

## 9. Security, privacy, and failure

- The route authenticates, checks the Experience write target, and loads rows with the user-scoped server client. RLS remains the database boundary. There is no service-role read.
- The concept collection is loaded for the opened curiosity from `concepts` and `concept_questions`. The browser does not supply that text. Client-supplied ids do not filter the set and do not add questions.
- A model concept id is kept only when it is in that loaded collection. A model question id is kept only when it is provenance of one of the validated source concepts. Other ids are discarded. The page does not link to them.
- Unconverted questions are not read for this route.
- The transcript is validated as in section 3.5. A `system` or `developer` role, or a client-supplied instruction field, rejects the request. Nothing is sent.
- Logs follow the title route’s habit: model name, status, finish reason, and lengths. They do not include the person’s words or the model’s prose.
- One in-flight facilitator call per user in this process, via `beginAiTurn` on a new endpoint name. A second click receives the existing “nothing extra was sent” response. This lock is process-local. That limit is already documented for the other routes.
- Timeout, refusal, invalid JSON, or a missing key returns a plain error. The kept North Star and phrases stay. The draft message stays in the field.
- The page does not call the route on open, on curiosity switch, or on merely viewing a phrase.
- Production configuration is unchanged. A production URL never reaches this route’s Experience reads, because the guard refuses it first.
- The person can delete a kept phrase with the existing delete. A later thread store needs the same owner delete. This proposal does not add that store.

## 10. Reuse

| Existing piece | Use in Experience |
|---|---|
| Experience screen, entry, and return path | Keep the route and the one-row-per-curiosity open. |
| `saveNorthStar`, circle add, edit, move, delete | The only durable writes, and only after Keep or direct editing. |
| `experienceWriteTarget` | Gate the new route. |
| `openAiSession`, `authenticateAiUser`, `beginAiTurn` | Gate and single-flight the new route. |
| Chat completions and strict JSON Schema | The response format. New schema, new prompt. |
| Owned concept and provenance reads | The curated collection in section 3. Question rows are not a facilitator source. |
| Manual North Star and phrase editing | The path when the model is absent or refused. |
| `/api/consider`, `/api/titles`, `/api/images` | Left on their current jobs. |
| `reserve_ai_request` | Left unused. |
| Concept images as model input | Not in the first facilitator. |
