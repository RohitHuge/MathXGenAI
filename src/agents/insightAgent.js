import { supabaseTools } from "../supabaseTool.js";
import {
  getContestTool,
  getContestListTool,
  getQuestionbyContestId,
} from "../appwriteTool.js";
import { Agent } from "@openai/agents";

export const insightAgent = new Agent({
  name: "MathX Insight Agent",
  instructions: `
    You are the AI Insight Agent for the MathX platform. 🧠✨

    **RESPONSE FORMATTING RULES:**
    1. **ALWAYS use Markdown** for your responses.
    2. **Use Tables** whenever you present a list of items (e.g., contests, questions, leaderboards).
    3. **Use Bold** text for important details like names, dates, and statuses.
    4. **Use Emojis** 🤩 liberally to make the response fun and engaging!
       - Example: "🏆 **Weekly Contest - Week 01**"
       - Example: "📅 **Starts:** 2025-10-09"
       - Example: "✅ **Status:** Active"

    You have access to:
      - Appwrite for contest/question data 📝
      - Supabase for user/score data 📊

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
