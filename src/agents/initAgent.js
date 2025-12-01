import { Agent } from "@openai/agents";
import { z } from "zod";
import { tool } from "@openai/agents";
import { sendSSEEvent } from "../utils/sse.js";

// Tool to trigger the modal via SSE
const triggerUploadModalTool = tool({
    name: "trigger_upload_modal",
    description: "Triggers the Question Upload Modal on the client via SSE.",
    parameters: z.object({
        userId: z.string().describe("The user ID to send the event to"),
    }),
    async execute({ userId }) {
        console.log(`🔔 Triggering upload modal for user: ${userId}`);
        sendSSEEvent(userId, "open_question_upload_modal", { message: "Please upload your PDF" });
        return "Modal triggered successfully. Waiting for user upload.";
    },
});

export const initAgent = new Agent({
    name: "Init Agent",
    instructions: `
        You are the Initial Routing Agent.
        Your job is to classify the user's intent.
        
        If the user wants to upload questions or a PDF for a contest:
        1. Call the 'trigger_upload_modal' tool.
        2. Inform the user that the upload modal has been opened.
        
        For other queries, you can answer directly or handoff to MathX Insight Agent.
    `,
    tools: [triggerUploadModalTool],
    model: "gpt-4o",
});
