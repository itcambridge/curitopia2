# Curitopia --- Phased Art Direction & Improvement Plan

**Companion document:** `Art-Directors.md`\
**Audience:** Cursor and the product team\
**Purpose:** Turn the Curitopia art-direction brief into a safe,
reviewable implementation sequence.

------------------------------------------------------------------------

## 1. Objective

Develop Curitopia into a coherent, welcoming environment where people
fall in love with discovering things they love and exploring the things
they already love.

The work should strengthen the emotional identity and intuitive purpose
of each page without disrupting the product's existing functionality,
architecture or data.

This is a phased plan. Complete and review each phase before moving to
the next.

## 2. The experience we are building

  -----------------------------------------------------------------------
  Phase             Page              User experience   Emotional quality
  ----------------- ----------------- ----------------- -----------------
  1                 Home              Discover what you Invitation
                                      love              

  2                 Question Garden   Follow your       Play and
                                      curiosity         permission

  3                 Visualise         Discover what     Recognition and
                                      attracts you      choice

  4                 Gallery           Appreciate what   Wonder and
                                      you've discovered reflection

  5                 Compare           Discover          Insight and
                                      connections       possibility

  6                 Experience        Understand and    Perspective and
                                      find your agency  calm
  -----------------------------------------------------------------------

The visual identity should remain recognisably Curitopia throughout:
warm cream and parchment, Curitopia orange, natural greens and
terracotta, expressive editorial serif typography, clean sans-serif
text, organic illustration and generous breathing room.

------------------------------------------------------------------------

# 3. A short arrival animation for every page

## 3.1 The principle

Before the user lands on each of the six pages, show a brief,
page-specific animation that introduces the purpose and emotional
character of that destination.

The animation should feel like a small moment of arrival: a seed being
planted, an idea taking shape, a blossom opening, two concepts meeting,
or a landscape settling.

It is not a loading screen, advert, tutorial or separate onboarding
step. It is a short piece of visual storytelling that makes the
transition into each page feel intentional.

**The user should understand the feeling of the page before they begin
using it.**

## 3.2 Timing and behaviour

Use these as initial design targets, then test on real devices:

-   Aim for approximately **600--900 ms** for the complete arrival
    sequence.
-   Keep the animation to one clear visual idea, not a multi-step film.
-   The destination page should be ready underneath or revealed as the
    animation completes. Do not introduce artificial network or loading
    delays.
-   Play once when the user navigates into a page, including direct
    entry where practical.
-   Do not replay because of an ordinary component re-render, state
    update, carousel movement or return from a small in-page
    interaction.
-   Avoid replaying the animation when the user is already on that page
    and changes only local state.
-   Keep the global navigation and app identity stable. The animation
    should belong to the destination, not make the whole application
    appear to reload.
-   Provide a way to skip or quickly dismiss the animation where
    appropriate, and never trap the user behind it.
-   Respect `prefers-reduced-motion`. For users who request reduced
    motion, replace movement with a very brief static title/illustration
    reveal or omit the sequence.
-   Avoid flashing, rapid scaling, excessive parallax, disorienting
    zooms or large movements.
-   Ensure the animation does not block keyboard access or screen-reader
    access to the destination.

The sequence should be short enough that it feels like a delightful
transition rather than a delay. If testing shows that it interrupts
flow, shorten it.

## 3.3 The six arrival animations

### Home --- A garden welcomes you

**Visual idea:** A small seed settles into warm soil. A tiny shoot
appears, then the wider garden or the user's curiosity cards gently
reveal themselves.

**Meaning:** This is a place where existing interests are cared for and
new interests can begin.

**Transition into page:** The seed/plant motif resolves into the Home
screen's existing visual language. The user's actual curiosities remain
the focus; do not replace real content with a generic animation.

**Feeling:** Warm, welcoming, full of possibility.

### Question Garden --- A thought takes root

**Visual idea:** A seed drops gently into soil. A subtle ripple or glow
passes through the soil, and a small sprout appears. The question-entry
area then comes into focus.

**Meaning:** A question is a seed. It is welcome here, whatever
direction it takes.

**Transition into page:** The sprout settles near the question-entry
area; the garden and existing questions become visible.

**Feeling:** Playful, permissive and full of potential.

### Visualise --- An idea comes into focus

**Visual idea:** Several faint question marks or question cards drift
softly into view. One card receives attention and transforms into a
small seedling or a simple visual frame.

**Meaning:** The user is noticing which question attracts them and
choosing to give it visual form.

**Transition into page:** The question cards settle into their
horizontal browsing arrangement. Do not automatically select a question
or imply that the application has chosen what matters.

**Feeling:** Recognition, attraction and personal choice.

### Gallery --- A blossom opens

**Visual idea:** A closed blossom or botanical form opens to reveal a
concept artwork card. The two-word title appears with it.

**Meaning:** A selected idea has become something memorable that the
user can revisit.

**Transition into page:** The blossom resolves into the actual Gallery
card or artwork. Preserve the user's real concept imagery and title.

**Feeling:** Appreciation, wonder and rediscovery.

### Compare --- Two ideas meet

**Visual idea:** Two distinct concept cards enter from opposite sides
and settle side by side. A fine organic line grows between them,
suggesting a possible connection without asserting what that connection
is.

**Meaning:** Two ideas can reveal something new when considered
together.

**Transition into page:** The real selected concepts appear in their
comparison positions. The connecting line remains subtle and does not
imply that the concepts have been merged.

**Feeling:** Curiosity, juxtaposition and possibility.

### Experience --- The landscape settles

**Visual idea:** Fine organic contour lines draw gently across a warm,
quiet landscape. The North Star statement appears or comes into focus;
the Concern, Influence and Control landscape settles into view.

**Meaning:** The user is entering a reflective space to understand their
relationship with the subject and where their agency lies.

**Transition into page:** The illustration resolves into the existing
Experience layout. Keep the conversation available and prominent; do not
make the animation feel like a barrier to talking.

**Feeling:** Calm, perspective, reassurance and agency.

## 3.4 Shared implementation requirements

Build the arrival animation as a small, reusable system rather than six
unrelated effects.

Cursor should first inspect the existing routing, layout and animation
dependencies and propose an implementation approach. Reuse existing
libraries and conventions if they are suitable; do not add a new
animation dependency without explaining why it is needed.

The shared system should support: - A unique visual sequence for each
destination. - Consistent timing and easing. - Route-entry triggering
without accidental replay on re-render. - Direct URL entry and browser
back/forward navigation. - Reduced-motion behaviour. - Skip/dismiss
behaviour if implemented. - Mobile and desktop layouts. - A graceful
fallback if an animation asset fails.

Keep page-specific artwork and animation details separate from the
shared transition mechanism. Avoid coupling animation state to business
data or persistence.

------------------------------------------------------------------------

# 4. Implementation phases

## Phase 0 --- Audit and implementation design

**Goal:** Understand the existing application before changing it.

**Work:** 1. Read `Art-Directors.md` and this plan. 2. Inspect the
current routes, app shell, page components, design tokens, global
styles, image assets and existing animation patterns. 3. Identify the
components shared by multiple pages, especially the header,
current-curiosity navigation, cards, carousels and page containers. 4.
Identify how navigation and route transitions currently work. 5. Check
how the existing horizontal looping carousels are implemented. 6.
Identify current responsive breakpoints and accessibility conventions.
7. Map the six arrival animations onto the existing architecture.

**Deliverable:** A short audit describing relevant files, reusable
components, risks, existing conventions and a proposed implementation
sequence.

**Acceptance criteria:** - No code or behaviour changed during the
audit. - No new dependency proposed without justification. - Any
uncertainty about routing, animation or page ownership is identified
before implementation.

## Phase 1 --- Shared visual foundations and arrival-animation framework

**Goal:** Establish reusable foundations before polishing individual
pages.

**Work:** 1. Consolidate or document the existing colour, typography,
spacing, border, radius and shadow tokens. 2. Establish consistent
styles for page headings, eyebrow labels, body text, cards, inputs and
interactive controls. 3. Define a small motion language: duration,
easing, opacity, translation and scale limits. 4. Implement the reusable
page-arrival mechanism. 5. Add reduced-motion handling and route-entry
lifecycle behaviour. 6. Create a simple test or demonstration
route/story for checking all six arrival sequences before integrating
them into the pages.

**Deliverable:** A consistent visual foundation and working
arrival-animation framework, initially using representative placeholder
sequences if needed.

**Acceptance criteria:** - Existing screens retain their current
behaviour and content. - Shared components use consistent design
tokens. - A page-entry animation runs once per genuine page entry, not
on re-render. - Reduced-motion users receive an appropriate
alternative. - The animation never delays data loading or traps
interaction. - No unnecessary new design system is introduced.

## Phase 2 --- Home: The invitation

**Goal:** Make Home feel like the entrance to the user's personal garden
of curiosity.

**Work:** 1. Refine the visual hierarchy between the Curitopia
definition, invitation headline, Library of Curiosities and
new-curiosity input. 2. Make existing curiosity cards feel like personal
collections worth revisiting. 3. Make creating a new curiosity feel like
planting a seed. 4. Integrate the Home arrival animation. 5. Check the
page at mobile and desktop sizes.

**Preserve:** - Existing curiosity creation and selection behaviour. -
Existing account and navigation functions. - The concise editorial tone
and uncluttered layout.

**Acceptance criteria:** - A first-time user can distinguish starting a
new curiosity from revisiting one. - Existing interests feel welcoming
and easy to return to. - The page feels warm and inviting without
becoming visually busy. - The arrival animation resolves into the actual
Home content.

## Phase 3 --- Question Garden: The playground

**Goal:** Make asking questions feel unrestricted, spontaneous and
enjoyable.

**Work:** 1. Refine the relationship between the page headline, seed
imagery, question input and existing questions. 2. Make the act of
planting a question feel satisfying but quick. 3. Use subtle visual
feedback when a new question appears. 4. Preserve the established
looping horizontal carousel direction wherever lists are presented. 5.
Integrate the Question Garden arrival animation. 6. Check that visual
feedback does not interrupt rapid question entry.

**Preserve:** - The user's ability to ask unusual, repeated, tangential
or apparently irrelevant questions. - Existing question creation,
persistence and navigation. - The ability to continue thinking without
being forced into curation.

**Acceptance criteria:** - The purpose of the page is immediately
apparent. - Asking a question remains the primary action. - New
questions receive gentle feedback without judgement or forced
categorisation. - The page supports a state of flow; animations never
slow repeated entry.

## Phase 4 --- Visualise: The moment of attraction

**Goal:** Help users notice which questions matter to them and give
selected questions a visual form.

**Work:** 1. Refine the question-card presentation and horizontal
browsing experience. 2. Make selection feel like giving an idea
attention, not completing a task. 3. Clarify the relationship between a
question, its generated visual and its two-word title. 4. Use
seedling/growth imagery selectively to reinforce the meaning of
selection. 5. Integrate the Visualise arrival animation. 6. Check card
behaviour on narrow mobile screens and larger displays.

**Preserve:** - The user's freedom to select only the questions they
care about. - Existing visual generation and saving behaviour. - The
two-word title convention. - Unselected questions as valid parts of the
exploration.

**Acceptance criteria:** - Users understand how to choose a question to
visualise. - Selected and unselected questions are distinguishable
without suggesting failure. - The resulting concept has a memorable
visual identity and title. - The arrival animation does not
automatically select or prioritise a question.

## Phase 5 --- Gallery: The personal collection

**Goal:** Make the Gallery feel like a collection of ideas the user
enjoys revisiting.

**Work:** 1. Refine the hierarchy between the Gallery heading, library
scope and concept artwork. 2. Give concept artwork and two-word titles
clear prominence. 3. Make horizontal browsing feel like wandering
through a personal gallery. 4. Improve the visual distinction between
individual concepts while retaining a coherent collection. 5. Integrate
the Gallery arrival animation. 6. Check image loading, cropping,
fallbacks and responsive card sizing.

**Preserve:** - Existing concept artwork, titles and original
questions. - Library scope and filtering behaviour. - Existing compare
entry point. - The dark artwork-card treatment where it is working well.

**Acceptance criteria:** - A user can recognise a concept by its artwork
and two-word title. - The collection feels personal rather than
administrative. - Artwork remains legible and visually strong on mobile
and desktop. - The arrival animation reveals the user's actual
collection.

## Phase 6 --- Compare: The meeting of ideas

**Goal:** Make the relationship between two concepts the focus of the
experience.

**Work:** 1. Refine the side-by-side layout and balance between the two
concepts. 2. Preserve each concept's independent artwork, title and
original question. 3. Give the space between concepts visual meaning. 4.
Explore a restrained connecting-line treatment that suggests possibility
rather than declaring a relationship. 5. Make swapping positions and
reading the full questions intuitive. 6. Integrate the Compare arrival
animation. 7. Review how a thought or newly prompted question is
presented after comparison.

**Preserve:** - Existing comparison logic and concept selection. - The
user's control over which concepts are compared. - The distinction
between the two concepts. - The possibility that no insight or new
question emerges.

**Acceptance criteria:** - It is immediately clear which two concepts
are being compared. - Neither concept loses its individual identity. -
The visual treatment encourages comparison without implying a
predetermined answer. - The user can access the original questions and
existing comparison actions.

## Phase 7 --- Experience: The reflective sanctuary

**Goal:** Make Experience feel like a calm, personal place for deeper
thinking and discovering agency.

**Work:** 1. Refine the visual hierarchy between the conversation, North
Star and Concern/Influence/Control landscape. 2. Make the three areas
understandable through their labels, descriptions, spatial arrangement
and visual treatment. 3. Preserve the flowing organic landscape and
contour-line language. 4. Give the North Star appropriate prominence
while keeping it editable. 5. Make conversation feel continuous,
contextual and approachable. 6. Integrate the Experience arrival
animation. 7. Check long content, conversation growth and mobile
scrolling carefully.

**Preserve:** - The open-ended conversation: no fixed questionnaire or
mandatory sequence. - The user's ability to edit or clear the North
Star. - The distinctions between Concern, Influence and Control. -
Existing AI context and conversation behaviour. - The user's freedom to
explore matters outside their control without being told they should not
care about them.

**Acceptance criteria:** - Users understand the difference between
Concern, Influence and Control. - The Experience feels calmer than the
Question Garden without feeling sterile. - The conversation remains an
obvious and accessible way to engage. - The North Star feels personal
and changeable. - The arrival animation settles into the actual
Experience content without delaying conversation.

## Phase 8 --- Cohesion, accessibility and final polish

**Goal:** Ensure the six pages feel like parts of one thoughtful
experience.

**Work:** 1. Review the six pages in sequence, not only as isolated
screens. 2. Check consistency of typography, colour, spacing, cards,
controls and botanical motifs. 3. Check that the garden metaphor
develops naturally rather than repeating the same decoration everywhere.
4. Check transitions between pages and ensure arrival animations feel
related but distinct. 5. Test direct links, browser back/forward,
repeated navigation and route changes. 6. Test keyboard navigation,
visible focus, contrast, screen-reader labels and reduced motion. 7.
Test mobile and desktop layouts, including long titles, empty states,
slow image loading and narrow viewports. 8. Check performance and ensure
animation does not cause layout shifts or interfere with interaction. 9.
Run the project's relevant lint, type-check, test and build commands.

**Acceptance criteria:** - All six pages have a clear and distinct
purpose. - The application feels like one coherent Curitopia world. -
Arrival animations are brief, consistent, accessible and non-blocking. -
Existing product functionality remains intact. - No page feels like a
compulsory task or productivity dashboard. - The user's curiosity,
ownership and agency remain central.

------------------------------------------------------------------------

# 5. Cross-phase guardrails

These apply to every implementation phase.

## Product behaviour

-   Do not change data models, persistence, routes, AI prompts, business
    logic or existing interactions unless the phase explicitly requires
    it.
-   Do not remove or automatically discard questions because they appear
    irrelevant or repetitive.
-   Do not impose completion requirements, scores, streaks or
    productivity metrics.
-   Do not invent new features simply because they fit the garden
    metaphor.

## Lists and carousels

-   Preserve Curitopia's established direction: lists should use a
    looping, horizontally scrolling carousel where appropriate.
-   Do not replace these with long conventional vertical lists.
-   Keep carousel controls usable with touch, mouse and keyboard.
-   Ensure the current item and focus state remain understandable.

## Responsive design

-   Treat mobile as a first-class experience, not a compressed desktop
    layout.
-   Check text wrapping, card widths, artwork crops, carousel
    affordances and navigation.
-   Avoid animations that move important content outside a small
    viewport.

## Accessibility and motion

-   Respect reduced-motion preferences.
-   Maintain adequate contrast and visible focus.
-   Do not communicate meaning through animation or colour alone.
-   Do not prevent users from interacting while decorative animation
    runs.
-   Avoid repeated or unexpected movement that could distract users.

## Visual restraint

-   Do not add botanical decoration to every available space.
-   Keep the interface readable and calm.
-   Use imagery to communicate meaning and emotion, not to fill empty
    space.
-   Preserve the existing editorial character of Curitopia.

------------------------------------------------------------------------

# 6. How to work with Cursor

Use `Art-Directors.md` as the enduring creative brief and this document
as the implementation roadmap.

For each phase, ask Cursor to work in two steps:

### Step A --- Inspect and propose

Cursor should: - Read both documents. - Inspect the relevant existing
implementation. - Identify the files and components likely to change. -
Explain how the page-specific arrival animation will fit into the shared
transition system. - Identify risks to existing behaviour and responsive
layouts. - Present a focused implementation proposal.

No code should be changed during this step unless explicitly requested.

### Step B --- Implement and verify

Once the proposal is agreed, Cursor should: - Implement only the
approved phase. - Reuse existing components and design tokens. -
Preserve unrelated behaviour and code. - Test the page at mobile and
desktop sizes. - Check the arrival animation, including reduced-motion
behaviour. - Run relevant project checks. - Summarise changed files,
visible results, tests run and unresolved issues.

Do not start the next phase until the current phase has been reviewed.

------------------------------------------------------------------------

# 7. Reusable Cursor prompt

Copy this prompt and replace the phase number and name each time:

> Read `Art-Directors.md` and `Curitopia-Phased-Improvement-Plan.md`
> before starting.
>
> We are working exclusively on **Phase \[number\] --- \[name\]**.
>
> Follow the objective, scope, preservation requirements and acceptance
> criteria in the plan.
>
> First inspect the existing implementation. Identify the relevant
> files, reusable components, current behaviour and any risks. Explain
> how the page's brief arrival animation will work with the shared
> animation framework.
>
> Present a concise implementation proposal. Do not modify code until I
> approve the approach.
>
> Once approved, implement only this phase. Do not refactor unrelated
> code or change data models, persistence, AI behaviour or other page
> functionality unless explicitly agreed.
>
> Verify the result at mobile and desktop sizes, check reduced-motion
> behaviour, run the relevant project checks and report exactly what
> changed and what remains unresolved.

------------------------------------------------------------------------

# 8. Definition of success

The work is successful when a person can move through Curitopia and
intuitively feel the purpose of each destination:

-   Home welcomes them into their world of curiosity.
-   Question Garden gives them permission to wonder.
-   Visualise helps them notice what attracts them.
-   Gallery lets them appreciate and revisit what they have discovered.
-   Compare helps them see what might emerge between ideas.
-   Experience helps them understand their relationship with a subject
    and discover where they have agency.

The animations should make each arrival feel like entering a new part of
the same garden.

Above all, Curitopia should not make curiosity feel like work.

> **Curitopia should feel like a place where people fall in love with
> discovering things they love and exploring the things they already
> love.**
