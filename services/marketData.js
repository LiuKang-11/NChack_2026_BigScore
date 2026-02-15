export async function searchCoinByName(coinName) {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(coinName)}`;
  
  const response = await fetch(url, {
    headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
  });
  
  if (!response.ok) throw new Error('CoinGecko search failed');
  const data = await response.json();
  
  if (!data.coins || data.coins.length === 0) {
    throw new Error(`No coin found with name: ${coinName}`);
  }
  
  // Return the first match's ID
  return data.coins[0].id;
}

export async function fetchCoinGeckoData(coinId) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&sparkline=false`;
  
  const response = await fetch(url, {
    headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
  });
  
  if (!response.ok) throw new Error('CoinGecko fetch failed');
  return await response.json();
}