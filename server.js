import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { run } from "@openai/agents";
import { mathXAgent } from "./agent.js";
import { createServer } from "http";
import { initAgent } from "./src/agents/initAgent.js";
import { questionUploadAgent } from "./src/agents/questionUploadAgent.js";
import { initSocket } from "./src/socketManager.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = initSocket(httpServer);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ==========================================
// Helper Functions
// ==========================================

async function syncUserToSupabase(appwriteUserId, email, name) {
    try {
        const { data, error } = await supabase
            .from("genusers")
            .upsert(
                {
                    appwrite_user_id: appwriteUserId,
                    email: email,
                    name: name,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "appwrite_user_id",
                }
            )
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error syncing user to Supabase:", err);
        throw err;
    }
}

async function getSupabaseUserByAppwriteId(appwriteUserId) {
    try {
        const { data, error } = await supabase
            .from("genusers")
            .select("*")
            .eq("appwrite_user_id", appwriteUserId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error getting Supabase user:", err);
        return null;
    }
}

async function saveChatMessage(userId, message, isUserMessage, response = null, docsRefs = []) {
    try {
        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                user_id: userId,
                message: message,
                response: response,
                is_user_message: isUserMessage,
                docs_refs: docsRefs
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error saving chat message:", err);
        throw err;
    }
}

async function getChatHistory(userId, limit = 50) {
    try {
        const { data, error } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error getting chat history:", err);
        throw err;
    }
}

// ==========================================
// Authentication Middleware
// ==========================================

async function authenticateUser(req, res, next) {
    try {
        let appwriteUserId = req.headers['x-user-id'];

        if (!appwriteUserId) {
            return res.status(401).json({ error: "No user ID provided" });
        }

        let supabaseUser = await getSupabaseUserByAppwriteId(appwriteUserId);
        if (!supabaseUser) {
            return res.status(401).json({ error: "User not synced. Please login again." });
        }

        req.user = {
            appwriteId: appwriteUserId,
            supabaseId: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.name,
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({ error: "Authentication failed" });
    }
}

// ==========================================
// Socket.IO Agent Orchestration
// ==========================================

io.on("connection", (socket) => {
    // Note: 'authenticate' is handled in socketManager, but we can listen here too if needed.
    // We assume the client emits 'user_message' after authentication.

    socket.on("user_message", async ({ message, docsrefs = [] }) => {
        try {
            if (!socket.userId) {
                socket.emit("agent_response", { error: "Not authenticated" });
                return;
            }

            console.log(`📩 Message from ${socket.userId}: ${message}`);
            if (docsrefs.length > 0) {
                console.log(`📎 Attachments: ${docsrefs.join(", ")}`);
            }

            // 1. Save User Message
            const supabaseUser = await getSupabaseUserByAppwriteId(socket.userId);
            if (supabaseUser) {
                await saveChatMessage(supabaseUser.id, message, true, null, docsrefs);
            }

            // 2. Prepare Context with History
            const history = await getChatHistory(supabaseUser.id, 10);
            const historyText = history.map(msg => {
                const role = msg.is_user_message ? "User" : "Agent";
                const content = msg.is_user_message ? msg.message : msg.response;
                const docs = msg.docs_refs && msg.docs_refs.length > 0 ? ` [Attachments: ${msg.docs_refs.join(", ")}]` : "";
                return `${role}: ${content}${docs}`;
            }).join("\n");

            let contextMessage = `
Current User ID: ${socket.userId}
Chat History:
${historyText}

User: ${message}
            `.trim();

            if (docsrefs.length > 0) {
                contextMessage += `\nUser attached documents: ${JSON.stringify(docsrefs)}`;
            }

            console.log("🤖 Running Init Agent...");
            const initResult = await run(initAgent, contextMessage);
            const decision = initResult.finalOutput.trim();

            console.log(`👉 Init Agent Decision: ${decision}`);

            let finalResponse = "";
            let activeAgent = null;

            // 3. Handoff & Execute Specialist
            if (decision.includes("HANDOFF_TO_UPLOAD")) {
                activeAgent = questionUploadAgent;
            } else if (decision.includes("HANDOFF_TO_INSIGHT")) {
                activeAgent = mathXAgent;
            } else {
                // Fallback: Init Agent answered directly
                finalResponse = decision;
            }

            if (activeAgent) {
                console.log(`🚀 Handing off to ${activeAgent.name}...`);
                const result = await run(activeAgent, contextMessage); // Run specialist with full context
                finalResponse = result.finalOutput;
            }

            // 4. Send Response & Save
            socket.emit("agent_response", { text: finalResponse });

            if (supabaseUser) {
                await saveChatMessage(supabaseUser.id, message, false, finalResponse);
            }

        } catch (error) {
            console.error("Error in agent flow:", error);
            socket.emit("agent_response", { error: "An error occurred processing your request." });
        }
    });
});

// ==========================================
// Routes
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/sync", async (req, res) => {
    try {
        const { appwriteUserId, email, name } = req.body;

        if (!appwriteUserId || !email || !name) {
            return res.status(400).json({ error: "Missing user data" });
        }

        const supabaseUser = await syncUserToSupabase(appwriteUserId, email, name);

        res.json({
            success: true,
            user: {
                id: supabaseUser.id,
                appwriteId: supabaseUser.appwrite_user_id,
                email: supabaseUser.email,
                name: supabaseUser.name,
            },
        });
    } catch (error) {
        console.error("Sync error:", error);
        res.status(500).json({ error: "Failed to sync user" });
    }
});

app.get("/api/chat/history", authenticateUser, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = await getChatHistory(req.user.supabaseId, limit);

        res.json({ messages: history });
    } catch (error) {
        console.error("Chat history error:", error);
        res.status(500).json({ error: "Failed to retrieve chat history" });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
