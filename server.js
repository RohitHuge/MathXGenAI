import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { run } from "@openai/agents";
import { mathXAgent } from "./agent.js";

dotenv.config();

const app = express();
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
        const appwriteUserId = req.headers['x-user-id'];

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

        const result = await run(mathXAgent, message);

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
