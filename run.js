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


// console.log(client);

export const db = new Databases(client);
export const supabasepg = process.env.SUPABASE_DB_URL;

// console.log(process.env.SUPABASE_URL);rs
// console.log(process.env.SUPABASE_SERVICE_KEY);


export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  

  const result = await run(
    mathXAgent,
    "Add the data in the leaderboard view table from the database and make it upto to date"
  );

  console.log("✅ Final Output:\n", result.finalOutput);
  console.log("🧠 Actions performed:", result.actions);
}

main().catch(console.error);
