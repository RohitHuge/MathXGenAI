import { Client, Databases } from "node-appwrite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// Appwrite
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

export const db = new Databases(client);

// Supabase
export const supabasepg = process.env.SUPABASE_DB_URL;
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// OpenAI
export const openAi = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
