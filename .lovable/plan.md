
# Pytrends Discovery Pipeline

## Status: COMPLETE ✅

All references to `BLOG_CRON_SECRET` have been replaced with `WAVEALOKAM_BLOG_CRON_SECRET_V2`.

## Files Updated

1. **`.github/workflows/pytrends-discovery.yml`** - Environment variable now uses `WAVEALOKAM_BLOG_CRON_SECRET_V2`
2. **`scripts/pytrends_discovery.py`** - Reads `WAVEALOKAM_BLOG_CRON_SECRET_V2` from environment
3. **`supabase/functions/pytrends-ingest/index.ts`** - Comment updated (code already correct)

## Testing

Manually trigger the GitHub Action and verify:
1. Action completes successfully
2. `trend_candidates` table has data
3. Edge function logs show successful ingestion
