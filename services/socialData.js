/**
 * Fetches Reddit statistics using public endpoints.
 * No API key required for public subreddits.
 */
export async function fetchRedditSleuthData(subredditUrl) {
    if (!subredditUrl) return null;
    
    try {
        const subredditMatch = subredditUrl.match(/\/r\/([^/]+)/);
        const subreddit = subredditMatch ? subredditMatch[1] : "all";

        // IMPORTANT: Use a unique and descriptive User-Agent
        const headers = {
            'User-Agent': 'SleuthAgent/1.0 (by /u/reddit_scraper_bot)',
            'Accept': 'application/json'
        };

        const aboutRes = await fetch(`https://www.reddit.com/r/${subreddit}/about.json`, { headers });
        
        // Safety check: Ensure the response is actually JSON before parsing
        if (!aboutRes.ok) {
            console.error(`Reddit API error: ${aboutRes.status} ${aboutRes.statusText}`);
            return null;
        }

        const aboutData = await aboutRes.json();
        const newRes = await fetch(`https://www.reddit.com/r/${subreddit}/new.json?limit=100`, { headers });
        const newData = await newRes.json();
        
        // ... (rest of the unique author logic remains the same)
        const now = Date.now() / 1000;
        const fortyEightHoursAgo = now - (48 * 60 * 60);
        const activeAuthors = new Set(
            newData.data?.children
                .filter(post => post.data.created_utc > fortyEightHoursAgo)
                .map(post => post.data.author)
        );

        return {
            subscribers: aboutData.data?.subscribers || 0,
            live_users: aboutData.data?.active_user_count || 0,
            active_accounts_48h: activeAuthors.size
        };
    } catch (error) {
        console.error("Reddit Sleuth Error:", error);
        return null;
    }
}

/**
 * Fetches X (Twitter) data.
 * NOTE: Twitter has disabled all public scraping endpoints.
 * For production use, you'll need the official X API with authentication.
 * 
 * This placeholder returns a graceful message.
 */
export async function fetchTwitterSleuthData(screenName) {
    if (!screenName) return null;
    
    const handle = screenName.replace('@', '').trim();
    if (!handle) return null;
    
    // Twitter/X API would go here - returns null gracefully for now
    console.log(`[Twitter Sleuth] X API not configured. To fetch @${handle} data, set up official X API keys.`);
    return {
        handle,
        status: 'api_not_configured',
        note: 'Twitter API requires official authentication. Not fetched.',
        followers: null
    };
}