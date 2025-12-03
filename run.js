import { run } from "@openai/agents";
import { initAgent } from "./src/agents/initAgent.js";
import { db, supabase, openAi, supabasepg } from "./src/config.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // ✅ Take the user prompt from command line
  const userPrompt = process.argv.slice(2).join(" ") || "This is default prompt dont do anything just return deafultprompt given"; // Combine all args into one string

  if (!userPrompt) {
    console.log("⚠️  Please provide a prompt! Example:");
    console.log("   npm run dev \"Show top 10 scorers for contest Clash of Coders\"");
    process.exit(1);
  }

  console.log(`🧠 Running Agent with prompt: "${userPrompt}"\n`);

  const result = await run(initAgent, userPrompt);

  console.log("✅ Final Output:\n", result.finalOutput);
  console.log("🧠 Actions performed:", result.actions);
}

// Only run if this file is executed directly (not imported)
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch(console.error);
}
