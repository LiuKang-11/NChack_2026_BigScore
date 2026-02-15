import React from "react";

type SearchParams = { coin?: string } | undefined;

export default async function ScorePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const coin = (searchParams as any)?.coin;

  if (!coin) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-[#050507] text-gray-100">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">No coin specified</h1>
          <p className="text-gray-400">
            Provide a `coin` query parameter, e.g.{" "}
            <span className="text-amber-300">/score?coin=bitcoin</span>
          </p>
        </div>
      </main>
    );
  }

  // Fetch coin data from CoinGecko
  const coinRes = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
      coin,
    )}&per_page=1&page=1`,
    { cache: "no-store" },
  );
  const coinArr = await coinRes.json();
  const coinData = Array.isArray(coinArr) ? coinArr[0] : null;

  // Fetch score from internal API
  let score: any = null;
  try {
    const scoreRes = await fetch(
      `/api/score?coin=${encodeURIComponent(coin)}`,
      { cache: "no-store" },
    );
    if (scoreRes.ok) score = await scoreRes.json();
    else score = { error: `Score API returned ${scoreRes.status}` };
  } catch (e) {
    score = { error: String(e) };
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#050507] text-gray-100">
      <div className="w-full max-w-md text-left">
        {coinData ? (
          <div className="bg-[#0b0b0d] p-6 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-2xl font-bold mb-2 text-amber-300">
              {coinData.name} ({coinData.symbol?.toUpperCase()})
            </h2>

            <p>Price: ${coinData.current_price?.toLocaleString?.()}</p>
            <p>Market Cap: ${coinData.market_cap?.toLocaleString?.()}</p>
            <p>
              24h Change: {coinData.price_change_percentage_24h?.toFixed?.(2)}%
            </p>

            {score && !score.error ? (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <p className="mt-2 font-bold">
                  Master Score:{" "}
                  <span
                    className={
                      score.master_score >= 80
                        ? "text-green-400"
                        : score.master_score >= 60
                          ? "text-yellow-400"
                          : "text-red-500"
                    }
                  >
                    {score.master_score}
                  </span>
                </p>

                <p className="text-gray-300">
                  Confidence:{" "}
                  <span className="text-teal-300">{score.confidence}</span>
                  {"  "}
                  <span className="text-gray-500">
                    (coverage {score.coverage}, no social)
                  </span>
                </p>

                <div className="mt-3">
                  <p className="font-bold mb-2">Subscores</p>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li>
                      Market Integrity:{" "}
                      <span className="text-gray-100">
                        {score.subscores?.market_integrity}
                      </span>
                    </li>
                    <li>
                      Dev Velocity:{" "}
                      <span className="text-gray-100">
                        {score.subscores?.dev_velocity}
                      </span>
                    </li>
                    <li>
                      On-chain Security:{" "}
                      <span className="text-gray-100">
                        {score.subscores?.on_chain_security}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="font-bold mb-2">Reasons</p>
                  <div className="text-sm space-y-2 text-gray-300">
                    <p>
                      <span className="text-amber-300">Market:</span>{" "}
                      {score.rationale?.market_integrity}
                    </p>
                    <p>
                      <span className="text-amber-300">Dev:</span>{" "}
                      {score.rationale?.dev_velocity}
                    </p>
                    <p>
                      <span className="text-amber-300">On-chain:</span>{" "}
                      {score.rationale?.on_chain_security}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="mt-2 text-gray-400">
                  Reliability Score will be calculated by AI.
                </p>
                {score?.error && (
                  <p className="text-red-500 mt-2 text-sm">{score.error}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400">Coin not found.</p>
        )}
      </div>
    </main>
  );
}
