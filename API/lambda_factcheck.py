"""
AWS Lambda handler for fact-checking article claims via Brave Search + AWS Bedrock.

Deploy this file to a Python 3.12 Lambda function named 'crosscheck-factcheck'.
Handler: lambda_function.handler  (rename this file to lambda_function.py in the console)

Required environment variables:
  BRAVE_API_KEY            - Brave Search API subscription token
  AWS_BEARER_TOKEN_BEDROCK - Same bearer token used by the FastAPI server
  BEDROCK_REGION           - AWS region (default: us-east-2)

Event shape:  {"text": str, "title": str | null}
Response:     {"fact_check": list | null, "error": str | null}
"""

import json
import os
import re
import urllib.request
import urllib.parse
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

BRAVE_API_KEY  = os.environ.get("BRAVE_API_KEY", "")
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-2")
BEDROCK_TOKEN  = os.environ.get("AWS_BEARER_TOKEN_BEDROCK", "")
SONNET_MODEL   = os.environ.get("BEDROCK_MODEL", "us.anthropic.claude-sonnet-4-6")
BEDROCK_URL    = f"https://bedrock-runtime.{BEDROCK_REGION}.amazonaws.com/model/{SONNET_MODEL}/invoke"


def bedrock_invoke(prompt: str, max_tokens: int = 512) -> str:
    """POST a prompt to Claude via Bedrock and return the response text."""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        BEDROCK_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {BEDROCK_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["content"][0]["text"]


def _parse_json(raw: str):
    """Extract and parse the first JSON array or object from a Claude response,
    tolerating markdown fences and surrounding prose."""
    raw = raw.strip()
    # Strip markdown fences
    if raw.startswith("```"):
        parts = raw.split("```")
        if len(parts) >= 2:
            raw = parts[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
    # Try direct parse first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Fall back: find the first [...] or {...} block in the response
    match = re.search(r'(\[.*?\]|\{.*?\})', raw, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    raise ValueError(f"No JSON found in response: {raw[:300]}")


def extract_claims(text: str, title: str | None) -> list[str]:
    """Ask Claude to extract 2-3 specific, verifiable factual claims as a JSON array."""
    prompt = (
        "You are a fact-checking assistant. Read the article below and identify "
        "2 to 3 specific, verifiable factual claims (names of people and their roles, "
        "events, statistics, dates, or attributed quotes). "
        "Return ONLY a JSON array of strings — no prose, no markdown fences.\n\n"
        f"Title: {title or 'Unknown'}\n\n"
        f"Article:\n{text}\n\n"
        'Output format: ["claim one", "claim two"]'
    )
    raw = bedrock_invoke(prompt, max_tokens=256)
    return _parse_json(raw)


def brave_search(claim: str) -> list[dict]:
    """Search Brave Web Search API for a single claim. Returns up to 3 results."""
    if not BRAVE_API_KEY:
        return []
    params = urllib.parse.urlencode({"q": claim, "count": 3, "text_decorations": "0"})
    req = urllib.request.Request(
        f"https://api.search.brave.com/res/v1/web/search?{params}",
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": BRAVE_API_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            # Brave may return gzip-encoded content
            raw = resp.read()
            try:
                import gzip
                data = json.loads(gzip.decompress(raw))
            except Exception:
                data = json.loads(raw)
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", ""),
            }
            for r in data.get("web", {}).get("results", [])[:3]
        ]
    except Exception as e:
        print(f"[brave_search] error for '{claim}': {e}", flush=True)
        return []


def synthesize_fact_check(claims: list[str], search_results: dict, max_tokens: int = 2048) -> list[dict]:
    """Ask Claude to produce per-claim verdicts based on search snippets."""
    formatted = ""
    for claim in claims:
        formatted += f"\nClaim: {claim}\n"
        results = search_results.get(claim, [])
        if results:
            for r in results:
                formatted += f"  - {r['title']}: {r['description']} ({r['url']})\n"
        else:
            formatted += "  - No search results found.\n"

    prompt = (
        "You are a fact-checker. For each claim below, use ONLY the provided search results "
        "to give a verdict. Choose exactly one of: Supported, Contradicted, or Unverified.\n"
        "- Supported: search results clearly confirm the claim\n"
        "- Contradicted: search results clearly contradict the claim\n"
        "- Unverified: search results are absent, irrelevant, or inconclusive\n\n"
        "Return ONLY a JSON array — no prose, no markdown fences.\n\n"
        f"{formatted}\n\n"
        "Output format:\n"
        '[{"claim": "...", "verdict": "Supported|Contradicted|Unverified", '
        '"summary": "1-2 sentences citing source titles", '
        '"sources": [{"title": "...", "url": "...", "description": "..."}]}]'
    )
    raw = bedrock_invoke(prompt, max_tokens=max_tokens)
    return _parse_json(raw)


LAMBDA_SECRET = os.environ.get("LAMBDA_SECRET", "")


def lambda_handler(event: dict, _context) -> dict:
    """
    Lambda entry point (Function URL mode).
    Validates X-Secret-Token header, then processes the request body.
    Returns an HTTP response dict: {"statusCode": int, "body": str}
    """
    # Validate secret token when called via Function URL (Function URL events have "requestContext")
    is_function_url = "requestContext" in event
    if is_function_url and LAMBDA_SECRET:
        headers = event.get("headers", {})
        incoming_secret = headers.get("x-secret-token", "")
        if incoming_secret != LAMBDA_SECRET:
            return {"statusCode": 403, "body": json.dumps({"error": "forbidden"})}

    # Function URL puts the request body in event["body"] as a string
    raw_body = event.get("body", "")
    if raw_body:
        try:
            payload = json.loads(raw_body)
        except Exception:
            return {"statusCode": 400, "body": json.dumps({"error": "invalid JSON body"})}
    else:
        payload = event  # direct invocation (Lambda console test)

    text  = payload.get("text", "")
    title = payload.get("title")

    def ok(body: dict) -> dict:
        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}

    def err(msg: str) -> dict:
        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"fact_check": None, "error": msg})}

    if not text or len(text.split()) < 20:
        return err("text too short")

    # Step 1: extract verifiable claims
    try:
        claims = extract_claims(text, title)
    except Exception as e:
        return err(f"extract_claims failed: {e}")

    if not claims:
        return err("no claims extracted")

    print(f"[factcheck] extracted {len(claims)} claims: {claims}", flush=True)

    # Step 2: search all claims in parallel
    search_results: dict[str, list] = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(brave_search, c): c for c in claims}
        for fut in as_completed(futures):
            claim = futures[fut]
            try:
                search_results[claim] = fut.result()
            except Exception as e:
                print(f"[factcheck] search failed for '{claim}': {e}", flush=True)
                search_results[claim] = []

    # Step 3: synthesize verdicts
    try:
        fact_check = synthesize_fact_check(claims, search_results)
        return ok({"fact_check": fact_check})
    except Exception as e:
        # If JSON parse fails due to truncation, retry with more tokens
        if "Unterminated" in str(e) or "Expecting" in str(e):
            try:
                fact_check = synthesize_fact_check(claims, search_results, max_tokens=4096)
                return ok({"fact_check": fact_check})
            except Exception as e2:
                return err(f"synthesize failed: {e2}")
        return err(f"synthesize failed: {e}")
