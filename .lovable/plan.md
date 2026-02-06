
# Fix Pytrends Secret Name Mismatch

## Problem
The pytrends discovery pipeline uses `BLOG_CRON_SECRET` everywhere, but the actual Supabase secret is now named `WAVEALOKAM_BLOG_CRON_SECRET_V2`. This causes authentication failures.

## Solution
Update all three locations to use the new secret name `WAVEALOKAM_BLOG_CRON_SECRET_V2`.

---

## Changes Required

### 1. GitHub Workflow
**File:** `.github/workflows/pytrends-discovery.yml`

Change line 13:
```yaml
# Before
BLOG_CRON_SECRET: ${{ secrets.BLOG_CRON_SECRET }}

# After
BLOG_CRON_SECRET: ${{ secrets.WAVEALOKAM_BLOG_CRON_SECRET_V2 }}
```

This maps the GitHub secret `WAVEALOKAM_BLOG_CRON_SECRET_V2` to the environment variable `BLOG_CRON_SECRET` that the Python script expects.

### 2. Edge Function Authentication
**File:** `supabase/functions/pytrends-ingest/index.ts`

Change line 30:
```typescript
// Before
const expectedToken = Deno.env.get('BLOG_CRON_SECRET');

// After
const expectedToken = Deno.env.get('WAVEALOKAM_BLOG_CRON_SECRET_V2');
```

This makes the edge function read the correct secret for authentication.

---

## GitHub Repository Secret Required

You must add `WAVEALOKAM_BLOG_CRON_SECRET_V2` as a GitHub Repository Secret:

1. Go to your GitHub repository
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Name: `WAVEALOKAM_BLOG_CRON_SECRET_V2`
5. Value: Use the same value as your Supabase secret

---

## After Implementation

1. Deploy the updated edge function
2. Manually trigger the GitHub Action to test
3. Verify `trend_candidates` table has data
4. Run weekly-selector to confirm seeds are found

---

## What Will NOT Change
- Python script logic (only the GitHub workflow maps the secret)
- Selector logic
- DataForSEO scoring
- Blog generation
- Cron schedules
- Database schema
