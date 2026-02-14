import { BackboardClient } from "backboard-sdk";

if (!process.env.BACKBOARD_API_KEY) {
  throw new Error("Missing BACKBOARD_API_KEY in environment variables");
}

// Initialize the Backboard client
// This client will handle memory, RAG, and model routing
export const backboard = new BackboardClient(process.env.BACKBOARD_API_KEY);

/**
 * Helper to get or create a "Sleuth" assistant.
 * Storing the ID in a variable ensures we reuse the same 'Agent' context.
 */
export const SLEUTH_ASSISTANT_CONFIG = {
  name: "Crypto Rug-Pull Sleuth",
  instructions: `
    You are an expert crypto forensic analyst. 
    Analyze the provided JSON data for rug-pull patterns.
    Cross-reference with your long-term memory for recurring developer wallets or contract structures.
    Always return a valid JSON object.
  `,
  model: "llama-3-70b-instruct", // Backboard handles the routing to Groq/Together
  memory: "Auto",               // This is the "Magic" switch for persistent memory
};