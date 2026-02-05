#!/usr/bin/env python3
"""
Pytrends Discovery Script
Fetches Related Queries (Top + Rising) from Google Trends and UPSERTS candidates to Supabase.
Runs daily via GitHub Actions. NO SERP scoring - just candidate collection.
Uses strict keyword normalization and deduplication.
"""

import os
import sys
import time
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any

try:
    from pytrends.request import TrendReq
    from supabase import create_client, Client
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install pytrends supabase")
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


# Seed keywords for discovery
SEED_KEYWORDS = [
    "Varkala",
    "Edava beach",
    "Kappil",
    "Paravur beach",
    "Kollam beach",
    "Thiruvananthapuram weekend trip",
    "Kerala beach",
    "Kerala beach stay",
    "Beach stay Kerala",
    "Quiet beach stay Kerala",
    "Boutique stay Kerala",
    "Homestay in Kerala",
    "Bed and breakfast Kerala",
    "Workation Kerala",
    "Digital detox Kerala",
    "Yoga retreat Kerala",
    "Wellness retreat Kerala",
    "Ayurveda retreat Kerala",
    "Backwater boating Kerala",
    "Kayaking Kerala",
    "Mangrove boating Kerala",
    "Things to do in Varkala",
    "Varkala itinerary",
    "Best time to visit Varkala",
    "Varkala in monsoon",
    "Varkala cliff",
    "Varkala beach",
    "Surf lessons",
    "Surf lessons Varkala",
    "Surf school Varkala",
    "Surfing in Kerala",
    "Beginner surfing",
    "Learn surfing in India",
    "Is surfing safe for beginners",
    "Surfing for non swimmers",
    "What to wear for surf lessons",
    "Beach safety Kerala",
    "Best beaches in Kerala",
    "Less crowded beaches Kerala",
    "Weekend getaway Kerala",
    "Couple friendly stay Varkala",
    "Family friendly stay Varkala",
    "Varkala weather",
    "Varkala December",
    "Varkala January",
    "Varkala October",
    "Varkala November",
    "Kerala tourism season",
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


def is_relevant(keyword: str) -> bool:
    """Check if a keyword is relevant to Wavealokam."""
    kw_lower = keyword.lower()
    
    # Reject if contains irrelevant terms
    if any(term in kw_lower for term in IRRELEVANT_TERMS):
        return False
    
    # Accept if contains any relevance term
    if any(term in kw_lower for term in RELEVANCE_TERMS):
        return True
    
    # Default: not relevant enough
    return False


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


def fetch_related_queries(pytrends: TrendReq, seed_keyword: str, timeframe: str = 'today 3-m') -> List[Dict[str, Any]]:
    """Fetch related queries for a seed keyword."""
    candidates = []
    
    try:
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
                    if query and keyword_norm and is_relevant(query):
                        candidates.append({
                            'seed_keyword': seed_keyword,
                            'keyword_raw': query,
                            'keyword_norm': keyword_norm,
                            'query_type': 'top',
                            'source': 'pytrends',
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
                    if query and keyword_norm and is_relevant(query):
                        # Rising can have 'Breakout' or percentage values
                        is_breakout = str(value) == 'Breakout' or str(value).endswith('%')
                        candidates.append({
                            'seed_keyword': seed_keyword,
                            'keyword_raw': query,
                            'keyword_norm': keyword_norm,
                            'query_type': 'rising',
                            'source': 'pytrends',
                            'source_type': 'related_queries',
                            'last_pytrends_meta': {'value': str(value), 'is_breakout': is_breakout, 'rank_type': 'rising'}
                        })
        
    except Exception as e:
        print(f"  Error fetching related queries for '{seed_keyword}': {e}")
    
    return candidates


def main():
    """Main discovery function."""
    print("=" * 60)
    print("Pytrends Discovery Script")
    print(f"Started at: {datetime.utcnow().isoformat()}")
    print("=" * 60)
    
    # Get Supabase credentials
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        sys.exit(1)
    
    # Initialize clients
    supabase: Client = create_client(supabase_url, supabase_key)
    pytrends = TrendReq(hl='en-IN', tz=330)  # IST timezone
    
    # Track candidates by keyword_norm for deduplication within this run
    candidates_by_norm: Dict[str, Dict[str, Any]] = {}
    
    # Process each seed keyword
    for i, seed in enumerate(SEED_KEYWORDS):
        print(f"\n[{i+1}/{len(SEED_KEYWORDS)}] Processing: {seed}")
        
        # Fetch 90-day data
        candidates = fetch_related_queries(pytrends, seed, 'today 3-m')
        
        for c in candidates:
            kw_norm = c['keyword_norm']
            if kw_norm not in candidates_by_norm:
                c['is_relevant'] = True
                c['relevance_score'] = calculate_relevance_score(c['keyword_raw'])
                c['seeds'] = [seed]
                candidates_by_norm[kw_norm] = c
            else:
                # Append seed if new
                existing = candidates_by_norm[kw_norm]
                if seed not in existing.get('seeds', []):
                    existing['seeds'].append(seed)
        
        print(f"  Found {len(candidates)} relevant candidates")
        
        # Rate limiting - Google Trends is sensitive
        time.sleep(2)
    
    all_candidates = list(candidates_by_norm.values())
    print(f"\n{'=' * 60}")
    print(f"Total unique candidates: {len(all_candidates)}")
    
    if not all_candidates:
        print("No candidates found. Exiting.")
        return
    
    # Prune old candidates (older than 60 days based on last_seen_at)
    cutoff_date = (datetime.utcnow() - timedelta(days=60)).isoformat()
    try:
        supabase.table('trend_candidates').delete().lt('last_seen_at', cutoff_date).execute()
        print(f"Pruned old candidates not seen since {cutoff_date}")
    except Exception as e:
        print(f"Warning: Could not prune old candidates: {e}")
    
    # UPSERT candidates using keyword_norm as unique key
    print(f"\nUpserting {len(all_candidates)} candidates into Supabase...")
    
    now_iso = datetime.utcnow().isoformat()
    upserted = 0
    errors = 0
    
    # Process one by one for proper upsert handling
    for i in range(0, len(all_candidates), batch_size):
        batch = all_candidates[i:i+batch_size]
        
        for candidate in batch:
            try:
                # Check if exists
                existing = supabase.table('trend_candidates').select('id, seen_count, seeds').eq('keyword_norm', candidate['keyword_norm']).execute()
                
                if existing.data and len(existing.data) > 0:
                    # UPDATE existing record
                    record = existing.data[0]
                    new_seen_count = (record.get('seen_count') or 0) + 1
                    existing_seeds = record.get('seeds') or []
                    
                    # Merge seeds
                    merged_seeds = list(set(existing_seeds + candidate.get('seeds', [])))
                    
                    supabase.table('trend_candidates').update({
                        'last_seen_at': now_iso,
                        'seen_count': new_seen_count,
                        'seeds': merged_seeds,
                        'last_pytrends_meta': candidate.get('last_pytrends_meta'),
                        'relevance_score': candidate.get('relevance_score'),
                    }).eq('id', record['id']).execute()
                else:
                    # INSERT new record
                    supabase.table('trend_candidates').insert({
                        'keyword_raw': candidate['keyword_raw'],
                        'keyword_norm': candidate['keyword_norm'],
                        'candidate_keyword': candidate['keyword_raw'],  # Keep for backwards compat
                        'seed_keyword': candidate['seed_keyword'],
                        'source': candidate['source'],
                        'source_type': candidate.get('source_type', 'related_queries'),
                        'query_type': candidate['query_type'],
                        'is_relevant': candidate['is_relevant'],
                        'relevance_score': candidate['relevance_score'],
                        'first_seen_at': now_iso,
                        'last_seen_at': now_iso,
                        'seen_count': 1,
                        'seeds': candidate.get('seeds', []),
                        'last_pytrends_meta': candidate.get('last_pytrends_meta'),
                    }).execute()
                
                upserted += 1
                
            except Exception as e:
                errors += 1
                print(f"  Error upserting '{candidate['keyword_norm']}': {e}")
        
        print(f"  Processed batch {i//batch_size + 1} ({len(batch)} records)")
    
    print(f"\n{'=' * 60}")
    print(f"Upserted: {upserted}, Errors: {errors}")
    print(f"Discovery complete at: {datetime.utcnow().isoformat()}")
    print("=" * 60)


if __name__ == '__main__':
    main()
