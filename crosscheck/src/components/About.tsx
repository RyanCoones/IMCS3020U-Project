// UI reworked with Claude AI — 2-column card grid (How It Works, Model, Disclaimer, Privacy)
import { AlertTriangle, Cpu, Info, ShieldCheck } from "lucide-react";

export default function About() {
  return (
    <div className="flex flex-col gap-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-4xl mx-auto shadow-lg shadow-black/30">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">About</h1>
        <p className="text-neutral-400 text-sm mt-1">CrossCheck helps you review content quickly with model-backed credibility checks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* How It Works */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
          <div className="flex items-center gap-2 mb-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} />
            How It Works
          </div>
          <ol className="space-y-2 text-sm text-neutral-300">
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
              Paste a URL or use the browser extension on any page
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
              Our ML model analyzes the article's content and metadata
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
              Get a Real / Uncertain / Fake verdict with a confidence score and explanation.
            </li>
          </ol>
        </div>

        {/* About the Model */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
          <div className="flex items-center gap-2 mb-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <Cpu size={14} />
            About the Model
          </div>
          <p className="text-sm text-neutral-300">
            We can put information about each model, its training data, accuracy metrics, and known limitations here.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-500/5 rounded-xl border border-blue-500/30 p-4">
          <div className="flex items-center gap-2 mb-3 text-blue-500/70 text-xs font-semibold uppercase tracking-wider">
            <AlertTriangle size={14} />
            Disclaimer
          </div>
          <p className="text-sm text-neutral-400">
            CrossCheck is a cautionary tool, not a final arbiter of truth. Results may be inaccurate. Always apply your own critical judgment when evaluating news sources.
          </p>
        </div>

        {/* Data Privacy */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
          <div className="flex items-center gap-2 mb-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <Info size={14} />
            Data Privacy
          </div>
          <p className="text-sm text-neutral-300">
            CrossCheck does not store the content of articles you check. Only the URL and result are logged to your account history.
          </p>
        </div>

      </div>
    </div>
  );
}
