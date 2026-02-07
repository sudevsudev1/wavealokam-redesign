#!/usr/bin/env python3
"""
Pytrends Discovery Script - Forensic Edition v2
Fetches Related Queries AND Related Topics from Google Trends.
Uses seed MID (topic entity) when available for better results.
Logs EVERYTHING with zero truncation. Produces full JSON forensic dump.

Rate limiting strategy:
- Randomized delays between requests (8-15 seconds)
- Exponential backoff on 429 errors (up to 3 retries)
- Fresh session per attempt
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


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

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
    
    result = keyword.lower().strip()
    result = result.replace("'", "'").replace("'", "'").replace('"', '"').replace('"', '"')
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'^[^\w\s]+|[^\w\s]+$', '', result)
    return result.strip()


# Seed keywords for discovery
SEED_KEYWORDS = [
    "Varkala",
    "Varkala beach",
    "Things to do in Varkala",
    "Varkala itinerary",
    "Best time to visit Varkala",
    "Kerala beach",
    "Beach stay Kerala",
    "Best beaches in Kerala",
    "Surf lessons Kerala",
    "Surfing in Kerala",
    "Learn surfing in India",
    "Homestay in Kerala",
    "Boutique stay Kerala",
    "Yoga retreat Kerala",
    "Backwater boating Kerala",
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

# Default timeframe - can be overridden by env var
DEFAULT_TIMEFRAME = 'today 3-m'


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def get_rejection_reason(keyword: str) -> Optional[str]:
    """Get the reason why a keyword was rejected, or None if relevant."""
    kw_lower = keyword.lower()
    
    for term in IRRELEVANT_TERMS:
        if term in kw_lower:
            return f"IRRELEVANT_TERM_MATCH: \"{term}\""
    
    if not any(term in kw_lower for term in RELEVANCE_TERMS):
        return "NO_RELEVANCE_TERM_MATCH"
    
    return None


def is_relevant(keyword: str) -> bool:
    """Check if a keyword is relevant to Wavealokam."""
    return get_rejection_reason(keyword) is None


def calculate_relevance_score(keyword: str) -> int:
    """Calculate a relevance score (0-100) for a keyword."""
    kw_lower = keyword.lower()
    score = 0
    
    core_terms = ['varkala', 'edava', 'kappil', 'kerala']
    for term in core_terms:
        if term in kw_lower:
            score += 30
            break
    
    if any(t in kw_lower for t in ['kovalam', 'trivandrum', 'thiruvananthapuram', 'kollam']):
        score += 15
    
    activity_terms = ['surf', 'kayak', 'yoga', 'wellness', 'ayurveda']
    activity_count = sum(1 for t in activity_terms if t in kw_lower)
    score += min(activity_count * 20, 40)
    
    if any(t in kw_lower for t in ['stay', 'homestay', 'boutique', 'b&b', 'resort', 'hotel']):
        score += 15
    
    if any(t in kw_lower for t in ['beginner', 'learn', 'how to', 'best', 'guide', 'itinerary']):
        score += 10
    
    return min(score, 100)


def create_pytrends_client() -> TrendReq:
    """Create a new pytrends client with fresh session."""
    return TrendReq(
        hl='en-IN',
        tz=330,
        timeout=(10, 30),
        retries=2,
        backoff_factor=0.5
    )


def parse_pytrends_value(value: Any) -> Tuple[str, Optional[int]]:
    """Parse a pytrends value into raw string and numeric representation."""
    value_raw = str(value) if value is not None else ""
    value_num = None
    
    if value_raw == "Breakout":
        value_num = None  # Breakout is not numeric
    elif value_raw.endswith('%'):
        try:
            value_num = int(value_raw.replace('%', '').replace(',', ''))
        except ValueError:
            pass
    else:
        try:
            value_num = int(value) if value is not None else None
        except (ValueError, TypeError):
            pass
    
    return value_raw, value_num


def get_suggestions_for_seed(pytrends: TrendReq, seed: str) -> List[Dict[str, Any]]:
    """Get suggestions from pytrends and return the full list (no truncation)."""
    try:
        suggestions = pytrends.suggestions(seed)
        return suggestions if suggestions else []
    except Exception as e:
        print(f"    Suggestions API error: {e}")
        return []


def choose_best_mid(suggestions: List[Dict[str, Any]], seed_text: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Choose the best MID from suggestions.
    Prefers place/travel topics, then exact/partial text matches.
    Returns (mid, full_suggestion_obj) or (None, None).
    """
    if not suggestions:
        return None, None
    
    seed_lower = seed_text.lower()
    
    # Priority types for travel/place topics
    priority_types = ['Tourist destination', 'City', 'Town', 'Beach', 'Place', 'Resort', 'Region', 'Neighborhood', 'Tourist attraction']
    
    # First pass: look for priority types with good text match
    for sug in suggestions:
        sug_type = sug.get('type', '')
        sug_title = sug.get('title', '').lower()
        sug_mid = sug.get('mid')
        
        if not sug_mid:
            continue
        
        # Check if type is priority and title matches seed
        is_priority_type = any(pt.lower() in sug_type.lower() for pt in priority_types)
        title_matches = seed_lower in sug_title or sug_title in seed_lower
        
        if is_priority_type and title_matches:
            return sug_mid, sug
    
    # Second pass: any with a mid that has good text match
    for sug in suggestions:
        sug_title = sug.get('title', '').lower()
        sug_mid = sug.get('mid')
        
        if not sug_mid:
            continue
        
        if seed_lower in sug_title or sug_title in seed_lower:
            return sug_mid, sug
    
    # Third pass: first one with a mid
    for sug in suggestions:
        if sug.get('mid'):
            return sug['mid'], sug
    
    return None, None


# ═══════════════════════════════════════════════════════════════════════════
# DATA COLLECTION
# ═══════════════════════════════════════════════════════════════════════════

def fetch_related_data_for_seed(
    seed_original: str,
    seed_mid: Optional[str],
    seed_mode: str,
    timeframe: str,
    geo: str,
    max_retries: int = 3
) -> Dict[str, Any]:
    """
    Fetch both related_queries and related_topics for a seed.
    Returns a dict with all raw data and failure reasons.
    """
    result = {
        'seed_original': seed_original,
        'seed_mid': seed_mid,
        'seed_mode': seed_mode,
        'timeframe': timeframe,
        'geo': geo,
        'queries_top': [],
        'queries_rising': [],
        'topics_top': [],
        'topics_rising': [],
        'queries_failure': None,
        'topics_failure': None,
        'raw_queries_response_keys': [],
        'raw_topics_response_keys': [],
    }
    
    # Determine what to use for payload
    payload_kw = seed_mid if seed_mode == 'mid' and seed_mid else seed_original
    
    # ─────────────────────────────────────────────────────────────────────
    # RELATED QUERIES
    # ─────────────────────────────────────────────────────────────────────
    for attempt in range(max_retries):
        try:
            pytrends = create_pytrends_client()
            time.sleep(random.uniform(1, 3))
            
            pytrends.build_payload([payload_kw], cat=0, timeframe=timeframe, geo=geo)
            related = pytrends.related_queries()
            
            result['raw_queries_response_keys'] = list(related.keys()) if related else []
            
            if payload_kw in related and related[payload_kw]:
                # TOP queries
                top_df = related[payload_kw].get('top')
                if top_df is not None and not top_df.empty:
                    for idx, row in top_df.iterrows():
                        query = row.get('query', '')
                        value = row.get('value', 0)
                        value_raw, value_num = parse_pytrends_value(value)
                        keyword_norm = normalize_keyword(query)
                        if query and keyword_norm:
                            result['queries_top'].append({
                                'keyword_raw': query,
                                'keyword_norm': keyword_norm,
                                'pytrends_value_raw': value_raw,
                                'pytrends_value_num': value_num,
                                'rank_type': 'top',
                                'item_kind': 'query',
                                'topic_mid': None,
                            })
                
                # RISING queries
                rising_df = related[payload_kw].get('rising')
                if rising_df is not None and not rising_df.empty:
                    for idx, row in rising_df.iterrows():
                        query = row.get('query', '')
                        value = row.get('value', '')
                        value_raw, value_num = parse_pytrends_value(value)
                        keyword_norm = normalize_keyword(query)
                        if query and keyword_norm:
                            result['queries_rising'].append({
                                'keyword_raw': query,
                                'keyword_norm': keyword_norm,
                                'pytrends_value_raw': value_raw,
                                'pytrends_value_num': value_num,
                                'rank_type': 'rising',
                                'item_kind': 'query',
                                'topic_mid': None,
                            })
                
                break  # Success
            else:
                result['queries_failure'] = 'related_queries empty'
                break
                
        except Exception as e:
            error_msg = str(e)
            is_rate_limited = '429' in error_msg or 'Too Many Requests' in error_msg
            
            if is_rate_limited:
                result['queries_failure'] = 'rate-limited'
                if attempt < max_retries - 1:
                    backoff = 30 * (2 ** attempt) + random.uniform(5, 15)
                    print(f"      Queries rate-limited, waiting {backoff:.0f}s...")
                    time.sleep(backoff)
                else:
                    print(f"      Queries failed after {max_retries} attempts: rate-limited")
                    break
            else:
                result['queries_failure'] = f'exception: {error_msg[:200]}'
                if attempt < max_retries - 1:
                    backoff = 10 * (attempt + 1) + random.uniform(2, 5)
                    print(f"      Queries error: {e}, retrying in {backoff:.0f}s...")
                    time.sleep(backoff)
                else:
                    print(f"      Queries failed after {max_retries} attempts: {e}")
                    break
    
    # Delay before topics request
    time.sleep(random.uniform(3, 6))
    
    # ─────────────────────────────────────────────────────────────────────
    # RELATED TOPICS
    # ─────────────────────────────────────────────────────────────────────
    for attempt in range(max_retries):
        try:
            pytrends = create_pytrends_client()
            time.sleep(random.uniform(1, 3))
            
            pytrends.build_payload([payload_kw], cat=0, timeframe=timeframe, geo=geo)
            topics = pytrends.related_topics()
            
            result['raw_topics_response_keys'] = list(topics.keys()) if topics else []
            
            if payload_kw in topics and topics[payload_kw]:
                # TOP topics
                top_df = topics[payload_kw].get('top')
                if top_df is not None and not top_df.empty:
                    for idx, row in top_df.iterrows():
                        # Topics have 'topic_title', 'topic_mid', 'topic_type', 'value'
                        topic_title = row.get('topic_title', '')
                        topic_mid = row.get('topic_mid', '')
                        topic_type = row.get('topic_type', '')
                        value = row.get('value', 0)
                        value_raw, value_num = parse_pytrends_value(value)
                        keyword_norm = normalize_keyword(topic_title)
                        if topic_title and keyword_norm:
                            result['topics_top'].append({
                                'keyword_raw': topic_title,
                                'keyword_norm': keyword_norm,
                                'pytrends_value_raw': value_raw,
                                'pytrends_value_num': value_num,
                                'rank_type': 'top',
                                'item_kind': 'topic',
                                'topic_mid': topic_mid or None,
                                'topic_type': topic_type,
                            })
                
                # RISING topics
                rising_df = topics[payload_kw].get('rising')
                if rising_df is not None and not rising_df.empty:
                    for idx, row in rising_df.iterrows():
                        topic_title = row.get('topic_title', '')
                        topic_mid = row.get('topic_mid', '')
                        topic_type = row.get('topic_type', '')
                        value = row.get('value', '')
                        value_raw, value_num = parse_pytrends_value(value)
                        keyword_norm = normalize_keyword(topic_title)
                        if topic_title and keyword_norm:
                            result['topics_rising'].append({
                                'keyword_raw': topic_title,
                                'keyword_norm': keyword_norm,
                                'pytrends_value_raw': value_raw,
                                'pytrends_value_num': value_num,
                                'rank_type': 'rising',
                                'item_kind': 'topic',
                                'topic_mid': topic_mid or None,
                                'topic_type': topic_type,
                            })
                
                break  # Success
            else:
                result['topics_failure'] = 'related_topics empty'
                break
                
        except Exception as e:
            error_msg = str(e)
            is_rate_limited = '429' in error_msg or 'Too Many Requests' in error_msg
            
            if is_rate_limited:
                result['topics_failure'] = 'rate-limited'
                if attempt < max_retries - 1:
                    backoff = 30 * (2 ** attempt) + random.uniform(5, 15)
                    print(f"      Topics rate-limited, waiting {backoff:.0f}s...")
                    time.sleep(backoff)
                else:
                    print(f"      Topics failed after {max_retries} attempts: rate-limited")
                    break
            else:
                result['topics_failure'] = f'exception: {error_msg[:200]}'
                if attempt < max_retries - 1:
                    backoff = 10 * (attempt + 1) + random.uniform(2, 5)
                    print(f"      Topics error: {e}, retrying in {backoff:.0f}s...")
                    time.sleep(backoff)
                else:
                    print(f"      Topics failed after {max_retries} attempts: {e}")
                    break
    
    return result


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Main discovery function with full forensic logging."""
    run_start = datetime.utcnow()
    run_timestamp = run_start.strftime('%Y%m%d_%H%M%S')
    
    print("=" * 80)
    print("PYTRENDS DISCOVERY SCRIPT - FORENSIC EDITION v2")
    print(f"Started at: {run_start.isoformat()}")
    print(f"Processing {len(SEED_KEYWORDS)} seed keywords")
    print("=" * 80)
    
    # ─────────────────────────────────────────────────────────────────────
    # ENVIRONMENT & CONFIG
    # ─────────────────────────────────────────────────────────────────────
    supabase_url = os.environ.get('SUPABASE_URL')
    blog_cron_secret = os.environ.get('WAVEALOKAM_BLOG_CRON_SECRET_V2')
    
    if not supabase_url or not blog_cron_secret:
        print("ERROR: Missing SUPABASE_URL or WAVEALOKAM_BLOG_CRON_SECRET_V2 environment variables")
        sys.exit(1)
    
    ingest_url = f"{supabase_url}/functions/v1/pytrends-ingest"
    
    # Timeframes - can be overridden by env var
    timeframes_env = os.environ.get('PYTRENDS_TIMEFRAMES', DEFAULT_TIMEFRAME)
    timeframes = [tf.strip() for tf in timeframes_env.split(',') if tf.strip()]
    
    geo = 'IN'
    
    print(f"\nConfiguration:")
    print(f"  Timeframes: {timeframes}")
    print(f"  Geo: {geo}")
    print(f"  Ingest URL: {ingest_url}")
    
    # ─────────────────────────────────────────────────────────────────────
    # FORENSIC DUMP STRUCTURE
    # ─────────────────────────────────────────────────────────────────────
    forensic_dump = {
        'run_metadata': {
            'start_time': run_start.isoformat(),
            'timeframes': timeframes,
            'geo': geo,
            'seed_count': len(SEED_KEYWORDS),
            'seeds': SEED_KEYWORDS,
        },
        'per_seed': [],
        'global': {
            'canonical_mapping': {},
            'all_raw_items': [],
            'total_raw_items': 0,
            'total_unique_after_dedupe': 0,
            'final_upsert_count': 0,
        }
    }
    
    # ─────────────────────────────────────────────────────────────────────
    # PROCESSING LOOP
    # ─────────────────────────────────────────────────────────────────────
    all_raw_items: List[Dict[str, Any]] = []
    canonical_map: Dict[str, List[Dict[str, Any]]] = {}  # keyword_norm -> list of source items
    
    for seed_idx, seed in enumerate(SEED_KEYWORDS):
        print(f"\n{'═' * 80}")
        print(f"[{seed_idx+1}/{len(SEED_KEYWORDS)}] SEED: {seed}")
        print("═" * 80)
        
        seed_forensic = {
            'seed_original': seed,
            'suggestions': [],
            'chosen_mid': None,
            'chosen_suggestion': None,
            'timeframes_data': [],
            'relevance_decisions': [],
            'rejection_reasons': [],
            'local_dedupe': {},
        }
        
        # ─────────────────────────────────────────────────────────────────
        # STEP 1: GET SUGGESTIONS & CHOOSE MID
        # ─────────────────────────────────────────────────────────────────
        print(f"\n  [1] SUGGESTIONS FOR: {seed}")
        print("  " + "-" * 70)
        
        pytrends = create_pytrends_client()
        suggestions = get_suggestions_for_seed(pytrends, seed)
        seed_forensic['suggestions'] = suggestions
        
        print(f"  Total suggestions returned: {len(suggestions)}")
        for i, sug in enumerate(suggestions):
            print(f"    [{i+1}] mid={sug.get('mid')}, type=\"{sug.get('type')}\", title=\"{sug.get('title')}\"")
        
        chosen_mid, chosen_sug = choose_best_mid(suggestions, seed)
        seed_forensic['chosen_mid'] = chosen_mid
        seed_forensic['chosen_suggestion'] = chosen_sug
        
        seed_mode = 'mid' if chosen_mid else 'text'
        
        print(f"\n  Chosen MID: {chosen_mid or 'NONE (using text)'}")
        if chosen_sug:
            print(f"  Chosen suggestion: {json.dumps(chosen_sug)}")
        
        # ─────────────────────────────────────────────────────────────────
        # STEP 2: FETCH DATA FOR EACH TIMEFRAME
        # ─────────────────────────────────────────────────────────────────
        seed_raw_items: List[Dict[str, Any]] = []
        
        for tf in timeframes:
            print(f"\n  [2] FETCHING TIMEFRAME: {tf}")
            print("  " + "-" * 70)
            
            # Delay between timeframes
            if timeframes.index(tf) > 0:
                delay = random.uniform(8, 15)
                print(f"    Waiting {delay:.1f}s before timeframe {tf}...")
                time.sleep(delay)
            
            data = fetch_related_data_for_seed(
                seed_original=seed,
                seed_mid=chosen_mid,
                seed_mode=seed_mode,
                timeframe=tf,
                geo=geo
            )
            
            tf_data = {
                'timeframe': tf,
                'queries_top_count': len(data['queries_top']),
                'queries_rising_count': len(data['queries_rising']),
                'topics_top_count': len(data['topics_top']),
                'topics_rising_count': len(data['topics_rising']),
                'queries_failure': data['queries_failure'],
                'topics_failure': data['topics_failure'],
                'raw_queries_response_keys': data['raw_queries_response_keys'],
                'raw_topics_response_keys': data['raw_topics_response_keys'],
                'queries_top': data['queries_top'],
                'queries_rising': data['queries_rising'],
                'topics_top': data['topics_top'],
                'topics_rising': data['topics_rising'],
            }
            seed_forensic['timeframes_data'].append(tf_data)
            
            # ─────────────────────────────────────────────────────────────
            # PRINT RELATED_QUERIES.TOP (ALL ROWS)
            # ─────────────────────────────────────────────────────────────
            print(f"\n    RELATED_QUERIES.TOP (N={len(data['queries_top'])}):")
            if data['queries_failure'] and not data['queries_top']:
                print(f"      [FAILURE: {data['queries_failure']}]")
            for item in data['queries_top']:
                print(f"      - \"{item['keyword_raw']}\" | value={item['pytrends_value_raw']} | norm=\"{item['keyword_norm']}\"")
            
            # ─────────────────────────────────────────────────────────────
            # PRINT RELATED_QUERIES.RISING (ALL ROWS)
            # ─────────────────────────────────────────────────────────────
            print(f"\n    RELATED_QUERIES.RISING (N={len(data['queries_rising'])}):")
            for item in data['queries_rising']:
                print(f"      - \"{item['keyword_raw']}\" | value={item['pytrends_value_raw']} | norm=\"{item['keyword_norm']}\"")
            
            # ─────────────────────────────────────────────────────────────
            # PRINT RELATED_TOPICS.TOP (ALL ROWS)
            # ─────────────────────────────────────────────────────────────
            print(f"\n    RELATED_TOPICS.TOP (N={len(data['topics_top'])}):")
            if data['topics_failure'] and not data['topics_top']:
                print(f"      [FAILURE: {data['topics_failure']}]")
            for item in data['topics_top']:
                print(f"      - \"{item['keyword_raw']}\" | mid={item.get('topic_mid')} | type=\"{item.get('topic_type', '')}\" | value={item['pytrends_value_raw']}")
            
            # ─────────────────────────────────────────────────────────────
            # PRINT RELATED_TOPICS.RISING (ALL ROWS)
            # ─────────────────────────────────────────────────────────────
            print(f"\n    RELATED_TOPICS.RISING (N={len(data['topics_rising'])}):")
            for item in data['topics_rising']:
                print(f"      - \"{item['keyword_raw']}\" | mid={item.get('topic_mid')} | type=\"{item.get('topic_type', '')}\" | value={item['pytrends_value_raw']}")
            
            # ─────────────────────────────────────────────────────────────
            # ALL ZEROS ANOMALY CHECK
            # ─────────────────────────────────────────────────────────────
            total_items = len(data['queries_top']) + len(data['queries_rising']) + len(data['topics_top']) + len(data['topics_rising'])
            if total_items == 0:
                print(f"\n    ⚠️  ALL ZEROS ANOMALY DETECTED")
                print(f"       seed_original: {seed}")
                print(f"       seed_mid: {chosen_mid}")
                print(f"       seed_mode: {seed_mode}")
                print(f"       timeframe: {tf}")
                print(f"       geo: {geo}")
                print(f"       queries_failure: {data['queries_failure']}")
                print(f"       topics_failure: {data['topics_failure']}")
                print(f"       raw_queries_response_keys: {data['raw_queries_response_keys']}")
                print(f"       raw_topics_response_keys: {data['raw_topics_response_keys']}")
            
            # ─────────────────────────────────────────────────────────────
            # BUILD RAW ITEMS FOR THIS TIMEFRAME
            # ─────────────────────────────────────────────────────────────
            all_groups = [
                ('related_queries', data['queries_top']),
                ('related_queries', data['queries_rising']),
                ('related_topics', data['topics_top']),
                ('related_topics', data['topics_rising']),
            ]
            
            for source_type, items in all_groups:
                for item in items:
                    raw_item = {
                        'seed_original': seed,
                        'seed_mode': seed_mode,
                        'seed_mid': chosen_mid,
                        'item_kind': item['item_kind'],
                        'rank_type': item['rank_type'],
                        'keyword_raw': item['keyword_raw'],
                        'keyword_norm': item['keyword_norm'],
                        'pytrends_value_raw': item['pytrends_value_raw'],
                        'pytrends_value_num': item['pytrends_value_num'],
                        'topic_mid': item.get('topic_mid'),
                        'source': 'pytrends',
                        'source_type': source_type,
                        'timeframe_used': tf,
                        'geo_used': geo,
                        # Relevance will be computed next
                        'is_relevant': None,
                        'rejection_reason': None,
                    }
                    seed_raw_items.append(raw_item)
        
        # ─────────────────────────────────────────────────────────────────
        # STEP 3: RELEVANCE FILTERING (NON-DESTRUCTIVE)
        # ─────────────────────────────────────────────────────────────────
        print(f"\n  [3] RELEVANCE FILTERING")
        print("  " + "-" * 70)
        
        relevant_count = 0
        rejected_list = []
        
        for item in seed_raw_items:
            reason = get_rejection_reason(item['keyword_raw'])
            if reason is None:
                item['is_relevant'] = True
                item['rejection_reason'] = None
                relevant_count += 1
            else:
                item['is_relevant'] = False
                item['rejection_reason'] = reason
                rejected_list.append({
                    'keyword_raw': item['keyword_raw'],
                    'reason': reason,
                })
        
        seed_forensic['relevance_decisions'] = {
            'total_items': len(seed_raw_items),
            'relevant': relevant_count,
            'rejected': len(rejected_list),
        }
        seed_forensic['rejection_reasons'] = rejected_list
        
        print(f"  Total items: {len(seed_raw_items)}")
        print(f"  Relevant: {relevant_count}")
        print(f"  Rejected: {len(rejected_list)}")
        
        # Print ALL rejected (no truncation)
        if rejected_list:
            print(f"\n  ALL REJECTED ITEMS ({len(rejected_list)}):")
            for rej in rejected_list:
                print(f"    - \"{rej['keyword_raw']}\" → {rej['reason']}")
        
        # ─────────────────────────────────────────────────────────────────
        # STEP 4: LOCAL DEDUPE WITHIN SEED
        # ─────────────────────────────────────────────────────────────────
        print(f"\n  [4] LOCAL DEDUPE WITHIN SEED")
        print("  " + "-" * 70)
        
        local_dedupe_map: Dict[str, List[Dict[str, Any]]] = {}
        for item in seed_raw_items:
            kn = item['keyword_norm']
            if kn not in local_dedupe_map:
                local_dedupe_map[kn] = []
            local_dedupe_map[kn].append({
                'keyword_raw': item['keyword_raw'],
                'item_kind': item['item_kind'],
                'rank_type': item['rank_type'],
                'source_type': item['source_type'],
                'timeframe': item['timeframe_used'],
                'is_relevant': item['is_relevant'],
            })
        
        seed_forensic['local_dedupe'] = local_dedupe_map
        
        dupes_found = sum(1 for v in local_dedupe_map.values() if len(v) > 1)
        print(f"  Unique keyword_norms: {len(local_dedupe_map)}")
        print(f"  Keywords with duplicates: {dupes_found}")
        
        # Print full local dedupe mapping (no truncation)
        print(f"\n  FULL LOCAL DEDUPE MAPPING:")
        for kn, sources in local_dedupe_map.items():
            print(f"    \"{kn}\" ({len(sources)} sources):")
            for src in sources:
                print(f"      - raw=\"{src['keyword_raw']}\" | {src['item_kind']}/{src['rank_type']} | {src['source_type']} | tf={src['timeframe']} | relevant={src['is_relevant']}")
        
        # ─────────────────────────────────────────────────────────────────
        # ADD TO GLOBAL POOL
        # ─────────────────────────────────────────────────────────────────
        all_raw_items.extend(seed_raw_items)
        
        for item in seed_raw_items:
            kn = item['keyword_norm']
            if kn not in canonical_map:
                canonical_map[kn] = []
            canonical_map[kn].append({
                'keyword_raw': item['keyword_raw'],
                'seed_original': item['seed_original'],
                'seed_mid': item['seed_mid'],
                'item_kind': item['item_kind'],
                'rank_type': item['rank_type'],
                'source_type': item['source_type'],
                'timeframe': item['timeframe_used'],
                'is_relevant': item['is_relevant'],
                'rejection_reason': item['rejection_reason'],
            })
        
        forensic_dump['per_seed'].append(seed_forensic)
        
        print(f"\n  Added {len(seed_raw_items)} items to global pool")
        
        # Delay between seeds
        if seed_idx < len(SEED_KEYWORDS) - 1:
            delay = random.uniform(8, 15)
            print(f"\n  Waiting {delay:.1f}s before next seed...")
            time.sleep(delay)
    
    # ═══════════════════════════════════════════════════════════════════════
    # GLOBAL SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    print(f"\n{'═' * 80}")
    print("GLOBAL SUMMARY")
    print("═" * 80)
    
    forensic_dump['global']['all_raw_items'] = all_raw_items
    forensic_dump['global']['total_raw_items'] = len(all_raw_items)
    forensic_dump['global']['canonical_mapping'] = canonical_map
    forensic_dump['global']['total_unique_after_dedupe'] = len(canonical_map)
    
    print(f"\nTotal raw items (all seeds, all timeframes): {len(all_raw_items)}")
    print(f"Total unique keyword_norms: {len(canonical_map)}")
    
    # ─────────────────────────────────────────────────────────────────────
    # FULL CANONICAL MAPPING (NO TRUNCATION)
    # ─────────────────────────────────────────────────────────────────────
    print(f"\n{'─' * 80}")
    print("FULL CANONICAL MAPPING:")
    print("─" * 80)
    
    for kn, sources in canonical_map.items():
        relevant_sources = [s for s in sources if s['is_relevant']]
        rejected_sources = [s for s in sources if not s['is_relevant']]
        print(f"\n\"{kn}\" ({len(sources)} total, {len(relevant_sources)} relevant, {len(rejected_sources)} rejected):")
        for src in sources:
            status = "✓" if src['is_relevant'] else f"✗ {src['rejection_reason']}"
            print(f"    - raw=\"{src['keyword_raw']}\" | seed=\"{src['seed_original']}\" | mid={src['seed_mid']} | {src['item_kind']}/{src['rank_type']} | {src['source_type']} | {status}")
    
    # ─────────────────────────────────────────────────────────────────────
    # PREPARE CANDIDATES FOR UPSERT (only relevant ones, deduped)
    # ─────────────────────────────────────────────────────────────────────
    candidates_for_upsert: List[Dict[str, Any]] = []
    
    for kn, sources in canonical_map.items():
        # Take the first relevant source for this keyword_norm
        relevant_sources = [s for s in sources if s['is_relevant']]
        if not relevant_sources:
            continue
        
        # Use the first relevant source as the canonical representation
        first = relevant_sources[0]
        all_seeds = list(set(s['seed_original'] for s in relevant_sources))
        
        # Find the full item to get all fields
        full_item = None
        for item in all_raw_items:
            if item['keyword_norm'] == kn and item['is_relevant']:
                full_item = item
                break
        
        if not full_item:
            continue
        
        candidate = {
            'keyword_raw': full_item['keyword_raw'],
            'keyword_norm': kn,
            'seed_keyword': first['seed_original'],
            'source': full_item['source_type'],  # 'related_queries' or 'related_topics' for DB constraint
            'source_type': full_item['source_type'],
            'query_type': full_item['rank_type'],
            'is_relevant': True,
            'relevance_score': calculate_relevance_score(full_item['keyword_raw']),
            'seeds': all_seeds,
            'last_pytrends_meta': {
                'value_raw': full_item['pytrends_value_raw'],
                'value_num': full_item['pytrends_value_num'],
                'rank_type': full_item['rank_type'],
                'item_kind': full_item['item_kind'],
                'topic_mid': full_item.get('topic_mid'),
                'seed_mid': full_item['seed_mid'],
                'seed_mode': full_item['seed_mode'],
                'timeframe': full_item['timeframe_used'],
                'geo': full_item['geo_used'],
            },
        }
        candidates_for_upsert.append(candidate)
    
    forensic_dump['global']['final_upsert_count'] = len(candidates_for_upsert)
    
    print(f"\n{'─' * 80}")
    print(f"CANDIDATES FOR UPSERT: {len(candidates_for_upsert)}")
    print("─" * 80)
    
    for c in candidates_for_upsert:
        seeds_str = ", ".join(c['seeds'])
        print(f"  [{c.get('relevance_score', 0):3}] \"{c['keyword_norm']}\" | seeds: {seeds_str}")
    
    # ─────────────────────────────────────────────────────────────────────
    # WRITE FORENSIC JSON DUMP
    # ─────────────────────────────────────────────────────────────────────
    forensic_dump['run_metadata']['end_time'] = datetime.utcnow().isoformat()
    
    dump_filename = f"pytrends_full_dump_{run_timestamp}.json"
    
    try:
        with open(dump_filename, 'w', encoding='utf-8') as f:
            json.dump(forensic_dump, f, indent=2, ensure_ascii=False, default=str)
        print(f"\nWROTE_FORENSIC_DUMP: {dump_filename}")
    except Exception as e:
        print(f"\nFailed to write forensic dump: {e}")
    
    # ─────────────────────────────────────────────────────────────────────
    # SEND TO EDGE FUNCTION
    # ─────────────────────────────────────────────────────────────────────
    if not candidates_for_upsert:
        print("\nNo relevant candidates found. Exiting without error (rate limiting expected).")
        return
    
    payload = {
        'candidates': candidates_for_upsert,
        'prune_before_days': 60
    }
    
    print(f"\nSending {len(candidates_for_upsert)} candidates to Edge Function...")
    
    try:
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
    
    print(f"\n{'═' * 80}")
    print(f"Discovery complete at: {datetime.utcnow().isoformat()}")
    print("═" * 80)


if __name__ == '__main__':
    main()
