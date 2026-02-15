import { fetchCoinGeckoData, searchCoinByName } from '../../services/marketData.js';
import { fetchAlchemyData } from '../../services/chainData.js';
import { cleanSleuthData } from '../../services/dataCleaner.js';

const coinNameOrId = process.argv[2];
if (!coinNameOrId) {
  console.error("Usage: node scripts/get_context.js <coinNameOrId>");
  process.exit(1);
}

try {
  let coinId = coinNameOrId;
  try {
    await fetchCoinGeckoData(coinId);
  } catch {
    coinId = await searchCoinByName(coinNameOrId);
  }

  const cgRaw = await fetchCoinGeckoData(coinId);

  let tokenAddress = cgRaw.platforms?.ethereum || cgRaw.contract_address;

  if (!tokenAddress && cgRaw.asset_platform_id !== 'ethereum') {
    console.error(`No Ethereum address for ${coinId}, searching for wrapped version...`);
    try {
      const wrappedCoinId = await searchCoinByName(`Wrapped ${cgRaw.name}`);
      const wrappedCgRaw = await fetchCoinGeckoData(wrappedCoinId);
      tokenAddress = wrappedCgRaw.platforms?.ethereum || wrappedCgRaw.contract_address;
      if (tokenAddress) {
        console.error(`Found wrapped version: ${wrappedCoinId} at ${tokenAddress}`);
      }
    } catch (e) {
      console.error(`No wrapped version found for ${cgRaw.name}`);
    }
  }

  let alchRaw = null;
  if (tokenAddress) {
    alchRaw = await fetchAlchemyData(tokenAddress);
  }

  const ctx = cleanSleuthData(cgRaw, alchRaw);

  // ✅ stdout: ONLY JSON
  process.stdout.write(JSON.stringify(ctx));
} catch (e) {
  console.error("get_context.js error:", e?.stack || e?.message || String(e));
  process.exit(2);
}
