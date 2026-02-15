import { logContextForAI } from './actions/sleuthAction.js';

const ctx = await logContextForAI("bitcoin");
console.log(JSON.stringify(ctx, null, 2));
