// UI reworked with Claude AI — blue button, URL icon input, structured result state, color-coded verdict card + progress bar, Bedrock AI explanation
import { useState, type ChangeEvent } from "react";
import { useAuth } from "react-oidc-context";
import { Link2, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

type Result =
  | "idle"
  | "loading"
  | { label: string; pct: number; explanation?: string }
  | { error: string };

export default function Checker() {
    const auth = useAuth();
    const claims = auth.user?.profile as Record<string, string | undefined>;
    const username = claims?.["cognito:username"] || "User";
    const [url, setUrl] = useState("");
    const [result, setResult] = useState<Result>("idle");
    const [explanationOpen, setExplanationOpen] = useState(false);

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

      try {
        const idToken = auth.user?.id_token;
        const response = await fetch("/api/predict_url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          setResult({ error: `API error: ${response.status}` });
          return;
        }

        const data = await response.json();
        const probFake = data.probability !== undefined ? 1 - data.probability : data.prob_fake;
        const pct = Math.round((probFake || 0) * 100);
        const explanation = data.explanation ?? undefined;
        setResult({ label: data.label?.toUpperCase?.() || "N/A", pct, explanation });
        if (explanation) setExplanationOpen(true);
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
        ? { border: "border-emerald-400/60", bg: "bg-emerald-400/10", label: "text-emerald-300", icon: "text-emerald-400", verdict: "Likely Real", bar: "#34d399" }
        : isFake
        ? { border: "border-red-500/60", bg: "bg-red-500/10", label: "text-red-300", icon: "text-red-400", verdict: "Likely Fake", bar: "#ef4444" }
        : { border: "border-orange-400/60", bg: "bg-orange-400/10", label: "text-orange-300", icon: "text-orange-400", verdict: "Uncertain", bar: "#fb923c" };

      const { explanation } = result;

      return (
        <div className={`rounded-lg border border-l-4 ${colors.border} ${colors.bg} p-4 space-y-3`}>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${colors.label} uppercase tracking-wide`}>
              {colors.verdict}
            </span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
              <span>Fake probability</span>
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
                  <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">{explanation}</p>
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
