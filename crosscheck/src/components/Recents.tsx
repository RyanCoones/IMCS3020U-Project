// UI reworked with Claude AI — richer list items with title/url/badge, fetches real history from /api/history, per-item delete, inline AI explanation
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE } from "../api";
import { ShieldCheck, Trash2, Sparkles, ChevronUp, ChevronDown, ListChecks } from "lucide-react";
import ReactMarkdown from "react-markdown";

type FactCheckClaim = {
  claim: string;
  verdict: "Supported" | "Contradicted" | "Unverified";
  summary: string;
  sources: { title: string; url: string; description: string }[];
};

type HistoryItem = {
  id: string;
  url: string;
  title: string | null;
  label: "real" | "fake";
  probability: number;
  explanation?: string | null;
  fact_check?: FactCheckClaim[] | null;
  checked_at: string;
};

type Status = "real" | "fake" | "uncertain";

const statusConfig = {
  real:      { border: "border-emerald-400/60", badge: "bg-emerald-400/15 text-emerald-300", label: "Clear" },
  fake:      { border: "border-red-500/60",     badge: "bg-red-500/15 text-red-300",         label: "Flagged" },
  uncertain: { border: "border-orange-400/60",  badge: "bg-orange-400/15 text-orange-300",   label: "Review" },
};

const verdictStyles: Record<string, { bg: string; border: string; text: string }> = {
  Supported:    { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300" },
  Contradicted: { bg: "bg-red-500/10",     border: "border-red-500/40",     text: "text-red-300" },
  Unverified:   { bg: "bg-neutral-700/40", border: "border-neutral-600",    text: "text-neutral-400" },
};

function FactCheckClaimCard({ item }: { item: FactCheckClaim }) {
  const s = verdictStyles[item.verdict] ?? verdictStyles.Unverified;
  return (
    <div className={`rounded-lg border ${s.border} ${s.bg} p-3 space-y-1.5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-neutral-300 font-medium leading-snug flex-1">{item.claim}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${s.text} border ${s.border}`}>
          {item.verdict}
        </span>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed">{item.summary}</p>
      {item.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {item.sources.map((src, j) => (
            <a
              key={j}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline truncate max-w-55"
            >
              {src.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

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

    fetch(`${API_BASE}/history`, {
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
      const res = await fetch(`${API_BASE}/history/${id}`, {
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
          const hasExpanded = !!(item.explanation || item.fact_check?.length);
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
                    {hasExpanded && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        title="AI Analysis & Fact Check"
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
                    <span className="text-xs text-neutral-400">{pctFake}% concern</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>

              {isExpanded && hasExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {item.explanation && (
                    <div className="bg-neutral-900/70 rounded-lg border border-neutral-700 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-blue-400 mb-2 font-medium">
                        <Sparkles size={11} />
                        AI Analysis
                      </div>
                      <div className="text-xs text-neutral-300 leading-relaxed">
                        <ReactMarkdown components={{
                          p:      ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul:     ({children}) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                          ol:     ({children}) => <ol className="list-decimal pl-4 space-y-1 mb-2">{children}</ol>,
                          li:     ({children}) => <li>{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-neutral-200">{children}</strong>,
                          em:     ({children}) => <em className="italic">{children}</em>,
                        }}>{item.explanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {item.fact_check && item.fact_check.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-2 font-medium">
                        <ListChecks size={11} />
                        Fact Check
                      </div>
                      <div className="space-y-1.5">
                        {item.fact_check.map((fc, i) => (
                          <FactCheckClaimCard key={i} item={fc} />
                        ))}
                      </div>
                    </div>
                  )}
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
