# INBOX-ZERO-001 — sort the Saved inbox one item at a time

- **Authorization:** Gavin's queue pick **5** (checkpoint #457), "Inbox zero". **Lane: routine.** No new data or
  commands: every action is an existing one.
- **What:** MORE → Saved gains **SORT INBOX · N**, which shows one item at a time ("1 of N") with four actions:
  - **MAKE TASK** runs `makeSavedItemTask`, then offers REMOVE FROM INBOX or KEEP HERE.
  - **HIGHLIGHT** runs `createHighlight`, then offers the same choice.
  - **KEEP FOR LATER** moves to the next item.
  - **REMOVE** needs a second tap (CONFIRM REMOVE) before it runs `deleteSavedInboxItem`.

  It ends on "All sorted." with how many items were kept. STOP SORTING returns to the list.
- **Rules:** a task or highlight never deletes the item by itself, and removing always takes a second tap. "Project"
  from the original idea is left out because no add-to-project command exists for saved items, and adding one
  would change command semantics.

**Leverage gate.**
- **REUSE:** the Saved inbox commands, `createHighlight`, and the Things / GTD one-at-a-time inbox processing pattern.
- **OWN:** the flow.
- **BUILD FROM SCRATCH:** none.

**Evidence.** `tests/browser/SortInbox.test.tsx`: task then remove, keep for later, remove with confirm, all
sorted, and the record counts.
