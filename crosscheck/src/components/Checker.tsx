// UI reworked with Claude AI — blue button, URL icon input, structured result state, color-coded verdict card + progress bar, Bedrock AI explanation
import { useState, type ChangeEvent } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE } from "../api";
import { Link2, ShieldCheck, Sparkles, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import ReactMarkdown from "react-markdown";

type FactCheckClaim = {
  claim: string;
  verdict: "Supported" | "Contradicted" | "Unverified";
  summary: string;
  sources: { title: string; url: string; description: string }[];
};

type Result =
  | "idle"
  | "loading"
  | { label: string; pct: number; explanation?: string; factCheck?: FactCheckClaim[] }
  | { error: string };

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

export default function Checker() {
    const auth = useAuth();
    const claims = auth.user?.profile as Record<string, string | undefined>;
    const isGuest = localStorage.getItem("cc_guest") === "true";
    const username = isGuest ? "Guest" : (claims?.["cognito:username"] || "User");
    const [url, setUrl] = useState("");
    const [result, setResult] = useState<Result>("idle");
    const [explanationOpen, setExplanationOpen] = useState(false);
    const [factCheckOpen, setFactCheckOpen] = useState(false);
    const [skipAnalysis, setSkipAnalysis] = useState(() => localStorage.getItem("cc_skip_analysis") === "true");
    const [skipFactCheck, setSkipFactCheck] = useState(() => localStorage.getItem("cc_skip_factcheck") === "true");

    const toggleSkipAnalysis = (v: boolean) => {
      setSkipAnalysis(v);
      localStorage.setItem("cc_skip_analysis", String(v));
    };
    const toggleSkipFactCheck = (v: boolean) => {
      setSkipFactCheck(v);
      localStorage.setItem("cc_skip_factcheck", String(v));
    };

    const isValidUrl = (val: string) => {
      try { return ["http:", "https:"].includes(new URL(val).protocol); }
      catch { return false; }
    };

    const handleCheck = async (event?: ChangeEvent) => {
      event?.preventDefault();
      if (!isValidUrl(url)) {
        setResult({ error: "Please enter a valid URL (must start with http:// or https://)" });
        return;
      }
      setResult("loading");
      setExplanationOpen(false);
      setFactCheckOpen(false);

      try {
        const idToken = auth.user?.id_token;
        const response = await fetch(`${API_BASE}/predict_url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ url, skip_analysis: skipAnalysis, skip_factcheck: skipFactCheck }),
        });

        if (!response.ok) {
          setResult({ error: `API error: ${response.status}` });
          return;
        }

        const data = await response.json();
        const probFake = data.probability !== undefined ? 1 - data.probability : data.prob_fake;
        const pct = Math.round((probFake || 0) * 100);
        const explanation = data.explanation ?? undefined;
        const factCheck: FactCheckClaim[] | undefined = Array.isArray(data.fact_check) && data.fact_check.length > 0
          ? data.fact_check
          : undefined;
        setResult({ label: data.label?.toUpperCase?.() || "N/A", pct, explanation, factCheck });
        if (explanation) setExplanationOpen(localStorage.getItem("cc_auto_analysis")   !== "false");
        if (factCheck)   setFactCheckOpen(localStorage.getItem("cc_auto_factcheck") !== "false");
      } catch (error) {
        setResult({ error: `Request failed: ${error}` });
      }
    };

    const resultCard = () => {
      if (result === "idle") {
        return (
          <div className="flex items-center gap-2 text-neutral-600 text-sm">
            <ShieldCheck size={16} />
            <span>Results will appear here</span>
          </div>
        );
      }
      if (result === "loading") {
        return (
          <div className="flex items-center gap-2 text-neutral-400 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0"></div>
            <span>Analyzing article...</span>
          </div>
        );
      }
      if ("error" in result) {
        return (
          <div className="rounded-lg border border-l-4 border-red-500/60 bg-red-500/10 p-3">
            <p className="text-red-300 text-sm font-semibold">Error</p>
            <p className="text-neutral-400 text-xs mt-1">{result.error}</p>
          </div>
        );
      }

      const { pct } = result;
      const isReal = pct < 25;
      const isFake = pct > 60;

      const colors = isReal
        ? { border: "border-emerald-400/60", bg: "bg-emerald-400/10", label: "text-emerald-300", icon: "text-emerald-400", verdict: "No Concerns Detected", bar: "#34d399" }
        : isFake
        ? { border: "border-red-500/60", bg: "bg-red-500/10", label: "text-red-300", icon: "text-red-400", verdict: "Credibility Concerns", bar: "#ef4444" }
        : { border: "border-orange-400/60", bg: "bg-orange-400/10", label: "text-orange-300", icon: "text-orange-400", verdict: "Review Recommended", bar: "#fb923c" };

      const { explanation, factCheck } = result;

      return (
        <div className={`rounded-lg border border-l-4 ${colors.border} ${colors.bg} p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${colors.label} uppercase tracking-wide`}>
              {colors.verdict}
            </span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
              <span>Concern level</span>
              <span className={`font-semibold ${colors.label}`}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-950 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: colors.bar }}
              ></div>
            </div>
          </div>

          {explanation && (
            <div>
              <button
                onClick={() => setExplanationOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <Sparkles size={12} className="text-blue-400" />
                AI Analysis
                {explanationOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {explanationOpen && (
                <div className="mt-2 bg-neutral-900/70 rounded-lg border border-neutral-700 p-3">
                  <div className="text-xs text-neutral-300 leading-relaxed prose-explanation">
                    <ReactMarkdown components={{
                      p:      ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul:     ({children}) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                      ol:     ({children}) => <ol className="list-decimal pl-4 space-y-1 mb-2">{children}</ol>,
                      li:     ({children}) => <li>{children}</li>,
                      strong: ({children}) => <strong className="font-semibold text-neutral-200">{children}</strong>,
                      em:     ({children}) => <em className="italic">{children}</em>,
                    }}>{explanation}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {factCheck && factCheck.length > 0 && (
            <div>
              <button
                onClick={() => setFactCheckOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <ListChecks size={12} className="text-purple-400" />
                Fact Check
                {factCheckOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {factCheckOpen && (
                <div className="mt-2 space-y-2">
                  {factCheck.map((item, i) => (
                    <FactCheckClaimCard key={i} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

    return (
        <div className="flex flex-col gap-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-4xl mx-auto shadow-lg shadow-black/30">
            <div>
              <h1 className="text-xl font-bold text-neutral-100">Checker</h1>
              <p className="text-neutral-400 text-sm mt-1">Welcome back, {username}. Get a credibility assessment below.</p>
            </div>

            <div className="rounded-xl bg-neutral-800 p-4 border border-neutral-700">
                <h2 className="text-neutral-300 font-semibold text-sm mb-3 uppercase tracking-wider">Input</h2>
                <form onSubmit={handleCheck} className="space-y-3">
                  <div className="relative">
                    <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste a URL to check..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-neutral-100 placeholder:text-neutral-600 outline-none transition text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={skipAnalysis}
                        onChange={(e) => toggleSkipAnalysis(e.target.checked)}
                        className="accent-blue-500 cursor-pointer"
                      />
                      <span>Skip AI analysis (faster)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={skipFactCheck}
                        onChange={(e) => toggleSkipFactCheck(e.target.checked)}
                        className="accent-blue-500 cursor-pointer"
                      />
                      <span>Skip fact check (faster)</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={result === "loading" || !url.trim()}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {result === "loading" && (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    )}
                    {result === "loading" ? "Checking..." : "Check"}
                  </button>
                </form>
            </div>

            <div className="rounded-xl bg-neutral-800 p-4 border border-neutral-700">
                <h2 className="text-neutral-300 font-semibold text-sm mb-3 uppercase tracking-wider">Results</h2>
                {resultCard()}
            </div>
        </div>
    );
}
