import asyncio
import os
import json
from backboard import BackboardClient

MARKET_AGENT_ID = "8b6f46af-b82e-4066-9afa-f97d3b2f6d7c"

contextForAI = {
  "name": "Bitcoin",
  "age_days": 6251,
  "security_signals": {
    "has_logo": True,
    "is_verified": True
  },
  "market_metrics": {
    "current_price_usd": 69992,
    "market_cap_usd": 1399306440313,
    "fdv_usd": 1399306440313,
    "volume_24h_usd": 38847554752,
    "performance": {
      "change_1h": 0.2229,
      "change_24h": 1.58861,
      "change_7d": 1.03458,
      "change_14d": -9.91008,
      "change_30d": -26.51868,
      "change_60d": -20.09864,
      "change_200d": -40.46684,
      "change_1y": -28.5518
    },
    "extremes": {
      "ath_usd": 126080,
      "ath_change_percent": -44.48625,
      "atl_usd": 67.81,
      "atl_change_percent": 103118.86076
    }
  },
  "dev_stats": {
    "stars": 73168,
    "recent_commits_4w": 108,
    "issues_resolution_rate": 0.9531189461449051
  },
  "trust_assessment": {
    "deployer_address": "0x8b41783ad99fcbeb8d575fa7a7b5a04fa0b8d80b",
    "deployed_at_block": 6766284,
    "is_renounced": "Unknown",
    "has_burned_liquidity": False,
    "top_holder_concentration": 42.867404745883626
  }
}

async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)

    thread = await client.create_thread(MARKET_AGENT_ID)

    prompt = (
        "Compute Market Integrity subscore from the following contextForAI.\n"
        "Output ONLY valid JSON.\n\n"
        f"{json.dumps(contextForAI, ensure_ascii=False)}"
    )

    resp = await client.add_message(
        thread_id=thread.thread_id,
        content=prompt,
        stream=False,
        memory=None,   # 測試階段先關閉 memory，避免污染
    )

    print(resp.content)

if __name__ == "__main__":
    asyncio.run(main())
