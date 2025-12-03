import { Agent } from "@openai/agents";
import { getQuestionTool } from "../tools/pdfTools.js";
import { latexifyTool } from "../tools/questionTools.js";
import { createContestTool, uploadQuestionTool } from "../appwriteTool.js";
import { emitSocketEventTool } from "../tools/websocketTool.js";

export const questionUploadAgent = new Agent({
    name: "Question Upload Agent",
    instructions: `
        You are the Question Upload Specialist.
        Your goal is to process a PDF, extract questions, and upload them to Appwrite.
        
        
        Workflow:
        1.  
    `,
    tools: [
        getQuestionTool,
        latexifyTool,
        createContestTool,
        uploadQuestionTool,
        emitSocketEventTool
    ],
    model: "gpt-4o",
});
