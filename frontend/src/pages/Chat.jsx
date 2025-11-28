import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogOut, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chat() {
    const { user, logout } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadChatHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChatHistory = async () => {
        try {
            const data = await api.getChatHistory();
            const formattedMessages = [];
            data.messages.forEach((msg) => {
                if (msg.is_user_message) {
                    formattedMessages.push({
                        id: msg.id,
                        text: msg.message,
                        sender: 'user',
                        timestamp: msg.created_at,
                    });
                }
                if (msg.response) {
                    formattedMessages.push({
                        id: msg.id + '-response',
                        text: msg.response,
                        sender: 'agent',
                        timestamp: msg.created_at,
                    });
                }
            });
            setMessages(formattedMessages);
        } catch (error) {
            console.error('Failed to load chat history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = {
            id: Date.now(),
            text: input,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await api.sendMessage(userMessage.text);

            const agentMessage = {
                id: response.messageId,
                text: response.response,
                sender: 'agent',
                timestamp: response.timestamp,
            };

            setMessages((prev) => [...prev, agentMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: '❌ Failed to send message. Please try again.',
                sender: 'agent',
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                MathX AI Assistant
                            </h1>
                            <p className="text-sm text-slate-400">Powered by AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm text-white font-medium">{user?.name}</p>
                            <p className="text-xs text-slate-400">{user?.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-red-500/20 rounded-xl transition-colors group"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {loadingHistory ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
                            <p className="text-slate-400">Loading chat history...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 mx-auto mb-6 flex items-center justify-center">
                                <Bot className="w-10 h-10 text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Start a Conversation</h2>
                            <p className="text-slate-400 mb-8">Ask me anything about MathX data!</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                <button
                                    onClick={() => setInput('List all available contests')}
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all text-left group"
                                >
                                    <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                                        📋 List all contests
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">See available contests</p>
                                </button>
                                <button
                                    onClick={() => setInput('Show top 10 scorers')}
                                    className="p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all text-left group"
                                >
                                    <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                                        🏆 Top scorers
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Get leaderboard data</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
                            >
                                {message.sender === 'agent' && (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className={`max-w-3xl ${message.sender === 'user' ? 'order-first' : ''}`}>
                                    <div className={`rounded-2xl px-4 py-3 ${message.sender === 'user'
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                                        : 'bg-slate-800/50 border border-slate-700'
                                        }`}>
                                        {message.sender === 'agent' ? (
                                            <div className="prose prose-invert prose-sm max-w-none text-slate-200">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-white">{message.text}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 px-2">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>

                                {message.sender === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {/* Loading Indicator */}
                    {loading && (
                        <div className="flex justify-start items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Section */}
            <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl px-4 py-4 sticky bottom-0">
                <div className="max-w-4xl mx-auto">
                    <div className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about MathX data..."
                            rows="1"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-white placeholder-slate-500 resize-none transition disabled:opacity-50"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 shadow-lg shadow-cyan-500/30"
                        >
                            <Send className="w-5 h-5" />
                            <span className="hidden sm:inline">Send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
