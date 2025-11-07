import { Agent } from "@openai/agents";
import { supabaseQueryTool } from "./src/supabaseTool.js";
import { getContestTool, getContestListTool, getQuestionbyContestId } from "./src/appwriteTool.js";

export const mathXAgent = new Agent({
  name: "MathX Insight Agent",
  instructions: `
    You are the AI Insight Agent for the MathX platform.
    You can access contest data from Appwrite and user/score data from Supabase.
    When asked questions about contests or results, decide which tool to use.

    Examples:
    - "Top 10 scorers for Contest C1" → use Supabase query tool
    - "Show contest details for Contest C1" → use Appwrite tool
  `,
  tools: [supabaseQueryTool, getContestTool, getContestListTool, getQuestionbyContestId],
});
