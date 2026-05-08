import time
from fastapi import Request, HTTPException

# Memory store for request timestamps
# Structure: { "ip_address": { "tier_name": [timestamp1, timestamp2...] } }
history = {}

# Define your custom limits
LIMITS = {
    "auth": {"max": 5, "window": 60},      # 5 logins per minute
    "execution": {"max": 3, "window": 30}, # 3 code/sql/essay runs per 30s
    "submission": {"max": 1, "window": 10} # 1 submit per 10s (prevents double-click)
}

def check_rate_limit(request: Request, tier: str):
    """
    Manually checks if the requester (by IP) has exceeded the rate limit for a specific tier.
    """
    # Get client IP
    ip = request.client.host
    now = time.time()
    
    # 1. Initialize data structures
    if ip not in history:
        history[ip] = {}
    if tier not in history[ip]:
        history[ip][tier] = []
        
    # 2. Clean up old records for this tier (Sliding Window logic)
    if tier in LIMITS:
        window = LIMITS[tier]["window"]
        max_reqs = LIMITS[tier]["max"]
        
        # Keep only timestamps within the current window
        history[ip][tier] = [t for t in history[ip][tier] if now - t < window]
        
        # 3. Check if limit exceeded
        if len(history[ip][tier]) >= max_reqs:
            raise HTTPException(
                status_code=429, 
                detail=f"Rate limit exceeded for '{tier}'. Please wait before trying again."
            )
        
        # 4. Record this request
        history[ip][tier].append(now)
    
    return True
