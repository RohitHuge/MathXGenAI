import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { run } from "@openai/agents";
import { createServer } from "http";
import { initAgent } from "./src/agents/initAgent.js";
import { initSocket } from "./src/socketManager.js";
import { db } from "./src/config.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = initSocket(httpServer);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

/*
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
            const result = await run(initAgent, contextMessage);

            // 4. Send Response & Save
            socket.emit("agent_response", { text: result.finalOutput });

            if (supabaseUser) {
                await saveChatMessage(supabaseUser.id, message, false, result.finalOutput);
            }

        } catch (error) {
            console.error("Error in agent flow:", error);
            socket.emit("agent_response", { error: "An error occurred processing your request." });
        }
    });
});
*/

// ==========================================
// Routes
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

import { upload, cloudinary } from "./src/uploadConfig.js";

app.post("/api/chat/upload", authenticateUser, upload.single("file"), async (req, res) => {
    try {
        const { message, contestHint } = req.body;
        const file = req.file;
        let fileUrl = null;

        console.log(`📩 Upload Request from ${req.user.name}`);
        console.log(`📝 Message: ${message}`);
        console.log(`📎 File: ${file ? file.originalname : "None"}`);

        // 1. Upload to Cloudinary if file exists
        if (file) {
            try {
                // Upload from buffer
                const b64 = Buffer.from(file.buffer).toString("base64");
                let dataURI = "data:" + file.mimetype + ";base64," + b64;

                const uploadRes = await cloudinary.uploader.upload(dataURI, {
                    resource_type: "auto",
                    folder: "mathx_uploads"
                });

                fileUrl = uploadRes.secure_url;
                console.log(`✅ File uploaded to Cloudinary: ${fileUrl}`);
            } catch (uploadErr) {
                console.error("Cloudinary Upload Error:", uploadErr);
                return res.status(500).json({ error: "File upload failed" });
            }
        }

        // 2. Save User Message
        const docsRefs = fileUrl ? [fileUrl] : [];
        await saveChatMessage(req.user.supabaseId, message, true, null, docsRefs);

        // 3. Prepare Context for Agent
        // We can reuse getChatHistory logic or just send current context
        // For now, let's keep it simple and focused on the current request + file
        let contextMessage = `
            User ID: ${req.user.appwriteId}
            User Name: ${req.user.name}
            Message: ${message}
            Contest Context: ${contestHint || "None"}
        `.trim();

        if (fileUrl) {
            contextMessage += `\n\n[SYSTEM] The user has uploaded a file. URL: ${fileUrl}`;
        }

        console.log("🤖 Running Agent...");
        const result = await run(initAgent, contextMessage);

        // 4. Save Agent Response
        const agentMessage = await saveChatMessage(
            req.user.supabaseId,
            message,
            false,
            result.finalOutput
        );

        res.json({
            response: result.finalOutput,
            messageId: agentMessage.id,
            fileUrl: fileUrl
        });

    } catch (error) {
        console.error("Chat/Upload Error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
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

app.get("/api/questions/pending", authenticateUser, async (req, res) => {
    try {
        // console.log("Fetching pending questions for user:", req.user);
        const { data, error } = await supabase
            .from("pending_questions")
            .select("*")
            .eq("user_id", req.user.appwriteId)
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (error) throw error;
        res.json({ questions: data });
    } catch (error) {
        console.error("Error fetching pending questions:", error);
        res.status(500).json({ error: "Failed to fetch pending questions" });
    }
});

app.post("/api/questions/process", authenticateUser, async (req, res) => {
    try {
        const { questionId, action, updatedData } = req.body; // action: 'approve' | 'reject'

        if (!questionId || !action) {
            return res.status(400).json({ error: "Missing questionId or action" });
        }

        if (action === "reject") {
            const { error } = await supabase
                .from("pending_questions")
                .update({ status: "rejected" })
                .eq("id", questionId)
                .eq("user_id", req.user.appwriteId);

            if (error) throw error;
            return res.json({ success: true, message: "Question rejected" });
        }

        if (action === "approve") {
            // 1. Fetch the question details
            const { data: question, error: fetchError } = await supabase
                .from("pending_questions")
                .select("*")
                .eq("id", questionId)
                .eq("user_id", req.user.appwriteId)
                .single();

            if (fetchError || !question) throw fetchError || new Error("Question not found");

            // 2. Upload to Appwrite
            const finalQuestion = { ...question, ...updatedData };

            // Use hardcoded DB ID from appwriteTool.js for consistency
            const DATABASE_ID = "68adceb9000bb9b8310b";
            const COLLECTION_ID = "questions";

            const result = await db.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                "unique()",
                {
                    contest_id: finalQuestion.contest_id || "default",
                    question_text: finalQuestion.question_body,
                    options: finalQuestion.options,
                    correct_option: finalQuestion.correct_answer,
                    marks: 10 // Default marks
                }
            );

            // 3. Update status to approved
            const { error: updateError } = await supabase
                .from("pending_questions")
                .update({ status: "approved" })
                .eq("id", questionId);

            if (updateError) throw updateError;

            return res.json({ success: true, message: "Question approved and uploaded", appwriteId: result.$id });
        }

        res.status(400).json({ error: "Invalid action" });

    } catch (error) {
        console.error("Error processing question:", error);
        res.status(500).json({ error: "Failed to process question" });
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
