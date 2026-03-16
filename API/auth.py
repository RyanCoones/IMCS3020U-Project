# AI generated with Claude — Cognito JWKS-based JWT verification, optional and required FastAPI dependencies
"""
Cognito JWT verification for FastAPI.

The frontend passes the Cognito ID token in the Authorization header:
  Authorization: Bearer <id_token>

We verify it against Cognito's public JWKS keys and return the decoded claims.
Two dependencies are exported:
  - get_current_user          → raises 401 if no valid token (protected routes)
  - get_current_user_optional → returns None if no token (predict_url, used by extension too)
"""

import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Header, HTTPException
from jose import JWTError, jwt

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

REGION        = os.environ.get("COGNITO_REGION",       "us-east-2")
USER_POOL_ID  = os.environ.get("COGNITO_USER_POOL_ID", "us-east-2_r9vC108ea")
CLIENT_ID     = os.environ.get("COGNITO_CLIENT_ID",    "47v1mbhis0gtrl7df2rm8n06nm")
JWKS_URL      = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

_jwks_cache: Optional[dict] = None


def _get_jwks() -> dict:
    """Fetch and cache Cognito's public keys (JWKS). Only fetched once per process."""
    global _jwks_cache
    if _jwks_cache is None:
        response = httpx.get(JWKS_URL, timeout=10)
        response.raise_for_status()
        _jwks_cache = response.json()
    return _jwks_cache


def _decode_token(token: str) -> dict:
    """Verify and decode a Cognito ID token. Raises HTTPException on failure."""
    try:
        claims = jwt.decode(
            token,
            _get_jwks(),
            algorithms=["RS256"],
            audience=CLIENT_ID,
            options={"verify_at_hash": False},
        )
        return claims
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    Returns decoded token claims if a valid Bearer token is present, otherwise None.
    Use on endpoints that work for both authenticated and anonymous callers.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return _decode_token(authorization.split(" ", 1)[1])
    except HTTPException:
        return None


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Returns decoded token claims. Raises 401 if the token is missing or invalid.
    Use on endpoints that require authentication.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode_token(authorization.split(" ", 1)[1])
