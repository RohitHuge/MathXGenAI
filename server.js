import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { run } from "@openai/agents";
import { mathXAgent } from "./agent.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { initAgent } from "./src/agents/initAgent.js";
import { questionUploadAgent } from "./src/agents/questionUploadAgent.js";
import { addSSEClient, removeSSEClient } from "./src/utils/sse.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for now, restrict in production
        methods: ["GET", "POST"]
    }
});

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

async function saveChatMessage(userId, message, isUserMessage, response = null) {
    try {
        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                user_id: userId,
                message: message,
                response: response,
                is_user_message: isUserMessage,
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

        // Fallback to query param for SSE
        if (!appwriteUserId && req.query.userId) {
            appwriteUserId = req.query.userId;
        }

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

io.on("connection", (socket) => {
    console.log("🔌 Socket.IO Client connected:", socket.id);

    socket.on("authenticate", async ({ userId }) => {
        // In a real app, verify token. For now, trust the userId.
        socket.userId = userId;
        socket.join(userId);
        console.log(`👤 Socket authenticated for user: ${userId}`);
    });

    socket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", socket.id);
    });

    // Handle client decisions
    socket.on("decision", (data) => {
        // Forward decision to the running agent/process
        // This will be handled by the agent runner logic
        console.log("📝 Decision received:", data);
        // We might need an event emitter to notify the waiting agent
        // For simplicity, we can use a global event emitter or similar mechanism
        // But since agents are running in the same process, we can use a shared state or event bus
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

app.post("/api/chat", authenticateUser, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "Message is required" });
        }

        await saveChatMessage(req.user.supabaseId, message, true);

        console.log(`🧠 Processing message from ${req.user.name}: "${message}"`);

        const messagetoagent = `Username: ${req.user.name}: "${message}",
        User ID: ${req.user.supabaseId}`;

        // Use InitAgent to decide flow
        const result = await run(initAgent, messagetoagent);

        const agentMessage = await saveChatMessage(
            req.user.supabaseId,
            message,
            false,
            result.finalOutput
        );

        res.json({
            response: result.finalOutput,
            messageId: agentMessage.id,
            timestamp: agentMessage.created_at,
        });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Failed to process message" });
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

// New Endpoint for Ingest Start
app.post("/api/ingest/start", authenticateUser, async (req, res) => {
    // This endpoint might be called by the frontend after the modal is open
    // or by the chat agent.
    // For the flow: Chat -> InitAgent -> SSE -> Modal Open -> User Uploads PDF -> POST /api/ingest/start

    const { fileUrl, contestHint } = req.body;
    const userId = req.user.appwriteId;

    console.log(`🚀 Starting ingest for ${userId}, file: ${fileUrl}`);

    // Start the QuestionUploadAgent in background
    // We need a way to run it and pass the socket/SSE context

    // Mocking the start
    res.json({ success: true, message: "Ingestion started" });

    // Trigger background process (TODO: Implement actual agent run)
    // runQuestionUploadAgent(userId, fileUrl, contestHint, io);
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

// Export for use in agents
export { io };
