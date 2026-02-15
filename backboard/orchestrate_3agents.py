import asyncio
import os
import json
from backboard import BackboardClient



contextForAI = {
  "name": "Bitcoin",
  "age_days": 6251,
  "security_signals": {"has_logo": True, "is_verified": True},
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

'''
def extract_json(text: str) -> dict:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1]
        if t.endswith("```"):
            t = t[:-3]
    return json.loads(t)

'''

def extract_json(text: str) -> dict:
    t = text.strip()
    # Strip code fences if present
    if t.startswith("```"):
        t = t.split("\n", 1)[1]
        if t.endswith("```"):
            t = t[:-3].strip()

    # Fallback: extract first JSON object if extra text exists
    if not t.startswith("{"):
        i = t.find("{")
        j = t.rfind("}")
        if i != -1 and j != -1 and j > i:
            t = t[i:j+1]

    return json.loads(t)


async def ask_agent(client: BackboardClient, assistant_id: str, prompt: str) -> dict:
    thread = await client.create_thread(assistant_id)
    resp = await client.add_message(
        thread_id=thread.thread_id,
        content=prompt,
        stream=False,
        memory=None
    )
    return extract_json(resp.content)

async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)

    market_prompt = (
        "Compute Market Integrity subscore from contextForAI.\n"
        "Output ONLY valid JSON.\n\n"
        f"{json.dumps(contextForAI, ensure_ascii=False)}"
    )
    dev_prompt = (
        "Compute Dev Velocity subscore from contextForAI.\n"
        "Output ONLY valid JSON.\n\n"
        f"{json.dumps(contextForAI, ensure_ascii=False)}"
    )
    onchain_prompt = (
        "Compute On-chain Security subscore from contextForAI.\n"
        "Output ONLY valid JSON.\n\n"
        f"{json.dumps(contextForAI, ensure_ascii=False)}"
    )

    market = await ask_agent(client, MARKET_AGENT_ID, market_prompt)
    dev = await ask_agent(client, DEV_AGENT_ID, dev_prompt)
    onchain = await ask_agent(client, ONCHAIN_AGENT_ID, onchain_prompt)

    # weights (exclude social for now)
    w_market, w_dev, w_onchain = 0.25, 0.20, 0.35
    coverage = w_market + w_dev + w_onchain  # 0.80

    master_raw = w_market * market["subscore"] + w_dev * dev["subscore"] + w_onchain * onchain["subscore"]
    master = master_raw / coverage  # renormalize to 0-100

    conf_raw = (
        w_market * market.get("confidence", 0.5) +
        w_dev * dev.get("confidence", 0.5) +
        w_onchain * onchain.get("confidence", 0.5)
    )
    confidence = conf_raw / coverage

    # merge flags (dedupe)
    flags = sorted(set((market.get("flags", []) or []) + (dev.get("flags", []) or []) + (onchain.get("flags", []) or [])))

    result = {
        "coin": contextForAI["name"],
        "master_score": round(master, 2),
        "confidence": round(confidence, 2),
        "coverage": round(coverage, 2),  # 0.80
        "included_components": ["market_integrity", "dev_velocity", "onchain_security"],
        "excluded_components": ["social_sentiment"],
        "subscores": {
            "market_integrity": market["subscore"],
            "dev_velocity": dev["subscore"],
            "onchain_security": onchain["subscore"]
        },
        "flags": flags,
        "rationale": {
            "market_integrity": market.get("explanation", ""),
            "dev_velocity": dev.get("explanation", ""),
            "onchain_security": onchain.get("explanation", "")
        },
        "details": {
            "market": market.get("details", {}),
            "dev": dev.get("details", {}),
            "onchain": onchain.get("details", {})
        }
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
