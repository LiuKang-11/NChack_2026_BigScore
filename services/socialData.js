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
 * Fetches X (Twitter) data via official X API v2 (app-only bearer token).
 * Required env var: X_BEARER_TOKEN
 */
export async function fetchTwitterSleuthData(screenName) {
    if (!screenName) return null;

    const handle = screenName.replace('@', '').trim();
    if (!handle) return null;

    const token = process.env.X_BEARER_TOKEN?.trim();
    if (!token) {
        console.error(`[Twitter Sleuth] X_BEARER_TOKEN missing. Skipping @${handle}.`);
        return {
            handle,
            status: 'api_not_configured',
            note: 'Set X_BEARER_TOKEN to enable X API lookups.',
            followers: 0
        };
    }

    try {
        const url =
            `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}` +
            `?user.fields=public_metrics,verified,created_at,description`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`[Twitter Sleuth] X API error for @${handle}: ${res.status} ${text}`);
            return {
                handle,
                status: 'api_error',
                note: `X API request failed (${res.status}).`,
                followers: 0
            };
        }

        const body = await res.json();
        const user = body?.data;
        const metrics = user?.public_metrics || {};

        return {
            handle,
            status: 'ok',
            followers: metrics.followers_count || 0,
            following: metrics.following_count || 0,
            tweet_count: metrics.tweet_count || 0,
            listed_count: metrics.listed_count || 0,
            verified: !!user?.verified,
            created_at: user?.created_at || null
        };
    } catch (error) {
        console.error(`[Twitter Sleuth] Unexpected error for @${handle}:`, error);
        return {
            handle,
            status: 'error',
            note: 'Unexpected X fetch error.',
            followers: 0
        };
    }
}
