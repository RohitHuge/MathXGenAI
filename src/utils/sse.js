export const sseClients = new Map(); // userId -> res

export function addSSEClient(userId, res) {
    sseClients.set(userId, res);
    console.log(`📡 SSE Client connected: ${userId}`);
}

export function removeSSEClient(userId) {
    sseClients.delete(userId);
    console.log(`📴 SSE Client disconnected: ${userId}`);
}

export function sendSSEEvent(userId, event, data) {
    const client = sseClients.get(userId);
    if (client) {
        client.write(`event: ${event}\n`);
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}
