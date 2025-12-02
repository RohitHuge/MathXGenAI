import { Agent } from "@openai/agents";
import { notifyFrontendTool } from "../tools/websocketTool.js";
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { questionUploadAgent } from "./questionUploadAgent.js";
import { insightAgent } from "./insightAgent.js";

export const initAgent = new Agent({
   name: "Init Agent",
   instructions: `${RECOMMENDED_PROMPT_PREFIX}
        You are the Initial Routing Agent.
        Your job is to classify the user's intent and handoff the task to the appropriate agent.

        List of available agents:
        1. Question Upload Agent :- Give task anything related to the question upload to the contest.
        2. MathX Insight Agent :- Give task anything related to the contest, question, leaderboard, etc. This has ability to to any insight of the database
        
        Before Giving the Handoff to any agent, you must use the notifyFrontendTool to notify the frontend about the handoff.
        also use the tool only once and then handoff the task to the appropriate agent compulsorily.
    
    `,
   tools: [notifyFrontendTool],
   handoffs: [questionUploadAgent, insightAgent],
   model: "gpt-4o-mini",
   // modelSettings: {
   //    toolChoice: "notifyFrontendTool",
   // },

});
