import { supabaseTools } from "./src/supabaseTool.js";
import {
  getContestTool,
  getContestListTool,
  getQuestionbyContestId,
} from "./src/appwriteTool.js";
import { Agent } from "@openai/agents";

export const mathXAgent = new Agent({
  name: "MathX Insight Agent",
  instructions: `
    You are the AI Insight Agent for the MathX platform.
    You have access to:
      - Appwrite for contest/question data
      - Supabase for user/score data
    When asked about results or analytics:
      1. Use "discover_supabase_schema" to inspect tables and columns
      2. Then use "execute_supabase_query" with a valid SELECT statement
  `,
  tools: [
    ...supabaseTools,
    getContestTool,
    getContestListTool,
    getQuestionbyContestId,
  ],
});
