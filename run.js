import { run } from "@openai/agents";
import { mathXAgent } from "./agent.js";
import { Client, Databases } from "node-appwrite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

export const db = new Databases(client);
export const supabasepg = process.env.SUPABASE_DB_URL;

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  // ✅ Take the user prompt from command line
  const userPrompt = process.argv.slice(2).join(" ") || "This is default prompt dont do anything just return deafultprompt given"; // Combine all args into one string

  if (!userPrompt) {
    console.log("⚠️  Please provide a prompt! Example:");
    console.log("   npm run dev \"Show top 10 scorers for contest Clash of Coders\"");
    process.exit(1);
  }

  console.log(`🧠 Running Agent with prompt: "${userPrompt}"\n`);

  const result = await run(mathXAgent, userPrompt);

  console.log("✅ Final Output:\n", result.finalOutput);
  console.log("🧠 Actions performed:", result.actions);
}

main().catch(console.error);
