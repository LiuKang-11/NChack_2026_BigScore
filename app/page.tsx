"use client";

import { useState } from "react";

export default function Home() {
  const [coinName, setCoinName] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchCoin() {
    if (!coinName) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Fetch top 250 coins from CoinGecko
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1",
      );
      const data = await response.json();

      // Find the coin matching the input
      const coin = data.find(
        (c: any) =>
          c.id === coinName.toLowerCase() ||
          c.symbol.toLowerCase() === coinName.toLowerCase() ||
          c.name.toLowerCase() === coinName.toLowerCase(),
      );

      if (!coin) {
        setError("Coin not found. Try bitcoin or ethereum.");
        setLoading(false);
        return;
      }

      // Example: If AI score is provided externally, replace this with your teammate's API
      // const aiResponse = await fetch(`/api/getCoinScore?coin=${coin.id}`);
      // const aiData = await aiResponse.json();
      // setResult({ ...coin, score: aiData.score });

      // For now, just pass the coin (score will come from AI later)
      // ✅ call your backend score API
      const aiResponse = await fetch(`/api/score?coin=${encodeURIComponent(coin.id)}`);
      if (!aiResponse.ok) {
        const errJson = await aiResponse.json().catch(() => ({}));
        throw new Error(errJson?.error || "Failed to get AI score");
      }
      //const aiData = await aiResponse.json();
      const scoreResp = await fetch(`/api/score?coin=${coin.id}`);
      const scoreData = await scoreResp.json();


      // merge
      setResult({
        ...coin,
        bigscore: scoreData, // 放在 bigscore 裡比較乾淨
      });
      setLoading(false);

    } catch (err) {
      setError("Failed to fetch data.");
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#0f0f0f] text-white">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2 text-pink-500 drop-shadow-lg">
          Crypto Reliability Tracker
        </h1>

        <p className="text-gray-400 mb-6">
          Search any cryptocurrency to see its reliability score.
        </p>

        <div className="flex mb-6 justify-center">
          <input
            type="text"
            placeholder="Enter coin name"
            value={coinName}
            onChange={(e) => setCoinName(e.target.value)}
            className="p-3 rounded-l-md w-64 bg-gray-900 text-white border border-gray-700 focus:outline-none focus:border-pink-500"
          />
          <button
            onClick={searchCoin}
            className="px-5 rounded-r-md font-bold bg-gradient-to-r from-pink-500 to-cyan-400 hover:shadow-lg"
          >
            Search
          </button>
        </div>

        {loading && <p className="text-gray-400">Searching...</p>}
        {error && <p className="text-red-500">{error}</p>}
        

        {result && (
          <div className="bg-[#1a1a1a] p-6 rounded-xl shadow-lg border border-gray-700 text-left">
            <h2 className="text-2xl font-bold mb-2 text-pink-500">
              {result.name} ({result.symbol.toUpperCase()})
            </h2>

            <p>Price: ${result.current_price.toLocaleString()}</p>
            <p>Market Cap: ${result.market_cap.toLocaleString()}</p>
            <p>24h Change: {result.price_change_percentage_24h.toFixed(2)}%</p>

            {/* ✅ AI BigScore */}
            {result.bigscore ? (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <p className="mt-2 font-bold">
                  Master Score:{" "}
                  <span
                    className={
                      result.bigscore.master_score >= 80
                        ? "text-green-400"
                        : result.bigscore.master_score >= 60
                          ? "text-yellow-400"
                          : "text-red-500"
                    }
                  >
                    {result.bigscore.master_score}
                  </span>
                </p>

                <p className="text-gray-300">
                  Confidence: <span className="text-cyan-300">{result.bigscore.confidence}</span>
                  {"  "}
                  <span className="text-gray-500">(coverage {result.bigscore.coverage}, no social)</span>
                </p>

                <div className="mt-3">
                  <p className="font-bold mb-2">Subscores</p>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li>
                      Market Integrity:{" "}
                      <span className="text-white">{result.bigscore.subscores.market_integrity}</span>
                    </li>
                    <li>
                      Dev Velocity:{" "}
                      <span className="text-white">{result.bigscore.subscores.dev_velocity}</span>
                    </li>
                    <li>
                      On-chain Security:{" "}
                      <span className="text-white">{result.bigscore.subscores.on_chain_security}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="font-bold mb-2">Reasons</p>
                  <div className="text-sm space-y-2 text-gray-300">
                    <p>
                      <span className="text-pink-400">Market:</span>{" "}
                      {result.bigscore.rationale.market_integrity}
                    </p>
                    <p>
                      <span className="text-pink-400">Dev:</span>{" "}
                      {result.bigscore.rationale.dev_velocity}
                    </p>
                    <p>
                      <span className="text-pink-400">On-chain:</span>{" "}
                      {result.bigscore.rationale.on_chain_security}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-gray-400">Reliability Score will be calculated by AI.</p>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
