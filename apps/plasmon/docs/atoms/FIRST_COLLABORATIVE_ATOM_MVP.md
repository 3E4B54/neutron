# First Collaborative Plasmon Atom — Hackathon MVP Scope

Status: **SCOPE CONTRACTION FOLLOW-UP — DESIGN ONLY**

Parent architecture: `FIRST_COLLABORATIVE_ATOM_DESIGN.md` at `d842fd93d6ea080e8170caae26c5ccc78d65647a` remains approved and authoritative for the broader architecture/research direction.

This document does **not** replace or substantially revise that design. It narrows the first implementation target to answer one product question:

> What is the smallest Review Atom that proves the Plasmon Atom abstraction and improves Plasmon GUI review without becoming Jira, Scrum software, or Google Docs?

## 1. Scope decision

The hackathon Review Element does **not** need a general collaborative Markdown editor.

It does **not** need Yjs or another CRDT for version 1.

It does **not** need text-range comments, live cursor presence, per-user text undo, arbitrary concurrent source editing, dependency-aware selective history surgery, sophisticated checkpoint retention, or a generalized collaboration framework.

The recommended first implementation is:

```text
provider-owned structured Review state
        +
typed authenticated commands
        +
append-only meaningful activity/events
        +
durable whole-Atom revisions
        +
owner restore to a prior revision
        +
Markdown/TODO import and export
```

That is sufficient to prove the architectural chain that matters:

```text
Element
  -> multiple logical Atoms
  -> one live Atom shared through MTN
  -> several authenticated humans operate on it
  -> AI operates on the same structured Atom
  -> independent evidence is preserved
  -> meaningful history and recovery work
```

This is the hackathon target.

---

## 2. What one MVP Atom is

One Atom remains exactly the logical object defined by the approved architecture:

> **One Review Atom is one independently shareable live review workspace.**

For the hackathon, that workspace contains only what is needed for GUI review coordination:

- stable review items imported from a Markdown/TODO template or created later;
- a title and optional descriptive Markdown/text for each item;
- each human participant's independent test result;
- lightweight coordinator/work metadata;
- item comments/replies;
- meaningful recent activity;
- durable revisions sufficient for owner restore;
- source/import/export metadata.

It does **not** make the complete Markdown source a simultaneously editable Google-Docs-like surface.

A single physical Review Element installation must still be capable of owning multiple logical Review Atoms:

```text
Review Element installation
  ├─ Atom A: Plasmon GUI review
  ├─ Atom B: Sharing review
  └─ Atom C: Later regression review
```

Proving this logical separation from the physical app instance is a primary MVP objective.

---

## 3. Product goal: a dog-food review board, not project management

A typical Review item may look like:

```text
#72  Text editor opens Monaco

Brian:       NOT WORKING
Alice:       WORKING
Carol:       NEEDS POLISH

Desired:     MUST
Effort:      Small
Owner:       Agent 2
Work state:  NEEDS RETEST
Blocked by:  #61

Comments:
- Alice: Opens, but keyboard focus is wrong.
- AI Agent: Likely related to OpenWithServiceModel integration.
```

The central invariant is:

```text
human test evidence
    !=
coordinator/work metadata
```

Brian saying `NOT WORKING` must remain intact when a coordinator sets the item to `NEEDS RETEST`, `IN PROGRESS`, or `DONE`.

The tool should make it easy to answer:

```text
What is broken for multiple reviewers?
What has not been tested?
What needs polish?
What MUST items are still unresolved?
What is ready for Agent 2?
What needs retesting?
What changed recently?
```

That is enough coordination for the current Plasmon GUI review.

The Review Element should explicitly **not** add:

- story points;
- sprint ceremonies;
- velocity/burndown charts;
- epics;
- complex workflow configuration;
- automatic prioritization;
- Scrum roles/process;
- generalized issue-tracker machinery.

A "sprint" can simply be a saved or temporary query/view over existing Review fields. It is not a new state machine or generic Atom concept.

---

## 4. Pressure-test: is Yjs/CRDT required?

### Decision: no, not for version 1

Yjs remains a strong future option if Review later becomes a genuinely collaborative document editor, as documented in the approved architecture.

However, the hackathon's concurrent actions are naturally independent structured writes:

```text
Alice sets her result on item #72
Bob sets his result on item #72
Carol comments on item #72
AI sets work state to NEEDS RETEST
Brian changes Desired to MUST
```

These do not require a text CRDT.

The provider can serialize typed commands while preserving independent state. Two users updating different fields do not overwrite each other because the data model already gives those fields distinct identities.

For example:

```text
review result key = (itemId, participantPrincipal)
comment key       = commentId
coordinator data  = itemId + coordinator fields
```

A conflict only exists when two authorized actors update the **same coordinator field** or the **same mutable item description**. For MVP, ordinary optimistic concurrency is sufficient:

```text
command carries baseRevision
provider accepts when safe
or returns current revision/conflict
client reloads and retries intentionally
```

This is dramatically simpler than importing a CRDT runtime and still avoids silent lost updates.

### What is lost by deferring Yjs?

The MVP will not provide:

- simultaneous character-by-character editing of the same description;
- offline merge of arbitrary text edits;
- shared cursors/selections;
- text-range annotations that survive arbitrary editing;
- per-user collaborative text undo.

None is required to validate the first real Atom.

### Re-entry criterion for Yjs

Add Yjs or another CRDT only when a concrete product requirement appears such as:

> Two or more people must simultaneously edit substantial free-form document content and ordinary revision-conflict handling is materially harming the workflow.

Do not add it merely because the broader Atom architecture can support sophisticated collaboration.

---

## 5. Canonical MVP state

The MVP canonical state is a provider-owned structured Review document/database, not Markdown text.

Conceptual schema only:

```ts
type AtomId = string;
type ReviewItemId = string;
type CommentId = string;
type RevisionId = string;
type PrincipalId = string;

type TestResult =
  | "not_tested"
  | "working"
  | "not_working"
  | "needs_polish";

type Desired =
  | "must"
  | "high"
  | "normal"
  | "later"
  | null;

type Effort =
  | "tiny"
  | "small"
  | "medium"
  | "big"
  | "really_big"
  | null;

type WorkState =
  | "untriaged"
  | "needs_design"
  | "ready"
  | "in_progress"
  | "blocked"
  | "needs_retest"
  | "done"
  | "deferred";

interface ReviewAtom {
  atomId: AtomId;
  atomType: "plasmon.review/v1";
  title: string;
  items: ReviewItem[];
  currentRevision: RevisionId;
  source?: SourceImport;
}

interface ReviewItem {
  itemId: ReviewItemId;
  title: string;
  descriptionMarkdown?: string;

  // Human evidence: independent per participant.
  results: Record<PrincipalId, ParticipantResult>;

  // Review-specific coordination only.
  coordination: {
    desired: Desired;             // default null / unset
    effort: Effort;               // default null / unset
    owner?: PrincipalId | string; // human or named agent reference
    workState: WorkState;         // default untriaged
    blockedBy?: ReviewItemId[];
    dependsOn?: ReviewItemId[];
  };

  comments: CommentId[];
}

interface ParticipantResult {
  participant: PrincipalId;
  result: TestResult;
  note?: string;
  updatedAtNs: string;
  updatedByEvent: string;
}

interface Comment {
  commentId: CommentId;
  itemId: ReviewItemId;
  author: PrincipalId;
  actorType: "human" | "ai" | "system";
  body: string;
  createdAtNs: string;
  replyTo?: CommentId;
}
```

### 5.1 New requirements must remain untriaged by default

When a human or AI adds a new Review item, the defaults are deliberately:

```text
Desired:   unset
Effort:    unset
Owner:     unset
Work state: Untriaged
```

A newly discovered requirement does **not** automatically become `MUST`, enter the current work queue, or acquire an owner.

This preserves a meaningful distinction between:

```text
"we discovered this"
```

and:

```text
"we decided this is current priority"
```

### 5.2 Test evidence remains separate

A participant's evidence is never inferred from coordinator metadata.

Valid state:

```text
Brian result:   NOT WORKING
Work state:     NEEDS RETEST
Desired:        MUST
Effort:         Small
Owner:          Agent 2
```

Likewise setting `Work state: DONE` does not rewrite all human results to `WORKING`. Retesting remains evidence-producing activity.

---

## 6. Typed commands instead of generalized collaboration

The MVP provider exposes narrow Review operations.

Conceptually:

```text
atom.get
atom.listMine

review.listItems
review.getItem
review.createItem
review.updateItemText
review.setMyResult
review.setCoordination

comment.list
comment.add
comment.reply

activity.list
history.listRevisions
history.getRevision
history.restoreRevision

export.markdown
```

The provider derives the actor from the authenticated MTN context. A client cannot claim another participant identity in `setMyResult`.

### 6.1 Human concurrency

Typed operations make the common concurrent case naturally safe:

```text
Alice -> setMyResult(#72, working)
Bob   -> setMyResult(#72, not_working)
```

These touch different participant records.

Comments append rather than overwrite.

Coordinator metadata updates can use the current Atom revision or a small field-level expected-value check to detect actual same-field conflicts.

### 6.2 AI uses the same state, not the GUI

The AI consumes the same typed Review API and MTN authorization model.

Minimum useful AI reads:

```text
list items
read participant results
filter disagreement
filter not working
filter needs polish
filter not tested
read coordinator metadata
read comments
read recent activity
```

Minimum useful AI writes, when granted:

```text
add comment
create review item
set coordinator/work metadata
optionally set its own test result
```

No DOM scraping is canonical.

---

## 7. Comments: item-level only for MVP

MVP comments attach to a stable `ReviewItemId`.

That solves the actual review need:

```text
#72 Text editor opens Monaco
  Alice: focus is incorrect after opening
  AI: likely regression from Open With path
```

Replies may be represented with a simple `replyTo` relationship or flat ordered comments if that is materially faster to implement.

The MVP does **not** require:

- paragraph/block anchors;
- text-range anchors;
- CRDT relative positions;
- rich annotation layers;
- generalized comment protocol shared by every Atom type.

Those remain HIGH/ADVANCED capabilities from the approved architecture.

---

## 8. Activity and history: simplify aggressively

The Review tool needs to show meaningful recent activity such as:

```text
15:42 Brian       marked #72 NOT WORKING
15:43 Alice       commented on #72
15:45 AI Agent    set #72 work state to NEEDS DESIGN
15:51 Brian       set #72 Desired to MUST
```

This does not require a Git-like history engine.

### 8.1 Append-only meaningful events

Each accepted mutation appends a small provider-authored event:

```ts
interface ActivityEvent {
  eventId: string;
  revisionId: RevisionId;
  atomId: AtomId;
  actor: PrincipalId;
  actorType: "human" | "ai" | "system";
  occurredAtNs: string;
  operation: string;
  itemId?: ReviewItemId;
  summary: string;
}
```

The event stream is for attribution/activity and can contain enough structured before/after information to render useful changes.

It must not contain bearer tokens.

### 8.2 One durable revision per accepted mutation or transaction

For the hackathon, simplicity beats storage optimization.

After each accepted provider transaction, create a durable revision that can reconstruct the full Atom state.

Conceptually:

```text
R100 -> state after Alice result
R101 -> state after Bob result
R102 -> state after AI comment
R103 -> state after Desired=MUST
```

Implementation may store full snapshots or snapshot-plus-delta internally, but that storage optimization is not an MVP architecture requirement.

The contract only needs the behavior:

```text
list revisions
inspect revision
restore revision
```

### 8.3 Owner restore instead of generalized selective revert

The MVP recovery mechanism is:

> **Restore the whole Atom to revision R.**

Restore creates a **new current revision** whose contents equal the selected historical revision.

Example:

```text
R103 D accidentally destroys several items
R104 more activity occurs
R105 Brian restores state from R102
```

History remains visible:

```text
R103 destructive mutation
R104 later mutation
R105 restored Atom from R102
```

The provider never rewrites or deletes prior history.

### 8.4 Why generalized event-level revert is not MUST

Selective dependency-aware revert requires substantially more machinery:

- semantic inverse operations;
- dependency analysis;
- conflicts with later mutations;
- previews;
- partial rollback behavior.

The dog-food MVP can recover safely with whole-Atom restore because Review Atoms are small and human-readable.

Selective revert is HIGH after MVP if real usage demonstrates that whole-Atom restore loses too much unrelated later work.

### 8.5 No sophisticated checkpoint-retention design yet

For hackathon-sized Review Atoms, retain all revisions or a plainly generous bounded count.

Do not build:

- history compaction algorithms;
- CRDT garbage collection policy;
- branch graphs;
- merge commits;
- Git-like ancestry.

Measure actual data volume first.

---

## 9. Markdown/TODO import and export

Markdown remains a portable representation, not the canonical collaboration database.

### Import

Input:

```markdown
- [ ] Text editor opens Monaco
- [ ] Download works
- [ ] Shortcut execution works
```

Import produces stable Review items:

```text
item A -> Text editor opens Monaco
item B -> Download works
item C -> Shortcut execution works
```

The imported Markdown checkbox value does not become shared participant evidence. It may be treated as source/template information only.

### Export

Export produces readable Markdown/TODO output.

A simple export may include coordinator summaries in ordinary text while keeping the result readable without Plasmon, for example:

```markdown
- [ ] Text editor opens Monaco
  - Desired: MUST
  - Effort: Small
  - Owner: Agent 2
  - Work state: Needs retest
  - Results: 1 working, 1 not working, 1 needs polish
```

Participant details/comments can optionally be emitted beneath items or into a second report section.

The exact export style is Review-specific. It does not need to round-trip every historical event into Markdown.

### Source relationship

For V1, import creates an Atom-owned copy. It does not live-edit the original file.

Applying/exporting back to a source path can be explicit later in the MVP if inexpensive, but two-way live filesystem synchronization is not required.

---

## 10. Sharing and MTN: minimum live path

Do not change MTN 0.2.

The approved architecture's key conclusion remains: the Review Atom is a live revision-free authorization resource, not a snapshot URL.

Minimal share flow:

```text
owner creates logical Review Atom
  -> issue MTN grant for Atom resource
  -> produce share URL
  -> recipient opens URL
  -> safe inspect determines required Review Element / rights
  -> exact recipient AppScope redeems
  -> live MTN lease
  -> recipient performs lease-bound Review provider calls
```

The Atom's current revision is application state, not MTN resource identity.

MTN remains authoritative for:

- AppScope;
- ownership/liveness;
- grants;
- bearer capabilities;
- leases;
- revocation;
- delegation;
- authorization epochs;
- authenticated cross-AppScope calls.

Review does not duplicate those facts.

---

## 11. Absolute minimum generic Atom/Sharing contract

The hackathon should resist turning Review-specific fields into generic platform abstractions.

The minimum **generic Atom** concepts needed are approximately:

```text
AtomId              stable logical ID distinct from app_instance_id
AtomType            application/resource protocol type
ElementId           application/package identity
create Atom         create logical object inside an Element provider
list/describe Atom  discover/open owned logical objects
open Atom            route Atom to its Element/provider
```

The minimum **generic live Sharing** concepts needed are:

```text
share Atom/resource
  -> issue MTN grant for stable revision-free resource identity

open shared resource
  -> safe inspect
  -> resolve/install required consumer Element
  -> redeem with exact consumer AppScope
  -> retain live MTN lease

call shared resource
  -> lease-bound typed provider operation

revoke share
  -> MTN revoke
```

The generic layer must preserve these separations:

```text
AtomId
!= ElementId
!= physical app_instance_id/AppScope
!= grant/bearer token
!= revision
```

### 11.1 What must remain Review-specific

The generic Atom platform does **not** need to understand:

- `working` / `not_working` / `needs_polish` / `not_tested`;
- Desired priorities;
- Effort sizes;
- Owner assignment;
- Work state;
- dependency/blocker references;
- comments;
- revision presentation;
- Markdown/TODO import/export rules;
- consensus queries;
- AI review queries;
- sprint-like filtered views.

Those belong to the Review Element's typed resource protocol.

### 11.2 No generalized collaboration abstraction in the hackathon contract

Do not freeze generic platform concepts such as:

```text
CollaborativeDocument
CommentThread
PresenceSession
CRDTOperation
UndoManager
TaskPriority
WorkflowState
Sprint
```

The Review MVP does not need them, and other Atom types may define collaboration very differently.

---

## 12. Permissions needed for MVP

Keep permissions similarly narrow and Review-specific where possible.

Conceptual rights:

```text
atom.read
review.set_own_result
review.comment
review.add_item
review.edit_item
review.coordinate
history.read
history.restore
atom.export
share.manage
```

Convenient grant templates may be:

```text
Owner
Reviewer
Coordinator
Viewer
AI collaborator
```

but rights remain the meaningful authorization surface.

The important domain invariant remains:

```text
review.set_own_result
    -> provider derives participant from authenticated MTN actor
```

A reviewer cannot submit "set Alice's result" simply by changing a request field.

AI receives only the rights needed for its task. `history.restore` and `share.manage` should not be default AI rights.

---

## 13. MUST for hackathon

These features are necessary to prove the Atom abstraction and make the dog-food tool useful.

### Platform/Atom proof

- **Multiple logical Review Atoms inside one physical Review Element installation.**
- Stable logical `AtomId` distinct from physical app instance/AppScope.
- Create/open/list/describe enough to operate those Atoms.
- One live Review Atom shareable through MTN 0.2.
- Shared URL -> safe inspect -> exact consumer AppScope redemption -> lease-bound live provider calls.
- MTN-backed revocation.

### Review data model

- Import Markdown/TODO into stable `ReviewItemId`s.
- Add a new review item.
- New items default to:

```text
Desired: unset
Effort: unset
Owner: unset
Work state: Untriaged
```

- Participant results:

```text
NOT TESTED
WORKING
NOT WORKING
NEEDS POLISH
```

- Results stored independently per authenticated participant.
- Simple aggregate counts/filters without overwriting individual evidence.
- Review-specific coordinator metadata:

```text
Desired: MUST / HIGH / NORMAL / LATER / unset
Effort: Tiny / Small / Medium / Big / Really Big / unset
Owner: optional actor/agent
Work state:
  Untriaged
  Needs design
  Ready
  In progress
  Blocked
  Needs retest
  Done
  Deferred
optional dependency/blocker item references
```

- Human evidence and coordinator metadata remain separate dimensions.

### Collaboration

- Item-level comments that append rather than overwrite.
- Authenticated actor attribution.
- Provider-owned structured state and typed commands.
- Basic optimistic revision/conflict protection for same-field edits.
- No arbitrary collaborative Markdown editing.

### AI

- Structured read API for items, results, coordinator fields, comments, aggregates/filters, and recent activity.
- AI can comment when authorized.
- AI can set coordinator metadata when authorized.
- AI mutations appear in the same activity/history as human mutations.

### Activity/recovery

- Recent meaningful activity feed.
- Durable revisions sufficient to inspect historical state.
- Owner can restore the entire Atom to a historical revision.
- Restore creates a new revision and preserves old history.
- No generalized selective-revert engine.

### Portability

- Export current Atom to readable Markdown/TODO form.

If these work, the hackathon has proved the architectural thesis.

---

## 14. HIGH after MVP

These are likely valuable soon, but should not delay the first proof.

- Edit richer Markdown descriptions with better same-field conflict UX.
- Comment resolution/reopen and richer reply threading.
- Item/block-level stable anchors beyond the item itself.
- Explicit source-file apply-back with source-hash conflict checks.
- Saved filters/views, including a simple "sprint" view over Desired/Owner/Work state.
- Assigned-reviewer lists and clearer "not tested" coverage views.
- Test/retest cycles preserving old evidence while requesting fresh evidence.
- Selective event/item revert if whole-Atom restore proves too coarse.
- Better revision diff UI.
- Activity filtering by actor/item/time.
- Optional online/viewing presence implemented simply, without requiring CRDT presence.
- Delegated/reshared MTN flows and improved share administration UX.
- Alternative compatible Element routing after Atom protocol/type contracts mature.

Yjs should remain in this tier until real collaborative free-form text editing becomes a demonstrated need.

---

## 15. ADVANCED

These capabilities show how sophisticated future Atoms can become but are intentionally outside the first Review tool.

- Yjs/Automerge or another CRDT for arbitrary simultaneous document editing.
- Offline-first multi-writer merge.
- Text-range comments with durable relative anchors.
- CRDT presence/cursors/selections.
- Per-user collaborative text undo.
- Change-by-change dependency-aware selective revert.
- Historical branching/merge-like workflows.
- Sophisticated checkpoint compaction/retention.
- Rich document blocks and generalized annotations.
- Cross-Atom dependencies.
- Compatible Elements selected through a Powerbox-like chooser.
- Owner-compute versus recipient-compute execution choices.
- Portable full Atom archives with migrations between compatible Elements.
- General Atom collaboration protocols if multiple unrelated Elements demonstrate common requirements.

These remain compatible with the approved architecture. They are simply not evidence the hackathon needs to collect yet.

---

## 16. Minimal sequence flows

### Create Atom from TODO

```text
Owner
  -> Review Element: create from todo.md
  -> Review provider: allocate logical AtomId
  -> parse TODOs into stable ReviewItemIds
  -> persist structured state
  -> create revision R1
  -> open Atom
```

### Human joins and records evidence

```text
Alice opens share URL
  -> safe MTN inspect
  -> Review Element available/installed
  -> redeem with Alice's exact AppScope
  -> live lease
  -> review.setMyResult(#72, NOT_WORKING)
  -> provider derives Alice identity
  -> revision R12 + activity event
```

### AI coordinates without overwriting evidence

```text
AI reads #72
  Brian: NOT_WORKING
  Alice: NOT_WORKING

AI, with review.coordinate:
  -> set Work state = NEEDS_DESIGN
  -> set Desired = MUST
  -> add comment

Brian/Alice evidence remains unchanged.
```

### Owner recovers from a mistake

```text
R40 good state
R41 destructive/mistaken changes
R42 more changes

Owner selects "Restore R40"
  -> provider writes current state equivalent to R40
  -> creates new revision R43
  -> activity says "Brian restored Atom from R40"

R41/R42 remain in history.
```

### Revoke participant

```text
Owner revokes grant in MTN
  -> future Alice provider call fails authorization
  -> Alice's prior evidence/comments remain part of Atom history
```

---

## 17. Why this is still a real Atom proof

Removing CRDT editing does **not** weaken the central architectural experiment.

The difficult platform questions are still exercised:

```text
Can one Element own multiple independent logical resources?
Can one of those resources be shared live without becoming a file download?
Can MTN authorize several people against that one resource?
Can the application preserve independent actor-specific state?
Can an AI use the same resource without DOM automation?
Can revocation stop future access?
Can history/recovery exist without redefining Atom identity as a revision?
Can Markdown remain portable without being the Atom itself?
```

If the answer is yes, Plasmon has demonstrated a real Atom.

A CRDT would prove that a Review Atom can also be a sophisticated collaborative editor. That is a useful later capability, not the foundational proof.

---

## 18. Final recommendation

Build the first Review Atom as a **small structured multi-user review resource**, not a document editor and not a project-management platform.

The hackathon architecture should be:

```text
Review Element
  -> many logical AtomIds

Review Atom
  -> stable ReviewItem records
  -> independent participant evidence
  -> lightweight Review-specific coordination fields
  -> item comments
  -> typed human/AI operations
  -> append-only meaningful activity
  -> durable revisions + whole-Atom restore
  -> Markdown import/export

MTN 0.2
  -> live authorization, lease, revocation, delegation
```

Specifically defer Yjs/CRDT collaboration until actual usage demonstrates a requirement for simultaneous free-form text editing.

This contracted MVP keeps the important architectural result from `FIRST_COLLABORATIVE_ATOM_DESIGN.md` while making the first implementation small enough to dog-food immediately:

> **Element -> multiple logical Atoms -> MTN live share -> human + AI operate on one Atom.**
