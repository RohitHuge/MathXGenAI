import { Client, Account } from 'appwrite';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Initialize Appwrite Client
const appwriteClient = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(appwriteClient);

class ApiService {
    constructor() {
        this.currentUser = null;
    }

    setUser(user) {
        this.currentUser = user;
    }

    async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;

        // Add user ID to requests if user is authenticated
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(this.currentUser && { 'X-User-ID': this.currentUser.$id }),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Chat endpoints
    async sendMessage(message) {
        return await this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    async getChatHistory(limit = 50) {
        return await this.request(`/api/chat/history?limit=${limit}`);
    }

    // Health check
    async healthCheck() {
        return await this.request('/api/health');
    }
}

export const api = new ApiService();
