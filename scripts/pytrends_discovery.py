#!/usr/bin/env python3
"""
Pytrends Discovery Script
Fetches Related Queries (Top + Rising) from Google Trends and writes candidates to Supabase.
Runs daily via GitHub Actions to populate trend_candidates table.
"""

import os
import sys
import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

try:
    from pytrends.request import TrendReq
    from supabase import create_client, Client
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install pytrends supabase")
    sys.exit(1)

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


def fetch_related_queries(pytrends: TrendReq, keyword: str, timeframe: str = 'today 3-m') -> List[Dict[str, Any]]:
    """Fetch related queries for a keyword."""
    candidates = []
    
    try:
        pytrends.build_payload([keyword], cat=0, timeframe=timeframe, geo='IN')
        related = pytrends.related_queries()
        
        if keyword in related and related[keyword]:
            # Process TOP queries
            top_df = related[keyword].get('top')
            if top_df is not None and not top_df.empty:
                for _, row in top_df.iterrows():
                    query = row.get('query', '')
                    value = row.get('value', 0)
                    if query and is_relevant(query):
                        candidates.append({
                            'seed_keyword': keyword,
                            'candidate_keyword': query,
                            'query_type': 'top',
                            'source': 'pytrends',
                            'interest_90d': int(value) if value else None,
                            'raw_data': {'value': int(value) if value else 0}
                        })
            
            # Process RISING queries
            rising_df = related[keyword].get('rising')
            if rising_df is not None and not rising_df.empty:
                for _, row in rising_df.iterrows():
                    query = row.get('query', '')
                    value = row.get('value', '')
                    if query and is_relevant(query):
                        # Rising can have 'Breakout' or percentage values
                        is_breakout = str(value) == 'Breakout' or str(value).endswith('%')
                        candidates.append({
                            'seed_keyword': keyword,
                            'candidate_keyword': query,
                            'query_type': 'rising',
                            'source': 'pytrends',
                            'interest_90d': 100 if is_breakout else (int(value) if isinstance(value, (int, float)) else None),
                            'raw_data': {'value': str(value), 'is_breakout': is_breakout}
                        })
        
    except Exception as e:
        print(f"  Error fetching related queries for '{keyword}': {e}")
    
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
    
    all_candidates: List[Dict[str, Any]] = []
    seen_keywords = set()
    
    # Process each seed keyword
    for i, seed in enumerate(SEED_KEYWORDS):
        print(f"\n[{i+1}/{len(SEED_KEYWORDS)}] Processing: {seed}")
        
        # Fetch 90-day data
        candidates = fetch_related_queries(pytrends, seed, 'today 3-m')
        
        for c in candidates:
            kw = c['candidate_keyword'].lower()
            if kw not in seen_keywords:
                seen_keywords.add(kw)
                c['is_relevant'] = True
                c['relevance_score'] = calculate_relevance_score(c['candidate_keyword'])
                all_candidates.append(c)
        
        print(f"  Found {len(candidates)} relevant candidates")
        
        # Rate limiting - Google Trends is sensitive
        time.sleep(2)
    
    print(f"\n{'=' * 60}")
    print(f"Total unique candidates: {len(all_candidates)}")
    
    if not all_candidates:
        print("No candidates found. Exiting.")
        return
    
    # Clear old unprocessed candidates (older than 7 days)
    cutoff_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
    try:
        supabase.table('trend_candidates').delete().lt('created_at', cutoff_date).eq('is_processed', False).execute()
        print(f"Cleaned up old unprocessed candidates before {cutoff_date}")
    except Exception as e:
        print(f"Warning: Could not clean up old candidates: {e}")
    
    # Insert new candidates
    print(f"\nInserting {len(all_candidates)} candidates into Supabase...")
    
    # Batch insert in chunks of 50
    batch_size = 50
    for i in range(0, len(all_candidates), batch_size):
        batch = all_candidates[i:i+batch_size]
        try:
            supabase.table('trend_candidates').insert(batch).execute()
            print(f"  Inserted batch {i//batch_size + 1} ({len(batch)} records)")
        except Exception as e:
            print(f"  Error inserting batch: {e}")
    
    print(f"\n{'=' * 60}")
    print(f"Discovery complete at: {datetime.utcnow().isoformat()}")
    print("=" * 60)


if __name__ == '__main__':
    main()
