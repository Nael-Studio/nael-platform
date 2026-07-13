# 05 — ORM quick wins (current package, no schema changes)

**Goal:** correctness + everyday ergonomics on `MongoRepository` without touching
document metadata. All work in `packages/orm/src/repository/mongo-repository.ts`
+ `packages/orm/src/interfaces/repository.ts` + tests.

## Context — read first
- `packages/orm/src/repository/mongo-repository.ts` (all 513 lines)
- `packages/orm/src/interfaces/repository.ts` (abstract base — new methods may
  need to be added there too; check how `MongoRepository` extends it)
- `packages/orm/src/events/write-notifier.ts` — every new write path must emit
- Existing tests in `packages/orm/tests/` for the mocking style used (repository
  tests run against a mocked `Collection`)

## Task 1 — Atomic `save()`
Current update path (`mongo-repository.ts:153-179`) is `updateOne` + `findOne`:
two round trips and a race window. Replace with a single
`collection.findOneAndUpdate(filter, update, { returnDocument: 'after',
includeResultMetadata: false, session })`. Preserve exact current semantics:
timestamps via `prepareForUpdate`, `emitWrite('update', …)` with the returned doc,
throw the same "Failed to load entity after update" error when no match. Insert
path unchanged.

## Task 2 — Convenience methods
Add to `MongoRepository` (and base interface where it generalizes):

```ts
exists(filter): Promise<boolean>                    // countDocuments limit:1, soft-delete aware
findOneOrFail(filter, options?): Promise<Doc>       // throws EntityNotFoundException
findByIdOrFail(id, options?): Promise<Doc>
updateOne(filter, update, options?): Promise<Doc | null>  // findOneAndUpdate, returns mapped doc
increment(filter, field, by = 1, options?): Promise<number>   // $inc, returns modifiedCount
distinct<K>(field, filter?, options?): Promise<K[]>
```

`EntityNotFoundException` extends the core `ApplicationException` family (see
`packages/core/src/exceptions/`) with entity name + filter summary in the message;
HTTP/GraphQL layers should already map it via existing exception utilities —
verify and add mapping if absent (404 / NOT_FOUND).

## Task 3 — `aggregate()` passthrough with soft-delete guard
```ts
aggregate<R>(pipeline: Document[], options?: AggregateOptions & { withDeleted?: boolean }): Promise<R[]>
aggregateCursor<R>(...): AsyncIterable<R>
```
When the document has `softDelete` and `withDeleted` is not set, prepend a
`$match` stage with the existing not-deleted filter (reuse
`buildNotDeletedFilter`). Do **not** attempt to rewrite user `$match` stages.

## Task 4 — Streaming reads
`findCursor(filter?, options?): AsyncIterable<OrmEntityDocument<T>>` — wraps the
Mongo cursor, maps each doc through `mapDocument`, respects soft-delete filtering
like `find()`. Document the "don't hold cursors across transactions" caveat.

## Task 5 — Pagination
```ts
findAndCount(filter?, options?): Promise<[Array<Doc>, number]>   // find + countDocuments in parallel
paginate(filter?, options: { limit: number; cursor?: string; sort?: Sort }): Promise<{
  items: Array<Doc>; nextCursor: string | null; hasMore: boolean;
}>
```
Cursor = base64url of the last item's sort-key values + `_id` tiebreaker
(keyset pagination, NOT skip/limit). Default sort `_id: 1`. Reject `cursor`
combined with a changed `sort` (encode the sort in the cursor and compare).

## Testing requirements
Per task: happy path, soft-delete interaction (`withDeleted` on/off), and
write-notifier emission where applicable. Follow the existing mocked-collection
test style; keyset pagination gets a multi-page walk test (3 pages, stable order,
no duplicates/skips with ties on the sort field).

## Out of scope
No `@Prop`, relations, hooks, or migrations here (spec 06). No new deps.
