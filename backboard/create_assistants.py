import asyncio
import os
from backboard import BackboardClient

async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)
    '''
    orchestrator = await client.create_assistant(
        name="BigScore Orchestrator",
        description=(
            "You are the Orchestrator. You combine sub-scores into a 0-100 master score "
            "using weights: Market 25%, Dev 20%, On-chain 35%, Social 20%. "
            "You DO NOT compute sub-scores yourself yet. You will receive sub-score JSONs "
            "from other agents and output a final JSON."
        )
    )

    market_agent = await client.create_assistant(
        name="Market Integrity Agent",
        description=(
            "You are the Market Integrity Agent. You MUST output ONLY valid JSON.\n"
            "Given contextForAI.market_metrics, compute a 0-100 subscore for Market Integrity.\n"
            "Use these signals: volume_to_mcap_ratio, distance_from_ath, distance_from_atl, "
            "and short-term abnormality proxies from performance (e.g., |1h|+|24h| spikes).\n"
            "Return JSON with keys: subscore (0-100), confidence (0-1), flags (array), "
            "explanation (string), details (object)."
        )
    )
    

    dev_agent = await client.create_assistant(
        name="Dev Velocity Agent",
        description=(
            "You are the Dev Velocity Agent for a crypto trust score.\n"
            "You MUST output ONLY valid JSON.\n"
            "Input will include contextForAI.dev_stats and optionally project age.\n"
            "Compute a 0-100 subscore using: recent_commits_4w, issues_resolution_rate, stars.\n"
            "Heuristics (hackathon simple):\n"
            "- More commits in last 4w -> higher, but use diminishing returns.\n"
            "- Higher issue resolution rate -> higher.\n"
            "- More stars -> higher (log-scaled).\n"
            "Return JSON keys: subscore (0-100), confidence (0-1), flags (array), explanation (string), details (object).\n"
            "Add flags if: recent_commits_4w is very low, issues_resolution_rate is low."
        )
    )
    '''
    onchain_agent = await client.create_assistant(
        name="On-chain Security Agent",
        description=(
            "You are the On-chain Security Agent for a crypto trust score.\n"
            "You MUST output ONLY valid JSON.\n"
            "Input will include contextForAI.trust_assessment and may include age_days, security_signals.\n"
            "Compute a 0-100 subscore emphasizing trust / rug-risk / centralization risk.\n"
            "Use these signals:\n"
            "- top_holder_concentration (higher => lower score; flag if > 30%)\n"
            "- has_burned_liquidity (false => lower score; flag)\n"
            "- is_renounced (Unknown/No => lower score; flag)\n"
            "- deployed_at_block (if missing => lower confidence)\n"
            "- deployer_address present => ok; do not assume it's safe unless evidence\n"
            "Return JSON keys: subscore (0-100), confidence (0-1), flags (array), explanation (string), details (object).\n"
            "Flags should be short snake_case, e.g. holder_concentration_high, liquidity_not_burned, ownership_not_renounced_unknown.\n"
        )
    )

    print("On-chain agent assistant_id:", onchain_agent.assistant_id)

    #print("Orchestrator assistant_id:", orchestrator.assistant_id)
    #print("Market agent assistant_id:", market_agent.assistant_id)
    #print("Dev Velocity agent assistant_id:", dev_agent.assistant_id)


if __name__ == "__main__":
    asyncio.run(main())

#Orchestrator assistant_id: c2287c65-64c3-484a-b94c-fd4bb1017c16
#Market agent assistant_id: 8b6f46af-b82e-4066-9afa-f97d3b2f6d7c
#Dev Velocity agent assistant_id: 24d879b6-e4d8-47fe-8499-34c748064b68