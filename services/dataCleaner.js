export function cleanSleuthData(cgData, alchData = null, socialData = null) {
    const mData = cgData.market_data;
    const dData = cgData.developer_data;

    return {
        // Basic Metadata
        name: cgData.name,
        symbol: cgData.symbol?.toUpperCase(),
        age_days: calculateDays(cgData.genesis_date),

        // 1. MARKET INTEGRITY (25% Weight)
        // Focuses on price extremes and organic vs inorganic performance
        market_integrity: {
            current_price_usd: mData.current_price.usd,
            market_cap_usd: mData.market_cap.usd,
            fdv_usd: mData.fully_diluted_valuation?.usd || 0,
            volume_24h_usd: mData.total_volume.usd,
            vol_to_mc_ratio: mData.market_cap.usd > 0 ? (mData.total_volume.usd / mData.market_cap.usd) : 0,
            
            performance: {
                change_1h: mData.price_change_percentage_1h_in_currency?.usd,
                change_24h: mData.price_change_percentage_24h_in_currency?.usd,
                change_7d: mData.price_change_percentage_7d_in_currency?.usd,
                change_30d: mData.price_change_percentage_30d_in_currency?.usd,
                change_1y: mData.price_change_percentage_1y_in_currency?.usd,
            },
            extremes: {
                ath_usd: mData.ath.usd,
                ath_change_percent: mData.ath_change_percentage.usd,
                atl_usd: mData.atl.usd,
                atl_change_percent: mData.atl_change_percentage.usd,
            },
        },
        
        // 2. DEV VELOCITY (20% Weight)
        // Tracks maintenance health and activity
        dev_velocity: {
            stars: dData?.stars || 0,
            recent_commits_4w: dData?.commit_count_4_weeks || 0,
            total_issues: dData?.total_issues || 0,
            closed_issues: dData?.closed_issues || 0,
            issue_resolution_rate: dData?.total_issues > 0 ? (dData.closed_issues / dData.total_issues) : 0,
            last_commit_age_days: calculateDays(dData?.last_run_date),
        },

        // 3. ON-CHAIN SECURITY (35% Weight)
        // The "Hard Signals" from Alchemy regarding contract safety
        on_chain_security: alchData ? {
            deployer_address: alchData.deployerInfo?.deployerAddress,
            is_renounced: alchData.metadata?.is_renounced || "Unknown", 
            has_burned_liquidity: checkBurnHistory(alchData.transfers),
            top_holder_concentration: calculateConcentration(alchData.transfers),
            has_logo_verification: !!alchData.metadata?.logo,
            is_contract_verified: !!alchData.metadata?.symbol,
        } : {
            note: "Native blockchain asset - minimal on-chain contract signals",
            has_logo_verification: !!cgData.image?.large,
        },

        // 4. SOCIAL SENTIMENT (20% Weight)
        // Aggregates community engagement metrics
        social_sentiment: {
            ...(socialData?.twitter?.followers && socialData.twitter.followers > 0 ? {
                twitter_followers: socialData.twitter.followers,
            } : {}),
            reddit_subscribers: socialData?.reddit?.subscribers || 0,
            reddit_active_accounts_48h: socialData?.reddit?.active_accounts_48h || 0,
            sentiment_votes_up_pct: cgData.sentiment_votes_up_percentage || 0,
            sentiment_votes_down_pct: cgData.sentiment_votes_down_percentage || 0,
            reddit_url: cgData.links?.subreddit_url,
            twitter_handle: cgData.links?.twitter_screen_name
        }
    };
}

function calculateDays(date) {
    if (!date) return 0;
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
}

function checkBurnHistory(transfers) {
    const burnAddresses = ["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead"];
    return transfers ? transfers.some(tx => burnAddresses.includes(tx.to)) : false;
}

function calculateConcentration(transfers) {
    if (!transfers || transfers.length === 0) return 0;
    const totalVolume = transfers.reduce((sum, tx) => sum + (parseFloat(tx.value) || 0), 0);
    const topTransfer = Math.max(...transfers.map(tx => parseFloat(tx.value) || 0));
    return totalVolume > 0 ? (topTransfer / totalVolume) * 100 : 0;
}