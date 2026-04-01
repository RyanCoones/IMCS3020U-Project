// UI redesigned with Claude AI — Carbon & Blue theme, Cognito PKCE auth, guest mode, AI explanation

const COGNITO_DOMAIN = "https://us-east-2r9vc108ea.auth.us-east-2.amazoncognito.com";
const CLIENT_ID = "47v1mbhis0gtrl7df2rm8n06nm";
const API_BASE = "https://crosscheck-production.up.railway.app";

// ── SVG icons ────────────────────────────────────────────────────────────────
const icons = {
  spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  check:   `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  xmark:   `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
};

const style = document.createElement("style");
style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
document.head.appendChild(style);

// ── PKCE helpers ─────────────────────────────────────────────────────────────
function randomString(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join("");
}

async function codeChallenge(verifier) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── Auth ─────────────────────────────────────────────────────────────────────
async function signIn() {
  const verifier = randomString(64);
  const challenge = await codeChallenge(verifier);
  const redirectUrl = chrome.identity.getRedirectURL();

  await chrome.storage.local.set({ pkce_verifier: verifier });

  const authUrl = `${COGNITO_DOMAIN}/oauth2/authorize?` +
    `response_type=code&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&code_challenge=${challenge}&code_challenge_method=S256`;

  let responseUrl;
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
  } catch {
    return; // user cancelled
  }

  const code = new URL(responseUrl).searchParams.get("code");
  const { pkce_verifier } = await chrome.storage.local.get("pkce_verifier");

  const tokenRes = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUrl,
      code_verifier: pkce_verifier,
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.id_token) return;

  const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
  const username = payload["cognito:username"] || payload.email || "User";

  await chrome.storage.local.set({
    id_token: tokens.id_token,
    access_token: tokens.access_token,
    expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    username,
  });

  showApp(username);
}

async function signOut() {
  await chrome.storage.local.remove(["id_token", "access_token", "expires_at", "username"]);
  showAuth();
}

// ── UI state ─────────────────────────────────────────────────────────────────
const authView     = document.getElementById("authView");
const appView      = document.getElementById("appView");
const userBar      = document.getElementById("userBar");
const guestBar     = document.getElementById("guestBar");
const usernameLabel = document.getElementById("usernameLabel");
const resultField  = document.getElementById("resultField");

function showAuth() {
  authView.style.display = "";
  appView.style.display = "none";
  resultField.innerHTML = "";
}

function showApp(username) {
  authView.style.display = "none";
  appView.style.display = "";
  userBar.style.display = "flex";
  guestBar.style.display = "none";
  usernameLabel.textContent = username;
}

function showGuest() {
  authView.style.display = "none";
  appView.style.display = "";
  userBar.style.display = "none";
  guestBar.style.display = "flex";
}

// On popup open: restore state
chrome.storage.local.get(["id_token", "expires_at", "username"], ({ id_token, expires_at, username }) => {
  if (id_token && expires_at && Date.now() < expires_at) {
    showApp(username || "User");
  } else {
    showAuth();
  }
});

document.getElementById("signInButton").addEventListener("click", signIn);
document.getElementById("guestButton").addEventListener("click", showGuest);
document.getElementById("signOutButton").addEventListener("click", signOut);
document.getElementById("signInFromGuestButton").addEventListener("click", signIn);

// ── Result rendering ──────────────────────────────────────────────────────────
function renderResult(pct, explanation) {
  let card;
  if (pct < 25) {
    card = `
      <div class="rounded-lg border border-l-4 border-emerald-400/60 bg-emerald-400/10 p-3">
        <div class="flex items-center gap-2 mb-1">${icons.check}
          <span class="font-semibold text-emerald-300 text-sm uppercase tracking-wide">No Concerns Detected</span>
        </div>
        <div class="text-xs text-neutral-400">Concern level: <span class="font-medium text-neutral-200">${pct}%</span></div>
      </div>`;
  } else if (pct <= 60) {
    card = `
      <div class="rounded-lg border border-l-4 border-orange-400/60 bg-orange-400/10 p-3">
        <div class="flex items-center gap-2 mb-1">${icons.warning}
          <span class="font-semibold text-orange-300 text-sm uppercase tracking-wide">Review Recommended</span>
        </div>
        <div class="text-xs text-neutral-400">Concern level: <span class="font-medium text-neutral-200">${pct}%</span></div>
      </div>`;
  } else {
    card = `
      <div class="rounded-lg border border-l-4 border-red-500/60 bg-red-500/10 p-3">
        <div class="flex items-center gap-2 mb-1">${icons.xmark}
          <span class="font-semibold text-red-300 text-sm uppercase tracking-wide">Credibility Concerns</span>
        </div>
        <div class="text-xs text-neutral-400">Concern level: <span class="font-medium text-neutral-200">${pct}%</span></div>
      </div>`;
  }

  const explanationHtml = explanation
    ? `<div class="mt-2 bg-neutral-800 rounded-lg p-3 text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">${explanation}</div>`
    : "";

  resultField.innerHTML = card + explanationHtml;
}

// ── Check current page ────────────────────────────────────────────────────────
document.getElementById("checkButton").addEventListener("click", async () => {
  resultField.innerHTML = `<div class="flex items-center justify-center gap-2 text-neutral-400 text-sm">${icons.spinner}Checking...</div>`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { id_token } = await chrome.storage.local.get("id_token");

  let response;
  try {
    response = await fetch(`${API_BASE}/predict_url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(id_token ? { Authorization: `Bearer ${id_token}` } : {}),
      },
      body: JSON.stringify({ url: tab.url }),
    });
  } catch {
    resultField.innerHTML = `
      <div class="rounded-lg border border-l-4 border-red-500/60 bg-red-500/10 p-3">
        <div class="flex items-center gap-2 mb-1">${icons.xmark}
          <span class="font-semibold text-red-300 text-sm uppercase tracking-wide">Error</span>
        </div>
        <div class="text-xs text-neutral-400">Could not reach the API.</div>
      </div>`;
    return;
  }

  if (!response.ok) {
    resultField.innerHTML = `
      <div class="rounded-lg border border-l-4 border-red-500/60 bg-red-500/10 p-3">
        <div class="flex items-center gap-2 mb-1">${icons.xmark}
          <span class="font-semibold text-red-300 text-sm uppercase tracking-wide">Error</span>
        </div>
        <div class="text-xs text-neutral-400">API error: ${response.status}</div>
      </div>`;
    return;
  }

  const data = await response.json();
  const probFake = data.probability !== undefined ? 1 - data.probability : data.prob_fake;
  const pct = Math.round((probFake || 0) * 100);
  renderResult(pct, data.explanation || null);
});
