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
            A stacked generalisation ensemble — combining a GRU, LSTM, and Naive Bayes classifier under a
            learned meta-learner — analyzes the writing style and linguistic patterns of the article, not its
            facts. It detects signals like emotionally charged language, vague attribution, sensationalist
            phrasing, and structural patterns that appear more frequently in unreliable content. The result
            is a concern level, not a verdict.
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
            The results are then analyzed by an AI to assess whether each claim is{" "}
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
          CrossCheck uses a <span className="text-neutral-200 font-medium">stacked generalisation ensemble</span> — a meta-learning architecture that combines three complementary base models under a learned meta-learner, weighting their predictions based on agreement and individual confidence.
        </p>

        {/* Architecture breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-300">Architecture</p>
          <div className="space-y-2">
            <div className="bg-neutral-700/40 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Base Models</p>
              <ul className="space-y-1.5 text-sm text-neutral-400">
                <li><span className="text-neutral-200 font-medium">GRU</span> — Gated Recurrent Unit. Captures long-range linguistic dependencies via reset and update gates; computationally efficient and selected as the strongest individual performer across five evaluated architectures (RNN, Naive Bayes, LSTM, BiLSTM, GRU).</li>
                <li><span className="text-neutral-200 font-medium">LSTM</span> — Long Short-Term Memory. Similar sequence model with a more expressive gating mechanism (input, forget, output gates), providing complementary failure modes to the GRU.</li>
                <li><span className="text-neutral-200 font-medium">Naive Bayes</span> — Bernoulli probabilistic classifier operating on word-level presence features. Provides a statistically independent signal from a fundamentally different modelling approach.</li>
              </ul>
            </div>
            <div className="bg-neutral-700/40 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Meta-Learner</p>
              <p className="text-sm text-neutral-400">A two-layer MLP (ReLU activations, 5% dropout) trained on out-of-fold (OOF) predictions from each base model. Input features include each model's individual probability, their standard deviation, and their spread — allowing the meta-learner to detect disagreement and down-weight uncertain or conflicting predictions.</p>
            </div>
          </div>
        </div>

        {/* Performance metrics */}
        <div>
          <p className="text-xs text-neutral-500 mb-2">GRU base model — test set performance on WELFake dataset</p>
          <div className="grid grid-cols-4 gap-2">
            <MetricPill label="Accuracy"   value="99.04%" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Macro F1"   value="0.9904" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="ROC-AUC"    value="0.9995" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Brier Score" value="0.0074" accent="border-blue-500/30 bg-blue-500/5" />
          </div>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-2">LSTM base model — test set performance on WELFake dataset</p>
          <div className="grid grid-cols-4 gap-2">
            <MetricPill label="Accuracy"   value="98.64%" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Macro F1"   value="0.9864" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="ROC-AUC"    value="0.9987" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Brier Score" value="0.0118" accent="border-blue-500/30 bg-blue-500/5" />
          </div>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-2">NB base model — test set performance on WELFake dataset</p>
          <div className="grid grid-cols-4 gap-2">
            <MetricPill label="Accuracy"   value="81.20%" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Macro F1"   value="0.8103" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="ROC-AUC"    value="0.9153" accent="border-blue-500/30 bg-blue-500/5" />
            <MetricPill label="Brier Score" value="0.1815" accent="border-blue-500/30 bg-blue-500/5" />
          </div>
        </div>

        <div className="border-t border-neutral-700/60" />

        {/* Dataset */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-300">Training Dataset</p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            All models were trained and evaluated on the <span className="text-neutral-200">WELFake dataset</span> (Kaggle), containing 72,134 news articles split nearly evenly between real and fake classes. The dataset was shuffled and divided 80 / 10 / 10 into training, validation, and test sets. Article text was normalised, lowercased, and mapped to a 10,000-word vocabulary. Input sequences were padded or truncated to 400 tokens. The meta-learner was trained separately on out-of-fold predictions to prevent data leakage.
          </p>
        </div>

        <div className="border-t border-neutral-700/60" />

        {/* Known limitations */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-orange-400">Known Limitations</p>
          <ul className="space-y-3">
            <li className="text-sm text-neutral-400 leading-relaxed">
              <span className="text-orange-300 font-medium">Political topic bias.</span> 73% of the GRU's misclassifications involve articles containing political language. Because the WELFake dataset over-represents political content in its fake-news class, all base models have learned to associate political vocabulary with lower credibility. Legitimate political journalism may receive elevated concern levels as a result.
            </li>
            <li className="text-sm text-neutral-400 leading-relaxed">
              <span className="text-orange-300 font-medium">Limited training data scope.</span> The WELFake dataset was compiled primarily from American news sources circa 2021. The models' understanding of writing style, framing conventions, and language patterns reflects this scope — they may generalise poorly to non-American publications, non-English sources translated to English, or coverage styles that have evolved since the dataset was collected.
            </li>
            <li className="text-sm text-neutral-400 leading-relaxed">
              <span className="text-orange-300 font-medium">Web crawler access restrictions.</span> Article text is extracted automatically from the submitted URL. In an era of increased AI-driven scraping, some publishers have introduced bot detection, paywalls, or crawler-blocking measures that prevent full text retrieval. When this occurs, CrossCheck analyzes only a partial or empty extract, which may produce unreliable results. The fact-check step is similarly affected, as claims cannot be extracted from content that was not retrieved.
            </li>
          </ul>
        </div>
      </div>

      {/* Research & Future Work */}
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 space-y-3">
        <div className="flex items-center gap-2 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
          <FlaskConical size={14} />
          Research & Future Work
        </div>
        <p className="text-sm text-neutral-400 leading-relaxed">
          CrossCheck is an active research project. Work has focused on reducing the model's susceptibility to topic bias and improving robustness.
        </p>
        <ul className="space-y-2">
          <li className="flex gap-3 text-sm text-neutral-400">
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
            <span><span className="text-neutral-200 font-medium">Stacked Generalisation</span> — combining GRU, LSTM, and Naive Bayes under an MLP meta-learner trained on out-of-fold predictions. The meta-learner exploits disagreement between base models to improve robustness on ambiguous examples. <span className="text-emerald-400 text-xs font-medium">Implemented.</span></span>
          </li>
          <li className="flex gap-3 text-sm text-neutral-400">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
            <span><span className="text-neutral-200 font-medium">Adversarial Debiasing</span> — training an adversary alongside the classifier that attempts to predict topic information from the model's output, penalising topic-dependent predictions.</span>
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
