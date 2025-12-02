import { tool } from "@openai/agents";
import { z } from "zod";
import { getIO, getSocketId } from "../socketManager.js";

export const notifyFrontendTool = tool({
    name: "notify_frontend",
    description: "Notifies the frontend about the type of response to expect (markdown or modal).",
    parameters: z.object({
        userId: z.string().describe("The ID of the user to notify"),
        mode: z.enum(["markdown", "modal"]).describe("The response mode: 'markdown' for text/insight, 'modal' for question upload"),
        message: z.string().describe("Message to display (pass empty string if none)"),
    }),
    async execute({ userId, mode, message }) {
        try {
            const io = getIO();
            const socketId = getSocketId(userId);

            if (socketId) {
                io.to(socketId).emit("agent_response_mode", { mode, message });
                return `Frontend notified: Switching to ${mode} mode.`;
            } else {
                // Fallback: emit to room (userId)
                io.to(userId).emit("agent_response_mode", { mode, message });
                return `Frontend notified (via room): Switching to ${mode} mode.`;
            }
        } catch (error) {
            console.error("Error notifying frontend:", error);
            return "Failed to notify frontend.";
        }
    },
});

export const emitSocketEventTool = tool({
    name: "emit_socket_event",
    description: "Emits a specific socket event to the frontend (e.g., progress, approval_needed, done).",
    parameters: z.object({
        userId: z.string().describe("The ID of the user to notify"),
        eventName: z.enum(["progress", "approval_needed", "done"]).describe("The event name"),
        data: z.string().describe("The data payload as a JSON string"),
    }),
    async execute({ userId, eventName, data }) {
        try {
            const io = getIO();
            const socketId = getSocketId(userId);
            const parsedData = JSON.parse(data);

            if (socketId) {
                io.to(socketId).emit(eventName, parsedData);
                return `Event '${eventName}' emitted to frontend.`;
            } else {
                io.to(userId).emit(eventName, parsedData);
                return `Event '${eventName}' emitted to frontend (via room).`;
            }
        } catch (error) {
            console.error("Error emitting socket event:", error);
            return "Failed to emit event.";
        }
    },
});
