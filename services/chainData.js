import { alchemy } from '../lib/alchemy.js';

export async function fetchAlchemyData(tokenAddress) {
    const [metadata, deployerInfo, transfers] = await Promise.all([
        alchemy.core.getTokenMetadata(tokenAddress),
        // 1. Find the "Criminal Record" (Deployer Address)
        alchemy.core.findContractDeployer(tokenAddress),
        // 2. Check for "Liquidity Drains" (Large recent outgoing transfers)
        alchemy.core.getAssetTransfers({
            fromBlock: "0x0",
            fromAddress: tokenAddress,
            category: ["external", "internal", "erc20"],
            maxCount: 10,
        })
    ]);

    return { metadata, deployerInfo, transfers: transfers.transfers };
}