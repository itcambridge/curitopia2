# Curiosity workspace

**Status:** Design for review. The migration is written and has not been applied.  
**Migration:** `supabase/migrations/20261028173000_curiosities.sql`  
**Deployed today:** `supabase/migrations/20261026000000_initial_v2_schema.sql` only. That file stays immutable.

## What V1 did

After sign-in, V1 opened a library of explorations, not a question map. A person could start a new exploration, open one and continue it, and return to the list. The title was the exploration name or, when none was stored, wording taken from its questions. The list showed last activity and question counts. There was no rename control on the list, no score, and no completed state. V2 restores the choice of a named working context, and adds an explicit rename. It does not restore V1 modes, orbits, experiments, or stories.

## Workspace model

An account holds many curiosities. A curiosity is one garden: its own questions, concepts, and Library. Gather, Curate, Visualise, and Distil read and write only that curiosity. Themes stay account-level optional labels. They are not a second workspace and are not shown in this cycle.

The signed-in person creates a curiosity by naming it, opens it, returns to the list, and renames it. The last stage (`gather`, `curate`, `visualise`, `distil`, or `library`) is stored on the curiosity so a later visit can reopen that stage. Unsaved image candidates stay in this browser under a key for that curiosity only. Switching curiosities loads a different key and does not read another curiosity's drafts. The older account-wide browser blob is left on disk and is not imported.

`user_id` remains the owner. `curiosity_id` is the membership. Both are immutable after insert. A question cannot be merged into a question in another curiosity. A concept and its provenance links share the concept's curiosity. Image paths stay `{user_id}/{concept_id}/kept.{ext}` and are not rewritten.

The browser may send a curiosity id. Row level security and the composite foreign keys decide whether that id belongs to the signed-in user. A miss returns no rows and the screen does not offer that id as an empty garden to fill.

## Existing data

The hosted project already has questions, concepts, provenance links, and private images. The new migration inserts one curiosity named `Garden` for each account that already has a question or a concept, then points those rows at it. The name can be edited afterwards. Accounts with neither questions nor concepts get no row, so the landing page stays empty until they name one.

The migration does not delete questions, concepts, links, or storage objects, and it does not change `image_path`. Deleting a curiosity later would cascade to its questions and concepts because account removal must still be able to remove those rows. The application does not offer that delete. Image files would not be removed by that cascade.

## What this does not claim

The migration has not been applied. Isolation has not been executed against the hosted database. Theme membership can still point at any question the same person owns, including questions in different curiosities, because themes are outside this cycle.
