const btn = document.getElementById("checkButton");
const result = document.getElementById("resultField");

btn.addEventListener("click", async () => {
  result.textContent = "Checking...";

  // get the url from the current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;

  // call the API
  const response = await fetch("http://localhost:5050/predict_url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  // throw error if API call fails
  if (!response.ok) {
    result.textContent = `API error: ${response.status}`;
    return;
  }

  // parse the response
  const data = await response.json();
  const probFake = data.probability !== undefined ? 1 - data.probability : data.prob_fake; // probability of being fake news: 1-probability of being real news
  const pct = Math.round((probFake || 0) * 100); // return 0% if probability is undefined, otherwise round to nearest whole number as a perentage

  // update the result field in the extension popup
  result.innerHTML = `
    <div class="mt-2 p-3 rounded-lg border bg-gray-700">
      <div class="font-medium text-gray-300">Prediction: ${data.label.toUpperCase()}</div>
      <div class="text-gray-300">Fake probability: ${pct}%</div>
    </div>
  `;
});
