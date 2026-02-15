# HackNCState 2026 - Crypto Reliability Tracker

A blockchain forensics tool that analyzes cryptocurrencies for potential rug-pull and fraud indicators using on-chain data, developer metrics, and community signals.

## What It Does

**Rug-Pull Sleuth** performs deep analysis on any cryptocurrency to assess fraud risk by examining:

- **Market Integrity** (25% weight)
  - Price history and volatility patterns
  - Trading volume vs. market cap ratios
  - All-time highs/lows and performance trends

- **Developer Velocity** (20% weight)
  - GitHub activity and commit history
  - Issue resolution rates
  - Maintenance health

- **On-Chain Security** (35% weight)
  - Contract deployer information
  - Liquidity burn history
  - Top holder concentration
  - Contract verification status

- **Social Sentiment** (20% weight)
  - Reddit community activity
  - Sentiment analysis metrics

The tool uses CoinGecko for market data, Alchemy for blockchain analysis, and Backboard AI for agentic pattern matching against known scams.

## Setup

### Prerequisites

- Node.js v20+ 
- npm or yarn
- API Keys:
  - [Alchemy](https://alchemy.com) - Blockchain data
  - [CoinGecko](https://www.coingecko.com/api) - Market data
  - [Backboard](https://backboard.pro) - AI analysis

### Installation

```bash
# Install dependencies
npm install

# Create .env.local with your API keys
echo "ALCHEMY_API_KEY=your_alchemy_key" > .env.local
echo "COINGECKO_API_KEY=your_coingecko_key" >> .env.local
echo "BACKBOARD_API_KEY=your_backboard_key" >> .env.local
```

## Usage

### Quick Test - View Analysis Data

```bash
# Load env vars and test with Bitcoin
node --env-file=.env.local --input-type=module -e "import('./actions/sleuthAction.js').then(m=>m.logContextForAI('Bitcoin')).catch(console.error)"
```

Output shows:
- Coin metadata
- Market metrics (price, volume, cap)
- Developer activity
- On-chain security signals
- Community engagement data

### Full AI Investigation

```bash
node --env-file=.env.local --input-type=module -e "import('./actions/sleuthAction.js').then(m=>m.runInvestigation('Bitcoin')).catch(console.error)"
```

Returns AI-generated analysis:
```json
{
  "is_rug": false,
  "risk_score": 5,
  "reason": "Established network with strong developer activity and community support..."
}
```

### Custom Coins

Search by name (auto-resolves to CoinGecko ID):
```bash
node --env-file=.env.local --input-type=module -e "import('./actions/sleuthAction.js').then(m=>m.logContextForAI('Ethereum')).catch(console.error)"
```

Or use CoinGecko ID directly:
```bash
node --env-file=.env.local --input-type=module -e "import('./actions/sleuthAction.js').then(m=>m.logContextForAI('ethereum')).catch(console.error)"
```

For native blockchain coins without Ethereum contracts (Bitcoin, Solana), the tool automatically finds wrapped versions (WBTC, SOL).

## Development Server

```bash
npm run dev
```

Runs Next.js dev server at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
actions/
  sleuthAction.js       - Main investigation orchestration
services/
  marketData.js         - CoinGecko integration
  chainData.js          - Alchemy blockchain queries
  dataCleaner.js        - Data normalization & scoring
  socialData.js         - Community metrics (Reddit)
lib/
  alchemy.js            - Alchemy client
  backboard.js          - Backboard AI client (optional)
app/
  layout.tsx            - Next.js layout
  page.tsx              - Frontend UI
```

## API Reference

### logContextForAI(coinNameOrId)

Returns cleaned analysis data without AI interpretation.

**Parameters:**
- `coinNameOrId` (string) - Coin name or CoinGecko ID

**Returns:**
```javascript
{
  name: string,
  symbol: string,
  age_days: number,
  market_integrity: { ... },
  dev_velocity: { ... },
  on_chain_security: { ... },
  social_sentiment: { ... }
}
```

### runInvestigation(coinNameOrId)

Performs full analysis with AI assessment.

**Parameters:**
- `coinNameOrId` (string) - Coin name or CoinGecko ID

**Returns:**
```javascript
{
  is_rug: boolean,
  risk_score: number (0-100),
  reason: string
}
```

## Error Handling

- **Missing API Key**: Ensure `.env.local` is in project root and `node --env-file` flag is used
- **Coin Not Found**: Check CoinGecko for correct spelling or use their public ID
- **No Ethereum Address**: For native blockchains, tool auto-searches for wrapped versions
- **Backboard Disabled**: If `BACKBOARD_API_KEY` is missing, `runInvestigation()` will fail; use `logContextForAI()` instead

## Notes

- **Twitter Data**: Disabled (X API requires official authentication). Reddit data still included.
- **Rate Limits**: Respect Alchemy, CoinGecko, and Backboard rate limits
- **Wrapped Coins**: Bitcoin → WBTC, Solana → SOL (auto-detected)
- **Memory**: Backboard maintains persistent memory of analyzed scams for pattern matching

## License

MIT
