import asyncio
import os
import sys, json
from backboard import BackboardClient




# assistant_id 
MARKET_AGENT_ID  = "c6f2a81d-0e64-4d51-a20b-66d7a44d4550"
DEV_AGENT_ID     = "a35a0029-9334-4a17-a7ac-691002631e08"
ONCHAIN_AGENT_ID = "5ecc94e5-35b3-43e4-b90c-8ff913d9327f"

def extract_json(text: str) -> dict:
    t = text.strip()

    # strip code fences
    if t.startswith("```"):
        t = t.split("\n", 1)[1]
        if t.endswith("```"):
            t = t[:-3].strip()

    # extract {...} block if extra text exists
    if not t.startswith("{"):
        i = t.find("{")
        j = t.rfind("}")
        if i != -1 and j != -1 and j > i:
            t = t[i:j+1]

    return json.loads(t)


async def get_context_for_ai(coin_name: str) -> dict:
    proc = await asyncio.create_subprocess_exec(
        "node", "backboard/scripts/get_context.js", coin_name,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    out_b, err_b = await proc.communicate()  # ✅ 讀完整
    out = out_b.decode("utf-8", errors="replace").strip()
    err = err_b.decode("utf-8", errors="replace").strip()

    # debug：stderr 印出來 OK（因為你把 logs 都改到 stderr 了）
    #if err:
    #    print("[node stderr]\n", err)
    #    print("[node stderr] ...", file=sys.stderr)


    # debug：stdout 不要整坨印，改印長度 + 前 200 chars 就好
    #print("[node stdout length]", len(out))
    #print("[node stdout head]", out[:200])

    return json.loads(out)

def to_float(x, default=0.5):
    try:
        if x is None:
            return default
        if isinstance(x, str):
            x = x.strip()
        return float(x)
    except Exception:
        return default

def normalize_confidence(x):
    x = to_float(x, default=0.5)
    # 如果 agent 給的是百分制 (0-100)
    if x > 1.0:
        x = x / 100.0
    # clamp 到 [0,1]
    if x < 0.0:
        x = 0.0
    if x > 1.0:
        x = 1.0
    return x


'''

async def ask_agent(client: BackboardClient, assistant_id: str, prompt: str) -> dict:
    thread = await client.create_thread(assistant_id)
    resp = await client.add_message(
        thread_id=thread.thread_id,
        content=prompt,
        stream=False,
        memory=None
    )
    return extract_json(resp.content)
'''

async def ask_agent(client: BackboardClient, assistant_id: str, prompt: str) -> dict:
    thread = await client.create_thread(assistant_id)
    resp = await client.add_message(
        thread_id=thread.thread_id,
        content=prompt,
        stream=False,
        memory=None
    )

    raw = resp.content if isinstance(resp.content, str) else str(resp.content)

    try:
        parsed = extract_json(raw)
    except Exception as e:
        raise ValueError(
            f"[agent {assistant_id}] did not return valid JSON.\n"
            f"RAW:\n{raw}\n"
            f"ERROR: {e}"
        )

    if not isinstance(parsed, dict):
        raise TypeError(
            f"[agent {assistant_id}] expected dict JSON but got {type(parsed)}.\nRAW:\n{raw}"
        )

    return parsed

def prompt_market(ctx: dict) -> str:
    return (
        "You are a scoring module.\n"
        "Compute ONLY the Market Integrity subscore (0-100).\n"
        "Use ONLY fields under market_integrity (+ optional name/symbol/age_days).\n"
        "Return ONLY a JSON object with EXACT keys:\n"
        "subscore (number), confidence (number), flags (string array), explanation (string), details (object).\n"
        "No markdown. No extra text.\n\n"
        f"{json.dumps(ctx, ensure_ascii=False)}"
    )

def prompt_dev(ctx: dict) -> str:
    return (
        "You are a scoring module.\n"
        "Compute ONLY the Dev Velocity subscore (0-100).\n"
        "Use ONLY fields under dev_velocity (+ optional name/symbol/age_days).\n"
        "Return ONLY a JSON object with EXACT keys:\n"
        "subscore (number), confidence (number), flags (string array), explanation (string), details (object).\n"
        "No markdown. No extra text.\n\n"
        f"{json.dumps(ctx, ensure_ascii=False)}"
    )

def prompt_onchain(ctx: dict) -> str:
    return (
        "You are a scoring module.\n"
        "Compute ONLY the On-chain Security subscore (0-100).\n"
        "Use ONLY fields under on_chain_security (+ optional name/symbol/age_days).\n"
        "If on_chain_security.note exists, treat as limited contract signals.\n"
        "Return ONLY a JSON object with EXACT keys:\n"
        "subscore (number), confidence (number), flags (string array), explanation (string), details (object).\n"
        "No markdown. No extra text.\n\n"
        f"{json.dumps(ctx, ensure_ascii=False)}"
    )



async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)

    # TODO: JS log for contextForAI
    coin_name = "btc"  
    contextForAI = await get_context_for_ai(coin_name)
    


    # 並行跑更快
    market, dev, onchain = await asyncio.gather(
        ask_agent(client, MARKET_AGENT_ID, prompt_market(contextForAI)),
        ask_agent(client, DEV_AGENT_ID, prompt_dev(contextForAI)),
        ask_agent(client, ONCHAIN_AGENT_ID, prompt_onchain(contextForAI)),
    )
    #print("types:", type(market), type(dev), type(onchain))
    #print("market raw keys:", list(market.keys())[:10])


    # weights
    w_market, w_dev, w_onchain, w_social = 0.25, 0.20, 0.35, 0.20
    # 你目前若不算 social，就把 coverage 調成前三者，並 renormalize
    include_social = False
    if include_social:
        coverage = w_market + w_dev + w_onchain + w_social
        master_raw = (w_market*market["subscore"] + w_dev*dev["subscore"] + w_onchain*onchain["subscore"])
        # 先不加 social 子分數（你還沒做），所以其實 include_social=True 不成立
    else:
        coverage = w_market + w_dev + w_onchain
        master_raw = (w_market*market["subscore"] + w_dev*dev["subscore"] + w_onchain*onchain["subscore"])

    master = master_raw / coverage

    #conf_raw = (
        #w_market * market.get("confidence", 0.5) +
        #w_dev * dev.get("confidence", 0.5) +
        #w_onchain * onchain.get("confidence", 0.5)
    #)

    conf_raw = (
        w_market  * normalize_confidence(market.get("confidence")) +
        w_dev     * normalize_confidence(dev.get("confidence")) +
        w_onchain * normalize_confidence(onchain.get("confidence"))
    )

    confidence = conf_raw / coverage

    flags = sorted(set(
        (market.get("flags", []) or []) +
        (dev.get("flags", []) or []) +
        (onchain.get("flags", []) or [])
    ))

    result = {
        "coin": contextForAI["name"],
        "master_score": round(master, 2),
        "confidence": round(confidence, 2),
        "coverage": round(coverage, 2),
        "included_components": ["market_integrity", "dev_velocity", "on_chain_security"],
        "excluded_components": ["social_sentiment"],
        "subscores": {
            "market_integrity": market["subscore"],
            "dev_velocity": dev["subscore"],
            "on_chain_security": onchain["subscore"],
        },
        "flags": flags,
        "rationale": {
            "market_integrity": market.get("explanation", ""),
            "dev_velocity": dev.get("explanation", ""),
            "on_chain_security": onchain.get("explanation", ""),
        },
        "details": {
            "market": market.get("details", {}),
            "dev": dev.get("details", {}),
            "onchain": onchain.get("details", {}),
        }
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
