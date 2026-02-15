import { fetchCoinGeckoData, searchCoinByName } from '../services/marketData.js';
import { fetchAlchemyData } from '../services/chainData.js';
import { fetchRedditSleuthData, fetchTwitterSleuthData } from '../services/socialData.js';
import { cleanSleuthData } from '../services/dataCleaner.js';
import { BackboardClient } from 'backboard-sdk';

export async function runInvestigation(coinNameOrId) {
  // Resolve coin name to ID if necessary
  let coinId = coinNameOrId;
  try {
    await fetchCoinGeckoData(coinId);
  } catch (error) {
    coinId = await searchCoinByName(coinNameOrId);
  }

  // 1. Fetch primary CoinGecko data
  const cgRaw = await fetchCoinGeckoData(coinId);
  
  // 2. Resolve token address (try platforms.ethereum first, then contract_address)
  let tokenAddress = cgRaw.platforms?.ethereum || cgRaw.contract_address;
  
  // 3. If no Ethereum address found, try searching for wrapped version
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
  
  // 4. Fetch Alchemy and social data in parallel
  const [alchRaw, redditSleuth, twitterSleuth] = await Promise.all([
    tokenAddress ? fetchAlchemyData(tokenAddress) : Promise.resolve(null),
    fetchRedditSleuthData(cgRaw.links?.subreddit_url),
    fetchTwitterSleuthData(cgRaw.links?.twitter_screen_name)
  ]);
  
  // 5. Combine all data
  const socialData = { reddit: redditSleuth, twitter: twitterSleuth };
  const contextForAI = cleanSleuthData(cgRaw, alchRaw, socialData);

  // 6. Agentic Analysis via Backboard
  const bb = new BackboardClient(process.env.BACKBOARD_API_KEY);
  const assistant = await bb.create_assistant({
    name: "Rug-Pull Sleuth",
    system_prompt: `You are a crypto fraud detective. Analyze the provided JSON. 
    Compare it against your memory of previous scams.
    Return a JSON: { "is_rug": boolean, "risk_score": 0-100, "reason": string }`,
    memory: "Auto" 
  });

  const thread = await bb.create_thread(assistant.assistant_id);
  const investigation = await bb.add_message({
    thread_id: thread.thread_id,
    content: JSON.stringify(contextForAI)
  });

  return JSON.parse(investigation.content);
}

export async function logContextForAI(coinNameOrId) {
    let coinId = coinNameOrId;
    try {
        await fetchCoinGeckoData(coinId);
    } catch (error) {
        coinId = await searchCoinByName(coinNameOrId);
    }

    const cgRaw = await fetchCoinGeckoData(coinId);
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
    
    // Fetch Alchemy and social data in parallel
    const [alchRaw, redditSleuth, twitterSleuth] = await Promise.all([
        tokenAddress ? fetchAlchemyData(tokenAddress) : Promise.resolve(null),
        fetchRedditSleuthData(cgRaw.links?.subreddit_url),
        fetchTwitterSleuthData(cgRaw.links?.twitter_screen_name)
    ]);
    
    const socialData = { reddit: redditSleuth, twitter: twitterSleuth };
    const contextForAI = cleanSleuthData(cgRaw, alchRaw, socialData);
    
    console.log('contextForAI:', contextForAI);
    return contextForAI;
}