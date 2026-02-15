import asyncio
import os
import json
from backboard import BackboardClient

MARKET_AGENT_ID = "8b6f46af-b82e-4066-9afa-f97d3b2f6d7c"
DEV_AGENT_ID    = "24d879b6-e4d8-47fe-8499-34c748064b68"

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

def extract_json(text: str) -> dict:
    """
    Backboard sometime output ```json ... ```，。
    """
    t = text.strip()
    if t.startswith("```"):
        # remove```json and end```
        t = t.split("\n", 1)[1]
        if t.endswith("```"):
            t = t[:-3]
    return json.loads(t)

async def ask_agent(client: BackboardClient, assistant_id: str, prompt: str) -> dict:
    thread = await client.create_thread(assistant_id)
    resp = await client.add_message(thread_id=thread.thread_id, content=prompt, stream=False, memory=None)
    return extract_json(resp.content)

async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)

    market_prompt = (
        "Compute Market Integrity subscore from the following contextForAI.\n"
        "Output ONLY valid JSON.\n\n"
        f"{json.dumps(contextForAI, ensure_ascii=False)}"
    )
    dev_prompt = (
        "Compute Dev Velocity subscore from the following contextForAI.\n"
        "Output ONLY valid JSON.\n\n"
        f"{json.dumps(contextForAI, ensure_ascii=False)}"
    )

    market = await ask_agent(client, MARKET_AGENT_ID, market_prompt)
    dev = await ask_agent(client, DEV_AGENT_ID, dev_prompt)

    # weights (full model)
    w_market, w_dev, w_onchain, w_social = 0.25, 0.20, 0.35, 0.20
    # partial (only market+dev)
    partial_weight_sum = w_market + w_dev

    master_partial_raw = w_market * market["subscore"] + w_dev * dev["subscore"]
    master_partial_renorm = master_partial_raw / partial_weight_sum  # scale to 0-100 using only available parts

    confidence_partial = (
        w_market * market.get("confidence", 0.5) + w_dev * dev.get("confidence", 0.5)
    ) / partial_weight_sum

    result = {
        "coin": contextForAI["name"],
        "subscores": {
            "market_integrity": market,
            "dev_velocity": dev,
            "onchain_security": "PENDING",
            "social_sentiment": "PENDING"
        },
        "weights": {
            "market_integrity": w_market,
            "dev_velocity": w_dev,
            "onchain_security": w_onchain,
            "social_sentiment": w_social
        },
        "master_score_partial_raw": round(master_partial_raw, 2),           # 0-45區間（因為只算45%權重）
        "master_score_partial_renormalized": round(master_partial_renorm, 2),# 0-100（只看market+dev）
        "confidence_partial": round(confidence_partial, 2)
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
