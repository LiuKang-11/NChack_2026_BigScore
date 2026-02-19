import { headers } from "next/headers";
import Link from "next/link";

type SearchParams = { coin?: string };

const WEIGHTS = {
  market_integrity: 0.25,
  dev_velocity: 0.2,
  on_chain_security: 0.35,
  social_sentiment: 0.2,
} as const;

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}


async function getBaseUrl() {
  const h = await headers(); // ✅ await
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function ScorePage(props: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = props.searchParams ? await props.searchParams : {};
  const coin = sp?.coin?.trim();

  if (!coin) {
    return (
      <main className="flex items-center justify-center min-h-screen text-gray-100">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">No coin specified</h1>
          <p className="text-gray-400">
            Provide a <code className="text-amber-300">coin</code> query
            parameter, e.g.{" "}
            <span className="text-amber-300">/score?coin=bitcoin</span>
          </p>
        </div>
      </main>
    );
  }

  // 1) Fetch coin market data from CoinGecko (server-side)
  const coinRes = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
      coin,
    )}&per_page=1&page=1`,
    { cache: "no-store" },
  );

  const coinArr = await coinRes.json();
  const coinData = Array.isArray(coinArr) ? coinArr[0] : null;

  // 2) Fetch score from internal API (IMPORTANT: use absolute URL in Server Component)
  let score: any = null;
  try {
    const baseUrl = await getBaseUrl();
    const scoreRes = await fetch(
      `${baseUrl}/api/score?coin=${encodeURIComponent(coin)}`,
      { cache: "no-store" },
    );

    const body = await scoreRes.json().catch(() => null);
    score = scoreRes.ok
      ? body
      : {
          error:
            body?.error ||
            body?.stderr ||
            body?.message ||
            `Score API returned ${scoreRes.status}`,
          status: scoreRes.status,
          stderr: body?.stderr,
        };
  } catch (e) {
    score = { error: String(e) };
  }

  const coverage = toNumber(score?.coverage, 0.8) || 0.8;
  const contributions = [
    {
      key: "market_integrity",
      label: "Market Integrity",
      score: toNumber(score?.subscores?.market_integrity, 0),
      weight: WEIGHTS.market_integrity,
      explanation: score?.rationale?.market_integrity || "No rationale provided.",
    },
    {
      key: "dev_velocity",
      label: "Dev Velocity",
      score: toNumber(score?.subscores?.dev_velocity, 0),
      weight: WEIGHTS.dev_velocity,
      explanation: score?.rationale?.dev_velocity || "No rationale provided.",
    },
    {
      key: "on_chain_security",
      label: "On-chain Security",
      score: toNumber(score?.subscores?.on_chain_security, 0),
      weight: WEIGHTS.on_chain_security,
      explanation: score?.rationale?.on_chain_security || "No rationale provided.",
    },
    {
      key: "social_sentiment",
      label: "Social Sentiment",
      score: toNumber(score?.subscores?.social_sentiment, 0),
      weight: WEIGHTS.social_sentiment,
      explanation: score?.rationale?.social_sentiment || "No rationale provided.",
    },
  ].map((item) => ({
    ...item,
    points: (item.weight * item.score) / coverage,
  }));

  const explainedMaster = contributions.reduce((sum, c) => sum + c.points, 0);

  return (
    <main className="flex items-center justify-center min-h-screen text-gray-100 py-8">
      <div className="w-full max-w-md text-left">
        {/* Search Bar */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-block mb-4 text-amber-300 hover:text-amber-400 text-sm"
          >
            ← Back to Search
          </Link>
          <form method="get" action="/score" className="flex">
            <input
              type="text"
              name="coin"
              placeholder="Enter coin name"
              defaultValue={coin}
              className="p-3 rounded-l-md flex-1 bg-[#0b0b0d] text-gray-100 border border-gray-800 focus:outline-none focus:border-amber-300"
            />
            <button
              type="submit"
              className="px-5 rounded-r-md font-bold bg-amber-600 text-black hover:bg-amber-500 shadow-md"
            >
              Search
            </button>
          </form>
        </div>

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
                  <span className="text-teal-300">{score.confidence}</span>{" "}
                  <span className="text-gray-500">
                    (coverage {score.coverage})
                  </span>
                </p>

                <div className="mt-5 rounded-lg border border-gray-800 bg-[#09090c] p-4">
                  <p className="font-bold text-amber-300">Explainability Panel</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Weighted contribution of each component to master score.
                  </p>

                  <div className="mt-4 space-y-4">
                    {contributions.map((c) => (
                      <div key={c.key}>
                        <div className="flex items-center justify-between text-sm">
                          <p className="font-medium text-gray-200">{c.label}</p>
                          <p className="text-gray-400">
                            {Math.round(c.weight * 100)}% weight | {c.points.toFixed(2)} pts
                          </p>
                        </div>
                        <div className="mt-1 h-2 w-full rounded bg-gray-800">
                          <div
                            className="h-2 rounded bg-amber-400"
                            style={{ width: `${clampPercent(c.score)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Subscore: {c.score}/100</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded border border-gray-800 bg-[#0b0b0d] p-3 text-xs text-gray-400">
                    Estimated master from components:{" "}
                    <span className="font-semibold text-gray-200">
                      {explainedMaster.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 rounded border border-gray-700 bg-[#0b0b0d] p-3 text-xs text-gray-400">
                    <p className="font-semibold text-amber-300">
                      Social Sentiment ({Math.round(WEIGHTS.social_sentiment * 100)}% weight)
                    </p>
                    <p className="mt-1">Live inputs:</p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>
                        Reddit subscribers: {score.details?.social?.reddit_subscribers ?? 0}
                      </li>
                      <li>
                        Reddit active 48h: {score.details?.social?.reddit_active_accounts_48h ?? 0}
                      </li>
                      <li>
                        Sentiment up/down: {score.details?.social?.sentiment_votes_up_pct ?? 0}% /{" "}
                        {score.details?.social?.sentiment_votes_down_pct ?? 0}%
                      </li>
                    </ul>
                  </div>
                </div>

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
                    <li>
                      Social Sentiment:{" "}
                      <span className="text-gray-100">
                        {score.subscores?.social_sentiment}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="font-bold mb-2">Reasons</p>
                  <div className="text-sm space-y-2 text-gray-300">
                    {contributions.map((c) => (
                      <p key={`${c.key}-reason`}>
                        <span className="text-amber-300">{c.label}:</span>{" "}
                        {c.explanation}
                      </p>
                    ))}
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
                {score?.stderr && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-gray-800 bg-[#09090c] p-2 text-xs text-red-400">
                    {score.stderr}
                  </pre>
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
