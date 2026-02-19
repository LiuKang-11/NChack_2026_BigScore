import asyncio
import math
import os
import sys, json
from backboard import BackboardClient




# assistant_id 

MARKET_AGENT_ID  = os.getenv("MARKET_AGENT_ID", "").strip()
DEV_AGENT_ID     = os.getenv("DEV_AGENT_ID", "").strip()
ONCHAIN_AGENT_ID = os.getenv("ONCHAIN_AGENT_ID", "").strip()

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

    if proc.returncode != 0:
        raise RuntimeError(
            f"get_context.js failed for coin='{coin_name}' "
            f"(exit={proc.returncode}). stderr:\n{err}"
        )

    if not out:
        raise RuntimeError(
            f"get_context.js returned empty stdout for coin='{coin_name}'. "
            f"stderr:\n{err}"
        )

    try:
        return json.loads(out)
    except Exception:
        i = out.find("{")
        j = out.rfind("}")
        if i != -1 and j != -1 and j > i:
            try:
                return json.loads(out[i:j+1])
            except Exception:
                pass

        raise RuntimeError(
            f"get_context.js returned invalid JSON for coin='{coin_name}'. "
            f"stdout_head={out[:300]!r}\n"
            f"stderr:\n{err}"
        )

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

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def score_social(ctx: dict) -> dict:
    social = (ctx or {}).get("social_sentiment", {}) or {}

    reddit_subscribers = max(0.0, to_float(social.get("reddit_subscribers"), 0.0))
    reddit_active_48h = max(0.0, to_float(social.get("reddit_active_accounts_48h"), 0.0))
    up_pct = clamp(to_float(social.get("sentiment_votes_up_pct"), 50.0), 0.0, 100.0)
    down_pct = clamp(to_float(social.get("sentiment_votes_down_pct"), 50.0), 0.0, 100.0)
    twitter_followers = max(0.0, to_float(social.get("twitter_followers"), 0.0))

    # Log scaling keeps very large communities from dominating the score.
    reddit_size_score = clamp((math.log10(reddit_subscribers + 1) / 6.0) * 100.0, 0.0, 100.0)
    twitter_size_score = clamp((math.log10(twitter_followers + 1) / 7.0) * 100.0, 0.0, 100.0)

    active_ratio = reddit_active_48h / max(reddit_subscribers, 1.0)
    active_score = clamp(active_ratio * 5000.0, 0.0, 100.0)

    sentiment_delta = up_pct - down_pct
    sentiment_score = clamp(50.0 + (sentiment_delta * 0.5), 0.0, 100.0)

    has_reddit = reddit_subscribers > 0
    has_sentiment_votes = (up_pct + down_pct) > 0
    has_twitter = twitter_followers > 0

    if not (has_reddit or has_sentiment_votes or has_twitter):
        subscore = 50.0
        confidence = 0.25
        flags = ["Social data unavailable"]
        explanation = "Social signals are unavailable, so a neutral social sentiment score was applied."
    else:
        subscore = (
            0.35 * reddit_size_score +
            0.25 * active_score +
            0.30 * sentiment_score +
            0.10 * twitter_size_score
        )

        confidence = 0.35
        if has_reddit:
            confidence += 0.30
        if has_sentiment_votes:
            confidence += 0.25
        if has_twitter:
            confidence += 0.10
        confidence = clamp(confidence, 0.0, 0.95)

        flags = []
        if reddit_subscribers < 1000:
            flags.append("Low Reddit community size")
        if has_reddit and active_ratio < 0.002:
            flags.append("Low Reddit activity ratio")
        if sentiment_delta < -10:
            flags.append("Negative sentiment bias")
        if sentiment_delta > 25:
            flags.append("Strong positive sentiment")

        explanation = (
            f"Social sentiment uses Reddit size/activity and vote sentiment "
            f"(up {round(up_pct, 1)}%, down {round(down_pct, 1)}%)."
        )

    return {
        "subscore": round(clamp(subscore, 0.0, 100.0), 2),
        "confidence": round(confidence, 2),
        "flags": flags,
        "explanation": explanation,
        "details": {
            "reddit_subscribers": int(reddit_subscribers),
            "reddit_active_accounts_48h": int(reddit_active_48h),
            "reddit_activity_ratio": round(active_ratio, 6),
            "sentiment_votes_up_pct": round(up_pct, 2),
            "sentiment_votes_down_pct": round(down_pct, 2),
            "twitter_followers": int(twitter_followers),
            "reddit_size_score": round(reddit_size_score, 2),
            "activity_score": round(active_score, 2),
            "sentiment_score": round(sentiment_score, 2),
            "twitter_size_score": round(twitter_size_score, 2),
        },
    }


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
    #coin_name = "btc"  
    coin_name = sys.argv[1].strip() if len(sys.argv) > 1 else "bitcoin"
    contextForAI = await get_context_for_ai(coin_name)
    


    # 並行跑更快
    market, dev, onchain = await asyncio.gather(
        ask_agent(client, MARKET_AGENT_ID, prompt_market(contextForAI)),
        ask_agent(client, DEV_AGENT_ID, prompt_dev(contextForAI)),
        ask_agent(client, ONCHAIN_AGENT_ID, prompt_onchain(contextForAI)),
    )
    social = score_social(contextForAI)
    #print("types:", type(market), type(dev), type(onchain))
    #print("market raw keys:", list(market.keys())[:10])


    # weights
    w_market, w_dev, w_onchain, w_social = 0.25, 0.20, 0.35, 0.20
    coverage = w_market + w_dev + w_onchain + w_social
    master_raw = (
        w_market * market["subscore"] +
        w_dev * dev["subscore"] +
        w_onchain * onchain["subscore"] +
        w_social * social["subscore"]
    )

    master = master_raw / coverage

    #conf_raw = (
        #w_market * market.get("confidence", 0.5) +
        #w_dev * dev.get("confidence", 0.5) +
        #w_onchain * onchain.get("confidence", 0.5)
    #)

    conf_raw = (
        w_market  * normalize_confidence(market.get("confidence")) +
        w_dev     * normalize_confidence(dev.get("confidence")) +
        w_onchain * normalize_confidence(onchain.get("confidence")) +
        w_social  * normalize_confidence(social.get("confidence"))
    )

    confidence = conf_raw / coverage

    flags = sorted(set(
        (market.get("flags", []) or []) +
        (dev.get("flags", []) or []) +
        (onchain.get("flags", []) or []) +
        (social.get("flags", []) or [])
    ))

    result = {
        "coin": contextForAI["name"],
        "master_score": round(master, 2),
        "confidence": round(confidence, 2),
        "coverage": round(coverage, 2),
        "included_components": ["market_integrity", "dev_velocity", "on_chain_security", "social_sentiment"],
        "excluded_components": [],
        "subscores": {
            "market_integrity": market["subscore"],
            "dev_velocity": dev["subscore"],
            "on_chain_security": onchain["subscore"],
            "social_sentiment": social["subscore"],
        },
        "flags": flags,
        "rationale": {
            "market_integrity": market.get("explanation", ""),
            "dev_velocity": dev.get("explanation", ""),
            "on_chain_security": onchain.get("explanation", ""),
            "social_sentiment": social.get("explanation", ""),
        },
        "details": {
            "market": market.get("details", {}),
            "dev": dev.get("details", {}),
            "onchain": onchain.get("details", {}),
            "social": social.get("details", {}),
        }
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
