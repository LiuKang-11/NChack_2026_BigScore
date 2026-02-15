import asyncio
import os
from backboard import BackboardClient

async def main():
    api_key = os.getenv("BACKBOARD_API_KEY", "").strip()
    client = BackboardClient(api_key=api_key)
    
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
            "You are a scoring module. Compute ONLY the Market Integrity subscore (0-100).\n"
            "Use ONLY these fields from the input JSON:\n"
            "- name, symbol, age_days (optional)\n"
            "- market_integrity.current_price_usd\n"
            "- market_integrity.market_cap_usd\n"
            "- market_integrity.fdv_usd\n"
            "- market_integrity.volume_24h_usd\n"
            "- market_integrity.vol_to_mc_ratio\n"
            "- market_integrity.performance (change_1h, change_24h, change_7d, change_30d, change_1y)\n"
            "- market_integrity.extremes (ath_usd, ath_change_percent, atl_usd, atl_change_percent)\n\n"
            "Return ONLY valid JSON with EXACT keys:\n"
            '{{ "subscore": number, "confidence": number, "flags": string[], "explanation": string, "details": object }}\n'
            "confidence MUST be a number between 0 and 1.\n"
            "Do NOT include markdown, code fences, or extra text.\n\n"           
        )
    )
    

    dev_agent = await client.create_assistant(
        name="Dev Velocity Agent",
        description=(
            "You are a scoring module. Compute ONLY the Dev Velocity subscore (0-100).\n"
            "Use ONLY these fields from the input JSON:\n"
            "- name, symbol, age_days (optional)\n"
            "- dev_velocity.stars\n"
            "- dev_velocity.recent_commits_4w\n"
            "- dev_velocity.total_issues\n"
            "- dev_velocity.closed_issues\n"
            "- dev_velocity.issue_resolution_rate\n"
            "- dev_velocity.last_commit_age_days\n\n"
            "Return ONLY valid JSON with EXACT keys:\n"
            '{{ "subscore": number, "confidence": number, "flags": string[], "explanation": string, "details": object }}\n'
            "confidence MUST be a number between 0 and 1.\n"
            "Do NOT include markdown, code fences, or extra text.\n\n"
        )
    )
    
    onchain_agent = await client.create_assistant(
        name="On-chain Security Agent",
        description=(
            "You are a scoring module. Compute ONLY the On-chain Security subscore (0-100).\n"
            "Use ONLY these fields from the input JSON:\n"
            "- name, symbol, age_days (optional)\n"
            "- on_chain_security.deployer_address\n"
            "- on_chain_security.is_renounced\n"
            "- on_chain_security.has_burned_liquidity\n"
            "- on_chain_security.top_holder_concentration\n"
            "- on_chain_security.has_logo_verification\n"
            "- on_chain_security.is_contract_verified\n"
            "- OR, if on_chain_security.note exists, treat this as limited contract signals.\n\n"
            "Return ONLY valid JSON with EXACT keys:\n"
            '{{ "subscore": number, "confidence": number, "flags": string[], "explanation": string, "details": object }}\n'
            "confidence MUST be a number between 0 and 1.\n"
            "Do NOT include markdown, code fences, or extra text.\n\n"
        )
    )


    print("Orchestrator assistant_id:", orchestrator.assistant_id)
    print("Market agent assistant_id:", market_agent.assistant_id)
    print("Dev Velocity agent assistant_id:", dev_agent.assistant_id)
    print("On-chain agent assistant_id:", onchain_agent.assistant_id)



if __name__ == "__main__":
    asyncio.run(main())
