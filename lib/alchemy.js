import { Alchemy, Network } from "alchemy-sdk";

// Validate that the API key exists to prevent silent failures
if (!process.env.ALCHEMY_API_KEY) {
  throw new Error("Missing ALCHEMY_API_KEY in environment variables");
}

const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET, // You can change this to BASE_MAINNET or POLYGON_MAINNET
};

// Initialize the singleton instance
export const alchemy = new Alchemy(settings);