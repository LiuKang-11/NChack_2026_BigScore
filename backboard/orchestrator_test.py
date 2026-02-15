import asyncio
import os
import json
from backboard import BackboardClient

ORCHESTRATOR_ID = "c2287c65-64c3-484a-b94c-fd4bb1017c16"

market_output = {
  "subscore": 80,
  "confidence": 0.85,
  "flags": [],
  "explanation": "Market looks stable.",
  "details": {}
}

# 暫時假資料
dev_output = {"subscore": 75, "confidence": 0.7, "flags": []}
onchain_output = {"subscore": 82, "confidence": 0.8, "flags": []}
social_output = {"subscore": 70, "confidence": 0.6, "flags": []}

async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)

    thread = await client.create_thread(ORCHESTRATOR_ID)

    payload = {
        "market": market_output,
        "dev": dev_output,
        "onchain": onchain_output,
        "social": social_output
    }

    prompt = (
        "Combine the following sub-scores into a master score.\n"
        "Weights: Market 25%, Dev 20%, On-chain 35%, Social 20%.\n"
        "Output ONLY valid JSON with keys: master_score, confidence, flags, summary.\n\n"
        f"{json.dumps(payload)}"
    )

    resp = await client.add_message(
        thread_id=thread.thread_id,
        content=prompt,
        stream=False,
        memory=None
    )

    print(resp.content)

if __name__ == "__main__":
    asyncio.run(main())
