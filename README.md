# HackNCState 2026 - Crypto Reliability Tracker

Crypto Reliability Tracker analyzes a coin and returns a weighted reliability score with explainability.

It combines:
- Next.js frontend (`/` and `/score`)
- Next.js API route (`/api/score`)
- Python orchestrator (`backboard/orchestrator.py`)
- Data from CoinGecko, Alchemy, Reddit, X, and Backboard agents

## Scoring Model

Current master score weights:
- `Market Integrity`: 25%
- `Dev Velocity`: 20%
- `On-chain Security`: 35%
- `Social Sentiment`: 20%

The app also returns:
- confidence
- component subscores
- rationale for each component
- detailed input signals
- combined risk flags

## Features

- Search by coin name or CoinGecko ID
- CoinGecko market + dev signals
- On-chain checks (with wrapped-coin fallback when needed)
- Social signals:
- Reddit community size/activity
- X account metrics (when `X_BEARER_TOKEN` is configured)
- Explainability panel with weighted contribution per component

## Tech Stack

- Next.js 16
- React 19
- Python 3.11+
- Backboard SDK
- Alchemy SDK

## Setup

### 1) Install dependencies

```bash
npm install
python -m pip install -r requirements.txt
python -m pip install -r backboard/requirements.txt
```

### 2) Configure environment variables

Create `.env.local` in project root:

```env
ALCHEMY_API_KEY=
COINGECKO_API_KEY=
BACKBOARD_API_KEY=
MARKET_AGENT_ID=
DEV_AGENT_ID=
ONCHAIN_AGENT_ID=
X_BEARER_TOKEN=
```

Notes:
- `X_BEARER_TOKEN` is optional. If missing, X metrics are skipped gracefully.
- `MARKET_AGENT_ID`, `DEV_AGENT_ID`, `ONCHAIN_AGENT_ID` are required for orchestrator scoring.

### 3) Create Backboard assistants (one-time)

After setting `BACKBOARD_API_KEY`:

```bash
python backboard/create_assistants.py
```

Copy printed IDs into:
- `MARKET_AGENT_ID`
- `DEV_AGENT_ID`
- `ONCHAIN_AGENT_ID`

## Run Locally

```bash
npm run dev
```

Open:
- `http://localhost:3000`

## API

### `GET /api/score?coin=<coin>`

Example:

```bash
curl "http://localhost:3000/api/score?coin=bitcoin"
```

Response includes:
- `master_score`
- `confidence`
- `coverage`
- `subscores`
- `rationale`
- `details`
- `flags`

## Key Files

- `app/page.tsx` - search page
- `app/score/page.tsx` - result + explainability panel
- `app/api/score/route.js` - API route that runs Python orchestrator
- `backboard/orchestrator.py` - score orchestration and weighting
- `backboard/scripts/get_context.js` - data collection + normalized context
- `services/socialData.js` - Reddit and X integrations

## Troubleshooting

- `Score API returned 500`
- open `/score?coin=<coin>` and inspect displayed backend `stderr`
- common causes: missing env vars, invalid API keys, upstream API errors

- `BackboardAPIError: Invalid API Key`
- verify `BACKBOARD_API_KEY` value in shell and `.env.local`

- `Missing ALCHEMY_API_KEY`
- set `ALCHEMY_API_KEY` and restart `npm run dev`

- X data not appearing
- set `X_BEARER_TOKEN`
- verify the coin has a valid `twitter_screen_name` from CoinGecko

## License

MIT
