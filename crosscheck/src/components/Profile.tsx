// UI reworked with Claude AI — amber→blue avatar, preferences card, total checks stat, Danger Zone with account deletion
import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE } from "../api";
import { Settings, Trash2, Download, BarChart3, LogOut } from "lucide-react";

type HistoryItem = {
  id: string;
  url: string;
  title: string | null;
  label: "real" | "fake";
  probability: number;
  checked_at: string;
};

type Status = "real" | "fake" | "uncertain";

function getStatus(label: string, probability: number): Status {
  const pct = Math.round((1 - probability) * 100);
  if (label === "real" && pct < 25) return "real";
  if (label === "fake" && pct > 60) return "fake";
  return "uncertain";
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? "bg-blue-500" : "bg-neutral-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function Profile({ onLogout }: { onLogout?: () => void }) {
  const auth = useAuth();
  const claims = auth.user?.profile as Record<string, string | undefined>;
  const username = claims?.["cognito:username"] || "User";
  const email = claims?.["email"];

  const [confirming, setConfirming]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [totalChecks, setTotalChecks] = useState<number | null>(null);
  const [history, setHistory]         = useState<HistoryItem[]>([]);
  // Preferences — persisted in localStorage, default both to true
  const [autoAnalysis, setAutoAnalysis]     = useState(() => localStorage.getItem("cc_auto_analysis")   !== "false");
  const [autoFactCheck, setAutoFactCheck]   = useState(() => localStorage.getItem("cc_auto_factcheck") !== "false");

  const setPref = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  useEffect(() => {
    const token = auth.user?.id_token;
    if (!token) return;

    fetch(`${API_BASE}/stats`,   { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTotalChecks(d.total_checks)).catch(() => {});

    fetch(`${API_BASE}/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
  }, [auth.user?.id_token]);

  // Stats breakdown from history (up to 50 items)
  const counts = {
    clear:   history.filter(i => getStatus(i.label, i.probability) === "real").length,
    review:  history.filter(i => getStatus(i.label, i.probability) === "uncertain").length,
    flagged: history.filter(i => getStatus(i.label, i.probability) === "fake").length,
  };
  const histN = history.length;

  const exportCSV = () => {
    const header = ["Date", "Title", "URL", "Verdict", "Concern Level"];
    const rows = history.map(i => {
      const s = getStatus(i.label, i.probability);
      const verdict = s === "real" ? "Clear" : s === "fake" ? "Flagged" : "Review";
      return [
        new Date(i.checked_at).toLocaleDateString(),
        i.title || "",
        i.url,
        verdict,
        `${Math.round((1 - i.probability) * 100)}%`,
      ];
    });
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "crosscheck-history.csv";
    a.click();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_BASE}/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(auth.user?.id_token ? { Authorization: `Bearer ${auth.user.id_token}` } : {}),
        },
        body: JSON.stringify({ access_token: auth.user?.access_token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}`);
      }
      await auth.removeUser();
      window.location.href = "/";
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-4xl mx-auto shadow-lg shadow-black/30">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Profile</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage your account and preferences.</p>
      </div>

      {/* ── Avatar card ── */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-linear-to-b from-blue-600 to-blue-900 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-blue-500/30 shrink-0 select-none">
          {username[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-neutral-100 truncate">{username}</p>
          {email && <p className="text-neutral-500 text-xs mt-0.5 truncate">{email}</p>}
          <p className="text-neutral-400 text-xs mt-1.5">
            {totalChecks === null
              ? <span className="text-neutral-600">Loading…</span>
              : <><span className="font-semibold text-blue-400">{totalChecks.toLocaleString()}</span> checks run</>}
          </p>
        </div>
      </div>

      {/* ── Stats breakdown ── */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 size={14} />
            Breakdown
          </div>
          {histN > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              <Download size={12} />
              Export CSV
            </button>
          )}
        </div>

        {histN === 0 ? (
          <p className="text-xs text-neutral-600 py-2">No checks yet — results will appear here.</p>
        ) : (
          <>
            {/* Segmented bar */}
            <div className="flex h-2 rounded-full overflow-hidden gap-px mt-1">
              {counts.clear   > 0 && <div className="bg-emerald-500 transition-all" style={{ flex: counts.clear }} />}
              {counts.review  > 0 && <div className="bg-orange-400 transition-all"  style={{ flex: counts.review }} />}
              {counts.flagged > 0 && <div className="bg-red-500 transition-all"     style={{ flex: counts.flagged }} />}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-neutral-400"><span className="font-semibold text-emerald-400">{counts.clear}</span> Clear</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <span className="text-xs text-neutral-400"><span className="font-semibold text-orange-400">{counts.review}</span> Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-neutral-400"><span className="font-semibold text-red-400">{counts.flagged}</span> Flagged</span>
              </div>
              {totalChecks !== null && totalChecks > histN && (
                <span className="text-xs text-neutral-700 ml-auto">based on last {histN}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Preferences ── */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
        <div className="flex items-center gap-2 mb-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
          <Settings size={14} />
          Preferences
        </div>
        <div className="space-y-0 divide-y divide-neutral-700/60">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-neutral-300">Auto-expand AI Analysis</p>
              <p className="text-xs text-neutral-600 mt-0.5">Open the analysis section automatically after a check</p>
            </div>
            <Toggle checked={autoAnalysis} onChange={v => setPref("cc_auto_analysis", v, setAutoAnalysis)} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-neutral-300">Auto-expand Fact Check</p>
              <p className="text-xs text-neutral-600 mt-0.5">Open the fact-check section automatically after a check</p>
            </div>
            <Toggle checked={autoFactCheck} onChange={v => setPref("cc_auto_factcheck", v, setAutoFactCheck)} />
          </div>
        </div>
      </div>

      {/* ── Sign out (mobile only) ── */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="md:hidden flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700 transition-colors text-sm font-medium"
        >
          <LogOut size={15} />
          Sign out
        </button>
      )}

      {/* ── Danger Zone ── */}
      <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4">
        <div className="flex items-center gap-2 mb-3 text-red-400/70 text-xs font-semibold uppercase tracking-wider">
          <Trash2 size={14} />
          Danger Zone
        </div>
        {!confirming ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-300">Delete Account</p>
              <p className="text-xs text-neutral-600 mt-0.5">Permanently removes your account and all check history</p>
            </div>
            <button
              onClick={() => setConfirming(true)}
              className="shrink-0 ml-4 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-300">
              This is <span className="font-semibold text-red-400">permanent</span> and cannot be undone.
              Your Cognito account and all check history will be deleted.
            </p>
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirming(false); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-neutral-700 text-neutral-400 hover:bg-neutral-800 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
