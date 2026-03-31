# SPEC: True Press W26b — Friday Pagination Fix

> Architect: Claude Opus | 2026-03-31
> Status: RED (test exists, implementation pending)
> File: `E:/IA/Claude/Friday/dashboard/pages/news.js` (807 lines)

---

## Problem

Supabase REST API enforces a hard cap of 1000 rows per response. The `tpFetch` function in `news.js` makes a single request with `limit=5000`, but the server ignores this and returns only 1000 rows. The response header `Content-Range: 0-999/*` confirms truncation. The database has ~3,847 records in `processed_news`.

The Friday dashboard `#news-total-count` shows 1000 instead of 3,847+. The E2E test `w26-no-limit-own-articles.spec.ts` Test 1 asserts `> 2000` articles and fails.

## Root Cause

`tpFetch()` (line 179) calls `fetch()` without a `Range` header and without `Prefer: count=exact`. Supabase defaults to returning rows 0-999.

## Solution

Add a `tpFetchAll(table, query)` helper that paginates using the `Range` request header and parses the `Content-Range` response header to determine total count. Replace the `tpFetch` call in `fetchNews()` with `tpFetchAll`.

### Supabase Pagination Protocol

Request headers:
- `Range: 0-999` — fetch rows 0 through 999
- `Prefer: count=exact` — forces Supabase to include total in Content-Range

Response header:
- `Content-Range: 0-999/3847` — means rows 0-999 of 3847 total

Algorithm:
1. First request: `Range: 0-999`
2. Parse `Content-Range` header to extract total (number after `/`)
3. If total > 1000, loop: `Range: 1000-1999`, `Range: 2000-2999`, etc.
4. Concatenate all page arrays
5. Safety limit: max 10 pages (10,000 rows)

### Key Design Decisions

- `tpFetch` remains UNCHANGED — other callers still use it for small queries
- `tpFetchAll` is a NEW function, inserted between `tpFetch` and `mapCategory`
- `fetchNews()` changes ONE line: `tpFetch(...)` becomes `tpFetchAll(...)`
- The `limit=5000` parameter in the query string should be REMOVED (pagination handles it)
- Page size: 1000 (Supabase default max)
- Max pages: 10 (safety = 10,000 rows max)

## Files Modified

| File | Change |
|------|--------|
| `E:/IA/Claude/Friday/dashboard/pages/news.js` | Add `tpFetchAll()`, modify `fetchNews()` |

## No New Tests

Test 1 in `tests/e2e/w26-no-limit-own-articles.spec.ts` already asserts `count > 2000`. It will pass GREEN after this fix.

## Line Budget

Current: 807 lines. Adding ~30 lines for `tpFetchAll`. New total: ~837 lines. Under 500-line warning threshold per file? No, already over. But this is an existing file and we are adding minimal code. No split needed for +30 lines.

## Success Criteria

- [ ] `tpFetchAll` function exists between lines 188-220 in news.js
- [ ] `fetchNews()` calls `tpFetchAll` instead of `tpFetch`
- [ ] `limit=5000` removed from the query string in fetchNews
- [ ] Content-Range header is parsed correctly
- [ ] Max 10 pages safety limit enforced
- [ ] E2E Test 1 (`Friday loads > 2000 articles`) passes GREEN
