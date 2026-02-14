export function cleanSleuthData(cgData, alchData = null) {
    const mData = cgData.market_data;

    return {
        // Basic Info
        name: cgData.name,
        age_days: calculateDays(cgData.genesis_date),

        // Security (Red Flag: No logo or unverified contract)
        security_signals: alchData ? {
            has_logo: !!alchData.metadata?.logo,
            is_verified: !!alchData.metadata?.symbol,
        } : {
            has_logo: !!cgData.image?.large,
            is_verified: false,
            note: "No Ethereum contract - native blockchain coin"
        },

        // Liquidity & Market (Red Flag: Low volume vs high cap)
        market_metrics: {
            current_price_usd: mData.current_price.usd,
            market_cap_usd: mData.market_cap.usd,
            fdv_usd: mData.fully_diluted_valuation?.usd || 0,
            volume_24h_usd: mData.total_volume.usd,
            
            // Price Performance (All Ranges)
            performance: {
                change_1h: mData.price_change_percentage_1h_in_currency?.usd,
                change_24h: mData.price_change_percentage_24h_in_currency?.usd,
                change_7d: mData.price_change_percentage_7d_in_currency?.usd,
                change_14d: mData.price_change_percentage_14d_in_currency?.usd,
                change_30d: mData.price_change_percentage_30d_in_currency?.usd,
                change_60d: mData.price_change_percentage_60d_in_currency?.usd,
                change_200d: mData.price_change_percentage_200d_in_currency?.usd,
                change_1y: mData.price_change_percentage_1y_in_currency?.usd,
            },

            // Highs & Lows (USD)
            extremes: {
                ath_usd: mData.ath.usd,
                ath_change_percent: mData.ath_change_percentage.usd,
                atl_usd: mData.atl.usd,
                atl_change_percent: mData.atl_change_percentage.usd,
            },
        },
        
        // Developer Health (Red Flag: 0 commits)
        dev_stats: {
            stars: cgData.developer_data?.stars,
            recent_commits_4w: cgData.developer_data?.commit_count_4_weeks,
            issues_resolution_rate: cgData.developer_data?.closed_issues / cgData.developer_data?.total_issues,
        },

        trust_assessment: alchData ? {
            // THE "SMOKING GUN": Is the dev a serial redeployer?
            deployer_address: alchData.deployerInfo?.deployerAddress,
            deployed_at_block: alchData.deployerInfo?.blockNumber,
            
            // If metadata returns no 'owner' or a 'null' address, it's often renounced
            is_renounced: alchData.metadata?.is_renounced || "Unknown", 
            
            // Look for large transfers to "dead" addresses (0x000... or 0xdead...)
            has_burned_liquidity: checkBurnHistory(alchData.transfers),
            
            // Check if top holders are exchange wallets or private "whale" wallets
            top_holder_concentration: calculateConcentration(alchData.transfers)
        } : {
            note: "No Ethereum contract data available"
        },
    };
}

function calculateDays(date) {
    if (!date) return 0;
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
}

function checkBurnHistory(transfers) {
  const burnAddresses = ["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead"];
  return transfers.some(tx => burnAddresses.includes(tx.to));
}

function calculateConcentration(transfers) {
  if (!transfers || transfers.length === 0) return 0;
  const totalVolume = transfers.reduce((sum, tx) => sum + (parseFloat(tx.value) || 0), 0);
  const topTransfer = Math.max(...transfers.map(tx => parseFloat(tx.value) || 0));
  return totalVolume > 0 ? (topTransfer / totalVolume) * 100 : 0;
}