// UI reworked with Claude AI — 2-column card grid (How It Works, Model, Disclaimer, Privacy)
import { AlertTriangle, Cpu, Info, ShieldCheck, FlaskConical } from "lucide-react";

function MetricPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border ${accent} px-3 py-2 min-w-0`}>
      <span className="text-base font-bold text-neutral-100 leading-none">{value}</span>
      <span className="text-xs text-neutral-500 mt-0.5 text-center">{label}</span>
    </div>
  );
}

export default function About() {
  return (
    <div className="flex flex-col gap-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-4xl mx-auto shadow-lg shadow-black/30">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">About</h1>
        <p className="text-neutral-400 text-sm mt-1">
          CrossCheck is a research project exploring model-backed real-time misinformation detection, built by Ryan Coones, Jeremy McPaul, and Lucas Fischer.
        </p>
      </div>

      {/* How It Works — full width */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 space-y-4">
        <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck size={14} />
          How It Works
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Concern Level</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            A GRU neural network trained on thousands of news articles analyses the writing style and
            linguistic patterns of the article — not its facts. It detects signals like emotionally charged
            language, vague attribution, sensationalist phrasing, and structural patterns that appear more
            frequently in unreliable content. The result is a concern level, not a verdict.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5">No Concerns Detected — &lt; 25%</span>
            <span className="text-xs bg-orange-400/10 text-orange-400 border border-orange-400/30 rounded-full px-2.5 py-0.5">Review Recommended — 25–60%</span>
            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 rounded-full px-2.5 py-0.5">Credibility Concerns — &gt; 60%</span>
          </div>
        </div>

        <div className="border-t border-neutral-700/60" />

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Fact Check</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Specific verifiable claims are extracted from the article and searched on the web using Brave Search.
            The results are then analysed by an AI to assess whether each claim is{" "}
            <span className="text-emerald-400 font-medium">Supported</span>,{" "}
            <span className="text-red-400 font-medium">Contradicted</span>, or{" "}
            <span className="text-neutral-300 font-medium">Unverified</span>{" "}
            based on what current sources say.
          </p>
        </div>
      </div>

      {/* About the Model */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 space-y-4">
        <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
          <Cpu size={14} />
          About the Model
        </div>

        <p className="text-sm text-neutral-400 leading-relaxed">
          CrossCheck uses a <span className="text-neutral-200 font-medium">Gated Recurrent Unit (GRU)</span> classifier — a sequence model with a reset gate and an update gate, making it more computationally efficient than an LSTM while capturing long-range linguistic dependencies. The GRU was selected after comparing five architectures (RNN, Naive Bayes, LSTM, BiLSTM, GRU) trained and evaluated on identical data splits.
        </p>

        {/* Performance metrics */}
        <div>
          <p className="text-xs text-neutral-500 mb-2">Test set performance — WELFake dataset</p>
          <div className="grid grid-cols-4 gap-2">
            <MetricPill label="Accuracy"   value="99.04%" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Macro F1"   value="0.9904" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="ROC-AUC"    value="0.9995" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Brier Score" value="0.0074" accent="border-blue-500/30 bg-blue-500/5" />
          </div>
        </div>

        <div className="border-t border-neutral-700/60" />

        {/* Dataset */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-300">Training Dataset</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Models were trained and evaluated on the <span className="text-neutral-200">WELFake dataset</span> (Kaggle), containing 72,134 news articles split nearly evenly between real and fake classes. The dataset was shuffled and divided 80 / 10 / 10 into training, validation, and test sets. Article text was normalised, lowercased, and mapped to a 10,000-word vocabulary. Input sequences were padded or truncated to 400 tokens.
          </p>
        </div>

        <div className="border-t border-neutral-700/60" />

        {/* Known limitations */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-orange-400">Known Limitations</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Despite high test-set accuracy, the model exhibits a <span className="text-orange-300 font-medium">political topic bias</span>: 73% of the GRU's misclassifications involve articles containing political language. This is because the training data contains a political topic bias, causing the model to associate political vocabulary with fake news. Legitimate political journalism may therefore receive elevated concern levels. This is an active area of improvement.
          </p>
        </div>
      </div>

      {/* Research & Future Work */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 space-y-3">
        <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
          <FlaskConical size={14} />
          Research & Future Work
        </div>
        <p className="text-sm text-neutral-400 leading-relaxed">
          CrossCheck is an active research project. Ongoing work focuses on reducing the model's susceptibility to topic bias through two approaches:
        </p>
        <ul className="space-y-2">
          <li className="flex gap-3 text-sm text-neutral-400">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
            <span><span className="text-neutral-200 font-medium">Adversarial Debiasing</span> — training an adversary alongside the classifier that attempts to predict topic information from the model's output, penalising topic-dependent predictions.</span>
          </li>
          <li className="flex gap-3 text-sm text-neutral-400">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
            <span><span className="text-neutral-200 font-medium">Stacked Generalisation</span> — combining multiple models with complementary weaknesses under a meta-learner that determines which predictions to trust.</span>
          </li>
          <li className="flex gap-3 text-sm text-neutral-400">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
            <span><span className="text-neutral-200 font-medium">Transformer model</span> — evaluating a transformer-based architecture to compare against the current GRU baseline.</span>
          </li>
        </ul>
      </div>

        {/* Data Privacy */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
          <div className="flex items-center gap-2 mb-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <Info size={14} />
            Data Privacy
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">
            CrossCheck does not store the content of articles you check. Only the URL, title, and result
            are logged to your account history.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-500/5 rounded-xl border border-blue-500/30 p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-3 text-blue-500/70 text-xs font-semibold uppercase tracking-wider">
            <AlertTriangle size={14} />
            Disclaimer
          </div>
          <p className="text-sm text-neutral-400 leading-relaxed">
            CrossCheck is a research tool, not a final arbiter of truth. High test-set accuracy does not guarantee real-world reliability — particularly for political content, where the model's known topic bias may produce elevated concern levels for legitimate journalism. Neither the concern level nor the fact-check constitutes a definitive determination of an article's accuracy. Always apply your own critical judgment when evaluating news sources.
          </p>
        </div>
    </div>
  );
}
