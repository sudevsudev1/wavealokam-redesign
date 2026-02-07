#!/usr/bin/env python3
"""
Pytrends Discovery Script
Fetches Related Queries (Top + Rising) from Google Trends and UPSERTS candidates to Supabase.
Runs daily via GitHub Actions. NO SERP scoring - just candidate collection.
Uses strict keyword normalization and deduplication.

Rate limiting strategy:
- Randomized delays between requests (5-15 seconds)
- Exponential backoff on 429 errors (up to 3 retries)
- Batching of seed keywords to reduce request frequency
"""

import os
import sys
import time
import re
import json
import random
import urllib.request
import urllib.error
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

try:
    from pytrends.request import TrendReq
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install pytrends")
    sys.exit(1)


def normalize_keyword(keyword: str) -> str:
    """
    Normalize keyword for deduplication.
    - trim whitespace
    - lowercase
    - collapse multiple spaces to single space
    - normalize apostrophes/quotes
    - strip leading/trailing punctuation
    - keep numbers
    """
    if not keyword:
        return ""
    
    # Lowercase and strip
    result = keyword.lower().strip()
    
    # Normalize quotes and apostrophes
    result = result.replace("'", "'").replace("'", "'").replace('"', '"').replace('"', '"')
    
    # Collapse multiple spaces
    result = re.sub(r'\s+', ' ', result)
    
    # Strip leading/trailing punctuation (but keep internal)
    result = re.sub(r'^[^\w\s]+|[^\w\s]+$', '', result)
    
    return result.strip()


# Seed keywords for discovery - reduced set for rate limiting
SEED_KEYWORDS = [
    # Core Varkala terms (highest priority)
    "Varkala",
    "Varkala beach",
    "Things to do in Varkala",
    "Varkala itinerary",
    "Best time to visit Varkala",
    # Kerala beaches
    "Kerala beach",
    "Beach stay Kerala",
    "Best beaches in Kerala",
    # Surfing focus
    "Surf lessons Kerala",
    "Surfing in Kerala",
    "Learn surfing in India",
    # Stays
    "Homestay in Kerala",
    "Boutique stay Kerala",
    # Activities
    "Yoga retreat Kerala",
    "Backwater boating Kerala",
    # Travel planning
    "Weekend getaway Kerala",
    "Kerala tourism",
]

# Wavealokam relevance terms
RELEVANCE_TERMS = [
    'varkala', 'kerala', 'edava', 'kappil', 'kovalam', 'trivandrum', 'thiruvananthapuram',
    'surf', 'surfing', 'beach', 'backwater', 'kayak', 'kayaking', 'monsoon',
    'boutique', 'homestay', 'b&b', 'bed and breakfast', 'stay', 'resort',
    'yoga', 'wellness', 'ayurveda', 'workation', 'digital detox',
    'weekend', 'getaway', 'trip', 'itinerary', 'travel', 'tourism'
]

# Terms that indicate irrelevant candidates
IRRELEVANT_TERMS = [
    'vietnam', 'thailand', 'bali', 'maldives', 'sri lanka', 'goa',
    'kashmir', 'himachal', 'ladakh', 'rajasthan', 'mumbai', 'delhi',
    'package tour', 'cruise', 'flight', 'airline', 'airport',
    'booking.com', 'airbnb', 'makemytrip', 'goibibo'
]


def get_rejection_reason(keyword: str) -> Optional[str]:
    """Get the reason why a keyword was rejected, or None if relevant."""
    kw_lower = keyword.lower()
    
    # Check for irrelevant terms first
    for term in IRRELEVANT_TERMS:
        if term in kw_lower:
            return f"IRRELEVANT_TERM_MATCH: \"{term}\""
    
    # Check if it has any relevance term
    if not any(term in kw_lower for term in RELEVANCE_TERMS):
        return "NO_RELEVANCE_TERM_MATCH"
    
    return None  # Keyword is relevant


def is_relevant(keyword: str) -> bool:
    """Check if a keyword is relevant to Wavealokam."""
    return get_rejection_reason(keyword) is None


def calculate_relevance_score(keyword: str) -> int:
    """Calculate a relevance score (0-100) for a keyword."""
    kw_lower = keyword.lower()
    score = 0
    
    # Core location terms (+30 each, max 60)
    core_terms = ['varkala', 'edava', 'kappil', 'kerala']
    for term in core_terms:
        if term in kw_lower:
            score += 30
            break
    
    # Secondary location terms (+15)
    if any(t in kw_lower for t in ['kovalam', 'trivandrum', 'thiruvananthapuram', 'kollam']):
        score += 15
    
    # Activity terms (+20 each, max 40)
    activity_terms = ['surf', 'kayak', 'yoga', 'wellness', 'ayurveda']
    activity_count = sum(1 for t in activity_terms if t in kw_lower)
    score += min(activity_count * 20, 40)
    
    # Stay-related terms (+15)
    if any(t in kw_lower for t in ['stay', 'homestay', 'boutique', 'b&b', 'resort', 'hotel']):
        score += 15
    
    # Intent modifiers (+10)
    if any(t in kw_lower for t in ['beginner', 'learn', 'how to', 'best', 'guide', 'itinerary']):
        score += 10
    
    return min(score, 100)


def create_pytrends_client() -> TrendReq:
    """Create a new pytrends client with fresh session."""
    return TrendReq(
        hl='en-IN',
        tz=330,  # IST timezone
        timeout=(10, 30),  # connection, read timeout
        retries=2,
        backoff_factor=0.5
    )


def fetch_related_queries_with_retry(
    seed_keyword: str,
    timeframe: str = 'today 3-m',
    max_retries: int = 3
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Fetch related queries with retry logic and exponential backoff.
    Returns (candidates, failure_reason) where failure_reason is empty string on success.
    """
    candidates = []
    failure_reason = ""
    
    for attempt in range(max_retries):
        try:
            # Create fresh client for each attempt
            pytrends = create_pytrends_client()
            
            # Add random jitter before request
            jitter = random.uniform(1, 3)
            time.sleep(jitter)
            
            pytrends.build_payload([seed_keyword], cat=0, timeframe=timeframe, geo='IN')
            related = pytrends.related_queries()
            
            if seed_keyword in related and related[seed_keyword]:
                # Process TOP queries
                top_df = related[seed_keyword].get('top')
                if top_df is not None and not top_df.empty:
                    for _, row in top_df.iterrows():
                        query = row.get('query', '')
                        value = row.get('value', 0)
                        keyword_norm = normalize_keyword(query)
                        if query and keyword_norm:
                            candidates.append({
                                'seed_keyword': seed_keyword,
                                'keyword_raw': query,
                                'keyword_norm': keyword_norm,
                                'query_type': 'top',
                                'source': 'related_queries',
                                'source_type': 'related_queries',
                                'last_pytrends_meta': {'value': int(value) if value else 0, 'rank_type': 'top'}
                            })
                
                # Process RISING queries
                rising_df = related[seed_keyword].get('rising')
                if rising_df is not None and not rising_df.empty:
                    for _, row in rising_df.iterrows():
                        query = row.get('query', '')
                        value = row.get('value', '')
                        keyword_norm = normalize_keyword(query)
                        if query and keyword_norm:
                            is_breakout = str(value) == 'Breakout' or str(value).endswith('%')
                            candidates.append({
                                'seed_keyword': seed_keyword,
                                'keyword_raw': query,
                                'keyword_norm': keyword_norm,
                                'query_type': 'rising',
                                'source': 'related_queries',
                                'source_type': 'related_queries',
                                'last_pytrends_meta': {'value': str(value), 'is_breakout': is_breakout, 'rank_type': 'rising'}
                            })
                
                # Success - return candidates (may be empty if both dataframes were empty)
                if not candidates:
                    failure_reason = "related_queries empty"
                return candidates, failure_reason
            else:
                # related_queries returned but no data for this seed
                failure_reason = "related_queries empty"
                return candidates, failure_reason
            
        except Exception as e:
            error_msg = str(e)
            is_rate_limited = '429' in error_msg or 'Too Many Requests' in error_msg
            
            if is_rate_limited:
                failure_reason = "rate-limited"
                if attempt < max_retries - 1:
                    # Exponential backoff: 30s, 60s, 120s
                    backoff_time = 30 * (2 ** attempt) + random.uniform(5, 15)
                    print(f"  Rate limited on attempt {attempt + 1}, waiting {backoff_time:.0f}s...")
                    time.sleep(backoff_time)
                else:
                    print(f"  Failed after {max_retries} attempts: rate-limited")
            else:
                failure_reason = f"exception: {error_msg[:100]}"
                if attempt < max_retries - 1:
                    # Other error - shorter backoff
                    backoff_time = 10 * (attempt + 1) + random.uniform(2, 5)
                    print(f"  Error on attempt {attempt + 1}: {e}, retrying in {backoff_time:.0f}s...")
                    time.sleep(backoff_time)
                else:
                    print(f"  Failed after {max_retries} attempts: {e}")
    
    return candidates, failure_reason


def main():
    """Main discovery function."""
    print("=" * 70)
    print("Pytrends Discovery Script")
    print(f"Started at: {datetime.utcnow().isoformat()}")
    print(f"Processing {len(SEED_KEYWORDS)} seed keywords")
    print("=" * 70)
    
    # Get Edge Function endpoint and auth token
    supabase_url = os.environ.get('SUPABASE_URL')
    blog_cron_secret = os.environ.get('WAVEALOKAM_BLOG_CRON_SECRET_V2')
    
    if not supabase_url or not blog_cron_secret:
        print("ERROR: Missing SUPABASE_URL or WAVEALOKAM_BLOG_CRON_SECRET_V2 environment variables")
        sys.exit(1)
    
    # Construct Edge Function URL
    ingest_url = f"{supabase_url}/functions/v1/pytrends-ingest"
    
    # Track candidates by keyword_norm for deduplication within this run
    candidates_by_norm: Dict[str, Dict[str, Any]] = {}
    successful_seeds = 0
    failed_seeds = 0
    
    # Track all kept candidates before global dedupe
    all_kept_before_dedupe = 0
    
    # Track per-seed stats for summary
    seed_stats: List[Dict[str, Any]] = []
    
    # Process each seed keyword with longer delays
    for i, seed in enumerate(SEED_KEYWORDS):
        print(f"\n{'─' * 70}")
        print(f"[{i+1}/{len(SEED_KEYWORDS)}] Processing: {seed}")
        print("─" * 70)
        
        # Fetch with retry logic - now returns all candidates (not pre-filtered)
        raw_candidates, failure_reason = fetch_related_queries_with_retry(seed, 'today 3-m')
        
        # Count raw by type
        raw_top_count = sum(1 for c in raw_candidates if c['query_type'] == 'top')
        raw_rising_count = sum(1 for c in raw_candidates if c['query_type'] == 'rising')
        
        print(f"  Raw counts: top={raw_top_count}, rising={raw_rising_count}")
        
        if not raw_candidates:
            failed_seeds += 1
            print(f"  ✗ No candidates: {failure_reason}")
            seed_stats.append({
                'seed': seed,
                'raw_top': 0,
                'raw_rising': 0,
                'kept': 0,
                'rejected': 0,
                'failure_reason': failure_reason
            })
            
            # Longer delay between seeds to avoid rate limiting (8-15 seconds)
            if i < len(SEED_KEYWORDS) - 1:
                delay = random.uniform(8, 15)
                print(f"  Waiting {delay:.1f}s before next request...")
                time.sleep(delay)
            continue
        
        # Apply relevance filter
        kept_candidates = []
        rejected_candidates = []
        
        for c in raw_candidates:
            reason = get_rejection_reason(c['keyword_raw'])
            if reason is None:
                kept_candidates.append(c)
            else:
                rejected_candidates.append({
                    'keyword': c['keyword_raw'],
                    'reason': reason
                })
        
        print(f"  After relevance filter: kept={len(kept_candidates)}, rejected={len(rejected_candidates)}")
        
        # Print first 10 rejected with reasons
        if rejected_candidates:
            print(f"  First {min(10, len(rejected_candidates))} rejected:")
            for rej in rejected_candidates[:10]:
                print(f"    - \"{rej['keyword'][:40]}\" → {rej['reason']}")
        
        # Dedupe within this seed
        before_dedupe = len(kept_candidates)
        local_seen = set()
        deduped_kept = []
        for c in kept_candidates:
            if c['keyword_norm'] not in local_seen:
                local_seen.add(c['keyword_norm'])
                deduped_kept.append(c)
        after_dedupe = len(deduped_kept)
        
        print(f"  Dedupe within seed: {before_dedupe} → {after_dedupe}")
        
        # Track stats
        seed_stats.append({
            'seed': seed,
            'raw_top': raw_top_count,
            'raw_rising': raw_rising_count,
            'kept': len(deduped_kept),
            'rejected': len(rejected_candidates),
            'failure_reason': None
        })
        
        # Add to global pool
        if deduped_kept:
            successful_seeds += 1
            all_kept_before_dedupe += len(deduped_kept)
            
            for c in deduped_kept:
                kw_norm = c['keyword_norm']
                if kw_norm not in candidates_by_norm:
                    c['is_relevant'] = True
                    c['relevance_score'] = calculate_relevance_score(c['keyword_raw'])
                    c['seeds'] = [seed]
                    candidates_by_norm[kw_norm] = c
                else:
                    existing = candidates_by_norm[kw_norm]
                    if seed not in existing.get('seeds', []):
                        existing['seeds'].append(seed)
            
            print(f"  ✓ Added {len(deduped_kept)} relevant candidates to global pool")
        else:
            failed_seeds += 1
            print(f"  ✗ No candidates after relevance filter")
        
        # Longer delay between seeds to avoid rate limiting (8-15 seconds)
        if i < len(SEED_KEYWORDS) - 1:
            delay = random.uniform(8, 15)
            print(f"  Waiting {delay:.1f}s before next request...")
            time.sleep(delay)
    
    # ═══════════════════════════════════════════════════════════════════════
    # GLOBAL SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    all_candidates = list(candidates_by_norm.values())
    
    print(f"\n{'═' * 70}")
    print("GLOBAL SUMMARY")
    print("═" * 70)
    
    print(f"\nSeeds processed: {successful_seeds} successful, {failed_seeds} failed")
    print(f"Total kept before global dedupe: {all_kept_before_dedupe}")
    print(f"Total unique after global dedupe: {len(all_candidates)}")
    
    # Print top 20 canonical keywords with their seeds
    if all_candidates:
        # Sort by relevance score descending
        sorted_candidates = sorted(all_candidates, key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        print(f"\n{'─' * 70}")
        print("Top 20 canonical keywords (by relevance score):")
        print("─" * 70)
        for i, c in enumerate(sorted_candidates[:20], 1):
            seeds_str = ", ".join(c.get('seeds', [])[:3])
            if len(c.get('seeds', [])) > 3:
                seeds_str += f" (+{len(c['seeds']) - 3} more)"
            print(f"  {i:2}. [{c.get('relevance_score', 0):3}] \"{c['keyword_norm'][:45]}\"")
            print(f"       Seeds: {seeds_str}")
    
    # Print seed-by-seed summary table
    print(f"\n{'─' * 70}")
    print("Per-seed summary:")
    print("─" * 70)
    print(f"{'Seed':<35} {'Top':>5} {'Rise':>5} {'Kept':>5} {'Rej':>5} {'Status':<20}")
    print("─" * 70)
    for stat in seed_stats:
        status = stat.get('failure_reason') or 'OK'
        print(f"{stat['seed'][:35]:<35} {stat['raw_top']:>5} {stat['raw_rising']:>5} {stat['kept']:>5} {stat['rejected']:>5} {status:<20}")
    
    print("─" * 70)
    
    if not all_candidates:
        print("\nNo candidates found. Exiting without error (rate limiting expected).")
        # Exit with 0 to not fail the workflow - rate limiting is expected
        return
    
    # Prepare payload for Edge Function
    payload = {
        'candidates': all_candidates,
        'prune_before_days': 60
    }
    
    print(f"\nSending {len(all_candidates)} candidates to Edge Function...")
    
    try:
        # Send to Edge Function with auth token in header
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            ingest_url,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'X-Cron-Secret': blog_cron_secret
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"Edge Function response: {result}")
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"Error calling Edge Function: {e}")
        sys.exit(1)
    
    print(f"\n{'═' * 70}")
    print(f"Discovery complete at: {datetime.utcnow().isoformat()}")
    print("═" * 70)


if __name__ == '__main__':
    main()
