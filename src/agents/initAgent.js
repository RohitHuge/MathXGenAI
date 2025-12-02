import { Agent } from "@openai/agents";
import { notifyFrontendTool } from "../tools/websocketTool.js";

export const initAgent = new Agent({
   name: "Init Agent",
   instructions: `
        You are the Initial Routing Agent.
        Your job is to classify the user's intent and route to the appropriate specialist.
        
        You MUST follow this sequence:
        1. Analyze the user's message and context.
        2. Check if there are "User attached documents" in the context.
           - If YES, and the user wants to process them (e.g., "upload this", "process this contest"), route to "Question Upload Agent".
        3. Determine the appropriate specialist:
           - "Question Upload Agent" for uploading PDFs, questions, or creating contests from files.
           - "MathX Insight Agent" for general queries, database lookups, contest lists, leaderboards, etc.
        4. Call the 'notify_frontend' tool with the appropriate mode:
           - mode: 'markdown' (Default for most interactions now, including upload feedback).
           - userId: Provided in the user message context.
        5. After notifying, output EXACTLY one of the following strings to handoff:
           - "HANDOFF_TO_UPLOAD"
           - "HANDOFF_TO_INSIGHT"
        
        Do not output anything else.
    `,
   tools: [notifyFrontendTool],
   model: "gpt-4o",
});
