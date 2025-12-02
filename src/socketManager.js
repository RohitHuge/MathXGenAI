import { Server } from "socket.io";

let io = null;
const userSockets = new Map(); // userId -> socketId

export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("🔌 Socket connected:", socket.id);

        socket.on("authenticate", ({ userId }) => {
            socket.userId = userId;
            userSockets.set(userId, socket.id);
            socket.join(userId);
            console.log(`👤 User authenticated: ${userId}`);
        });

        socket.on("disconnect", () => {
            if (socket.userId) {
                userSockets.delete(socket.userId);
            }
            console.log("❌ Socket disconnected:", socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
}

export function getSocketId(userId) {
    return userSockets.get(userId);
}
