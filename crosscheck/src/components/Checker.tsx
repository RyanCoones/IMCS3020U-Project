import { useState, type ChangeEvent } from "react";
import { useAuth } from "react-oidc-context"

export default function Checker() {
    const auth = useAuth()
    const claims = auth.user?.profile as Record<string, string | undefined>;
    const username = claims?.["cognito:username"] || "User";
    const [url, setUrl] = useState("");
    const [result, setResult] = useState("Results will appear here.");
    const [loading, setLoading] = useState(false);

    const handleCheck = async (event?: ChangeEvent) => {
      event?.preventDefault();
      setLoading(true);
      setResult("Checking...");

      try {
        const response = await fetch("/api/predict_url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          setResult(`API error: ${response.status}`);
          return;
        }

        const data = await response.json();
        const probFake = data.probability !== undefined ? 1 - data.probability : data.prob_fake;
        const pct = Math.round((probFake || 0) * 100);
        setResult(`Prediction: ${data.label?.toUpperCase?.() || "N/A"} | Fake probability: ${pct}%`);
      } catch (error) {
        setResult(`Request failed: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    return (
        <div className="flex flex-col gap-6 bg-ccgreen-700 rounded-md p-4 w-full max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold">Checker</h1>
            <p>Welcome back, {username}. Get a credibility assessment here.</p>
            <div className="rounded-md bg-ccgreen-800 p-4 border border-ccgreen-600">
                <h2 className="font-semibold mb-2">Input</h2>
                <form onSubmit={handleCheck} className="space-y-3">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL to check"
                    className="w-full p-2 rounded bg-ccgreen-900 text-white"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 rounded bg-ccblue-600 hover:bg-ccblue-500 disabled:opacity-50"
                  >
                    Check
                  </button>
                </form>
            </div>
            <div className="rounded-md bg-ccgreen-800 p-4 border border-ccgreen-600">
                <h2 className="font-semibold mb-2">Results</h2>
                <p className="text-sm text-ccgreen-200">{result}</p>
            </div>
        </div>
    )
}
