import { fetchCoinGeckoData, searchCoinByName } from '../services/marketData.js';
import { fetchAlchemyData } from '../services/chainData.js';
import { cleanSleuthData } from '../services/dataCleaner.js';
import { BackboardClient } from 'backboard-sdk';

export async function runInvestigation(coinNameOrId) {
  // Resolve coin name to ID if necessary
  let coinId = coinNameOrId;
  try {
    // Try fetching directly first (if it's already an ID)
    await fetchCoinGeckoData(coinId);
  } catch (error) {
    // If that fails, try searching by name
    coinId = await searchCoinByName(coinNameOrId);
  }

  // 1. Fetch CoinGecko data first to get the token address
  const cgRaw = await fetchCoinGeckoData(coinId);
  
  // Extract token address from CoinGecko data (usually in platforms.ethereum)
  let tokenAddress = cgRaw.platforms?.ethereum || cgRaw.contract_address;
  
  // If no Ethereum address found, try searching for wrapped version
  if (!tokenAddress && cgRaw.asset_platform_id !== 'ethereum') {
    console.log(`No Ethereum address for ${coinId}, searching for wrapped version...`);
    try {
      const wrappedCoinId = await searchCoinByName(`Wrapped ${cgRaw.name}`);
      const wrappedCgRaw = await fetchCoinGeckoData(wrappedCoinId);
      tokenAddress = wrappedCgRaw.platforms?.ethereum || wrappedCgRaw.contract_address;
      if (tokenAddress) {
        console.log(`Found wrapped version: ${wrappedCoinId} at ${tokenAddress}`);
      }
    } catch (e) {
      console.log(`No wrapped version found for ${cgRaw.name}`);
    }
  }
  
  // 2. Fetch Alchemy data if there's an Ethereum address
  let alchRaw = null;
  if (tokenAddress) {
    alchRaw = await fetchAlchemyData(tokenAddress);
  }

  // 3. Clean
  const contextForAI = cleanSleuthData(cgRaw, alchRaw);

  // 4. Agentic Analysis via Backboard
  const bb = new BackboardClient(process.env.BACKBOARD_API_KEY);
  const assistant = await bb.create_assistant({
    name: "Rug-Pull Sleuth",
    system_prompt: `You are a crypto fraud detective. Analyze the provided JSON. 
    Compare it against your memory of previous scams.
    Return a JSON: { "is_rug": boolean, "risk_score": 0-100, "reason": string }`,
    memory: "Auto" // Critical: This enables the AI to learn from past investigations
  });

  const thread = await bb.create_thread(assistant.assistant_id);
  const investigation = await bb.add_message({
    thread_id: thread.thread_id,
    content: JSON.stringify(contextForAI)
  });

  return JSON.parse(investigation.content);
}

export async function logContextForAI(coinNameOrId) {
  // Resolve coin name to ID if necessary
  let coinId = coinNameOrId;
  try {
    // Try fetching directly first (if it's already an ID)
    await fetchCoinGeckoData(coinId);
  } catch (error) {
    // If that fails, try searching by name
    coinId = await searchCoinByName(coinNameOrId);
  }

  // Fetch CoinGecko data first to get the token address
  const cgRaw = await fetchCoinGeckoData(coinId);
  
  // Extract token address from CoinGecko data (usually in platforms.ethereum)
  let tokenAddress = cgRaw.platforms?.ethereum || cgRaw.contract_address;
  
  // If no Ethereum address found, try searching for wrapped version
  if (!tokenAddress && cgRaw.asset_platform_id !== 'ethereum') {
    console.log(`No Ethereum address for ${coinId}, searching for wrapped version...`);
    try {
      const wrappedCoinId = await searchCoinByName(`Wrapped ${cgRaw.name}`);
      const wrappedCgRaw = await fetchCoinGeckoData(wrappedCoinId);
      tokenAddress = wrappedCgRaw.platforms?.ethereum || wrappedCgRaw.contract_address;
      if (tokenAddress) {
        console.log(`Found wrapped version: ${wrappedCoinId} at ${tokenAddress}`);
      }
    } catch (e) {
      console.log(`No wrapped version found for ${cgRaw.name}`);
    }
  }
  
  // Fetch Alchemy data if there's an Ethereum address
  let alchRaw = null;
  if (tokenAddress) {
    alchRaw = await fetchAlchemyData(tokenAddress);
  }

  const contextForAI = cleanSleuthData(cgRaw, alchRaw);
  console.log('contextForAI:', contextForAI);
  return contextForAI;
}