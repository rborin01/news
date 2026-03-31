# EXECUTOR BRIEFING: W26b — Friday Pagination Fix

> Spec: `docs/spec-truepress-w26b.md`
> Target file: `E:/IA/Claude/Friday/dashboard/pages/news.js`
> Current line count: 807

---

## Step 1: Add `tpFetchAll` function

Insert this function AFTER `tpFetch` (after line 188) and BEFORE the `mapCategory` section (line 190 comment `// ==================== MAP CATEGORY ====================`).

### Exact code to insert between line 188 and line 190:

```javascript

// ==================== PAGINATED SUPABASE FETCH ====================
// Supabase REST caps at 1000 rows. This fetches all pages via Range header.
function tpFetchAll(table, query) {
  var PAGE_SIZE = 1000;
  var MAX_PAGES = 10;

  function fetchPage(start) {
    var end = start + PAGE_SIZE - 1;
    var url = TRUEPRESS_SUPABASE_URL + '/' + table + '?' + query;
    return fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': TRUEPRESS_ANON_KEY,
        'Authorization': 'Bearer ' + TRUEPRESS_ANON_KEY,
        'Range': start + '-' + end,
        'Prefer': 'count=exact'
      }
    }).then(function(r) {
      var contentRange = r.headers.get('Content-Range') || '';
      // Content-Range format: "0-999/3847" — total is after "/"
      var total = 0;
      var slashIdx = contentRange.indexOf('/');
      if (slashIdx !== -1) {
        total = parseInt(contentRange.substring(slashIdx + 1), 10) || 0;
      }
      return r.json().then(function(data) {
        return { data: Array.isArray(data) ? data : [], total: total };
      });
    });
  }

  return fetchPage(0).then(function(first) {
    if (!first.total || first.total <= PAGE_SIZE || first.data.length === 0) {
      return first.data;
    }
    // Need more pages
    var pages = Math.min(Math.ceil(first.total / PAGE_SIZE), MAX_PAGES);
    var promises = [];
    for (var p = 1; p < pages; p++) {
      promises.push(fetchPage(p * PAGE_SIZE));
    }
    return Promise.all(promises).then(function(results) {
      var all = first.data;
      results.forEach(function(r) {
        all = all.concat(r.data);
      });
      return all;
    });
  });
}
```

This adds ~45 lines. The function:
- Makes the first request with `Range: 0-999` and `Prefer: count=exact`
- Parses `Content-Range` header to get total count
- If total <= 1000, returns immediately (single page, no overhead)
- If total > 1000, fires remaining pages IN PARALLEL via `Promise.all`
- Caps at MAX_PAGES=10 (10,000 rows safety limit)
- Returns a flat array of all rows concatenated

## Step 2: Modify `fetchNews()` — ONE line change

### Current code (line 240):

```javascript
  tpFetch('processed_news', 'select=id,raw_id,title,summary,narrative_media,hidden_intent,real_facts,impact_rodrigo,category,level_1_domain,level_2_project,level_3_tag,score_rodrigo,score_brasil,processed_at,source_app&order=processed_at.desc&limit=5000')
```

### Replace with:

```javascript
  tpFetchAll('processed_news', 'select=id,raw_id,title,summary,narrative_media,hidden_intent,real_facts,impact_rodrigo,category,level_1_domain,level_2_project,level_3_tag,score_rodrigo,score_brasil,processed_at,source_app&order=processed_at.desc')
```

Two changes on this line:
1. `tpFetch` becomes `tpFetchAll`
2. Remove `&limit=5000` from the query string (pagination handles row count)

## Step 3: Verify

No new tests needed. Run existing E2E test:

```bash
cd "C:/Users/rodri/Meu Drive/Claude/TruePress/news-code"
npx playwright test tests/e2e/w26-no-limit-own-articles.spec.ts --grep "Friday loads"
```

Expected: Test 1 passes GREEN (count > 2000).

## DO NOT

- Do NOT modify `tpFetch` — other callers depend on it
- Do NOT add any new dependencies
- Do NOT change the query columns (select=...) — only remove `&limit=5000`
- Do NOT change the `.then(function(data) {...})` chain in fetchNews — the data format is the same (flat array)
- Do NOT touch any frozen modules

## Summary of Changes

| Line | Before | After |
|------|--------|-------|
| 189 (new) | (empty) | `tpFetchAll` function (~45 lines) |
| ~285 (was 240) | `tpFetch('processed_news', '...&limit=5000')` | `tpFetchAll('processed_news', '...'}` (no limit) |

Final line count: ~852 lines (807 + 45). Over 500-line guidance but this is an existing large file and we are adding minimal essential code.
