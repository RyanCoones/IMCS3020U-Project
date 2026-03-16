// UI reworked with Claude AI — richer list items with title/url/badge, fetches real history from /api/history, per-item delete, inline AI explanation
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { ShieldCheck, Trash2, Sparkles, ChevronUp } from "lucide-react";

type HistoryItem = {
  id: string;
  url: string;
  title: string | null;
  label: "real" | "fake";
  probability: number;
  explanation?: string | null;
  checked_at: string;
};

type Status = "real" | "fake" | "uncertain";

const statusConfig = {
  real:      { border: "border-emerald-400/60", badge: "bg-emerald-400/15 text-emerald-300", label: "Real" },
  fake:      { border: "border-red-500/60",     badge: "bg-red-500/15 text-red-300",         label: "Fake" },
  uncertain: { border: "border-orange-400/60",  badge: "bg-orange-400/15 text-orange-300",   label: "Uncertain" },
};

function getStatus(label: string, probability: number): Status {
  const pctFake = Math.round((1 - probability) * 100);
  if (label === "real" && pctFake < 25) return "real";
  if (label === "fake" && pctFake > 60) return "fake";
  return "uncertain";
}

export default function Recents() {
  const auth = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const idToken = auth.user?.id_token;
    if (!idToken) {
      setLoading(false);
      return;
    }

    fetch("/api/history", {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [auth.user?.id_token]);

  const deleteItem = async (id: string) => {
    const idToken = auth.user?.id_token;
    if (!idToken) return;
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 gap-2 text-neutral-500 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          Loading history...
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-lg border-l-4 border-red-500/60 bg-red-500/10 p-3 text-red-300 text-sm">
          {error}
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-neutral-600 gap-3">
          <ShieldCheck size={36} />
          <p className="text-sm">No recent checks yet</p>
        </div>
      );
    }
    return (
      <ul className="space-y-2">
        {items.map((item) => {
          const status = getStatus(item.label, item.probability);
          const cfg = statusConfig[status];
          const pctFake = Math.round((1 - item.probability) * 100);
          const displayTitle = item.title || item.url;
          const date = new Date(item.checked_at).toLocaleDateString();

          const isExpanded = expandedId === item.id;

          return (
            <li
              key={item.id}
              className={`rounded-xl border border-l-4 ${cfg.border} bg-neutral-800 overflow-hidden`}
            >
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-200 leading-snug line-clamp-2 flex-1">{displayTitle}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.explanation && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        title="AI Analysis"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <Sparkles size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-600 truncate">{item.url} · {date}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-neutral-400">{pctFake}% fake</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
              {isExpanded && item.explanation && (
                <div className="px-3 pb-3">
                  <div className="bg-neutral-900/70 rounded-lg border border-neutral-700 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-2 font-medium">
                      <Sparkles size={11} />
                      AI Analysis
                    </div>
                    <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">{item.explanation}</p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-4xl mx-auto shadow-lg shadow-black/30">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Recently Checked</h1>
        <p className="text-neutral-400 text-sm mt-1">Your 50 most recent checks.</p>
      </div>
      {renderContent()}
    </div>
  );
}
