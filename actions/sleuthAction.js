import { fetchCoinGeckoData, searchCoinByName } from '../services/marketData.js';
import { fetchAlchemyData } from '../services/chainData.js';
import { fetchRedditSleuthData, fetchTwitterSleuthData } from '../services/socialData.js';
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

  /*
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
  */

// If no Ethereum address found, try searching for wrapped version
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



  // 2. Fetch Alchemy data if there's an Ethereum address
  let alchRaw = null;
  if (tokenAddress) {
    alchRaw = await fetchAlchemyData(tokenAddress);
  }

  // 3. Fetch social data (Reddit and Twitter) in parallel
  const [redditData, twitterData] = await Promise.all([
    fetchRedditSleuthData(cgRaw.links?.subreddit_url),
    fetchTwitterSleuthData(cgRaw.links?.twitter_screen_name)
  ]);

  const socialData = {
    reddit: redditData,
    twitter: twitterData
  };

  // 4. Clean and normalize all data
  const contextForAI = cleanSleuthData(cgRaw, alchRaw, socialData);

  // 5. Agentic Analysis via Backboard
  const bb = new BackboardClient({ apiKey: process.env.BACKBOARD_API_KEY });

  const assistant = await bb.createAssistant({
    name: "Rug-Pull Sleuth",
    system_prompt: `You are a crypto fraud detective. Analyze the provided JSON. 
    Compare it against your memory of previous scams.
    Return a JSON: { "is_rug": boolean, "risk_score": 0-100, "reason": string }`,
    memory: "Auto" // Critical: This enables the AI to learn from past investigations
  });

  const thread = await bb.createThread(assistant.assistant_id);
  const investigation = await bb.addMessage({
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
  /*
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
  */

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
  

  
  // Fetch Alchemy data if there's an Ethereum address
  let alchRaw = null;
  if (tokenAddress) {
    alchRaw = await fetchAlchemyData(tokenAddress);
  }

  // Fetch social data (Reddit and Twitter) in parallel
  const [redditData, twitterData] = await Promise.all([
    fetchRedditSleuthData(cgRaw.links?.subreddit_url),
    fetchTwitterSleuthData(cgRaw.links?.twitter_screen_name)
  ]);

  const socialData = {
    reddit: redditData,
    twitter: twitterData
  };

  const contextForAI = cleanSleuthData(cgRaw, alchRaw, socialData);
  //console.log('contextForAI:', contextForAI);
  console.error('contextForAI ready'); // optional debug to stderr
  console.log(JSON.stringify(contextForAI)); // stdout: pure JSON
  return contextForAI;

}