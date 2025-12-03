import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogOut, Send, Bot, User, Loader2, Sparkles, Mic, MicOff, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSpeechToText } from '../hooks/useSpeechToText';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { io } from 'socket.io-client';
import QuestionUploadModal from '../components/QuestionUploadModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function Chat() {
    const { user, logout } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(true);
    const [attachment, setAttachment] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed');
            return;
        }

        setIsUploading(true);
        try {
            // const formData = new FormData();
            // formData.append('file', file);
            // formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

            // const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            // const response = await fetch(
            //     `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
            //     {
            //         method: 'POST',
            //         body: formData,
            //     }
            // );

            // if (!response.ok) {
            //     throw new Error('Upload failed');
            // }

            // const data = await response.json();
            setAttachment({
                name: file.name,
                file: file
            });
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    // Speech to Text Hook
    const { isListening, transcript, startListening, stopListening, resetTranscript, hasSupport } = useSpeechToText();

    // Update input when transcript changes
    useEffect(() => {
        if (transcript) {
            setInput((prev) => {
                return prev + (prev.endsWith(' ') ? '' : ' ') + transcript.trim();
            });
            resetTranscript();
        }
    }, [transcript, resetTranscript]);

    // Socket.IO Connection
    useEffect(() => {
        if (!user) return;

        socketRef.current = io(BACKEND_URL);

        socketRef.current.on('connect', () => {
            console.log('🔌 Socket Connected');
            socketRef.current.emit('authenticate', { userId: user.$id });
        });

        socketRef.current.on('agent_response', (data) => {
            setLoading(false);
            if (data.error) {
                const errorMessage = {
                    id: Date.now(),
                    text: `❌ Error: ${data.error}`,
                    sender: 'agent',
                    timestamp: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            } else if (data.text) {
                const agentMessage = {
                    id: Date.now(),
                    text: data.text,
                    sender: 'agent',
                    timestamp: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, agentMessage]);
            }
        });

        socketRef.current.on('agent_response_mode', (data) => {
            console.log('🔔 Response Mode:', data.mode);
            if (data.mode === 'modal') {
                setIsUploadModalOpen(true);
                setLoading(false); // Stop loading indicator as modal takes over
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [user]);

    const [pendingQuestions, setPendingQuestions] = useState([]);

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
        if ((!input.trim() && !attachment) || loading) return;

        const userMessage = {
            id: Date.now(),
            text: input,
            sender: 'user',
            timestamp: new Date().toISOString(),
            docsrefs: attachment ? [attachment.url] : []
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setAttachment(null);
        setLoading(true);

        // if (socketRef.current) {
        //     socketRef.current.emit('user_message', {
        //         message: userMessage.text,
        //         docsrefs: userMessage.docsrefs
        //     });
        // } else {
        //     console.error('Socket not connected');
        //     setLoading(false);
        // }
        const formdata = new FormData();
        formdata.append('message', userMessage.text);
        attachment?.file && formdata.append('file', attachment.file);


        try {
            const res = await fetch(`${backendUrl}/api/chat/upload`, {
                method: 'POST',
                headers: {
                    'X-User-ID': user.$id
                },
                body: formdata
            });

            if (!res.ok) {
                throw new Error('Failed to send message');
            }
            const data = await res.json();
            console.log(data);
            setLoading(false);
            const agentMessage = {
                id: Date.now(),
                text: data.response,
                sender: 'agent',
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, agentMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const preprocessLatex = (content) => {
        if (typeof content !== 'string') return content;

        // Replace \[ ... \] with $$ ... $$
        let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

        // Replace \( ... \) with $ ... $
        processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

        return processed;
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
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {preprocessLatex(message.text)}
                                                </ReactMarkdown>

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
                    <div className="flex gap-3 items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={isListening ? "Listening..." : "Ask me anything about MathX data..."}
                            rows="1"
                            disabled={loading}
                            className={`flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-white placeholder-slate-500 resize-none transition disabled:opacity-50 ${isListening ? 'ring-2 ring-cyan-500/50 bg-cyan-900/10' : ''}`}
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />

                        {/* Attachment Button */}
                        <div className="relative">
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleFileSelect}
                                accept=".pdf"
                                disabled={loading || isUploading}
                            />
                            <label
                                htmlFor="file-upload"
                                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${attachment
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700'
                                    }`}
                                title="Attach PDF"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Paperclip className="w-5 h-5" />
                                )}
                            </label>
                            {attachment && (
                                <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-lg p-2 flex items-center gap-2 min-w-[200px] shadow-xl">
                                    <div className="w-8 h-8 bg-red-500/20 rounded flex items-center justify-center">
                                        <span className="text-xs font-bold text-red-400">PDF</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white truncate">{attachment.name}</p>
                                        <p className="text-[10px] text-slate-400">Ready to send</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setAttachment(null);
                                        }}
                                        className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Microphone Button */}
                        {hasSupport && (
                            <button
                                onClick={toggleListening}
                                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${isListening
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700'
                                    }`}
                                title={isListening ? "Stop listening" : "Start voice input"}
                            >
                                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={(!input.trim() && !attachment) || loading || isUploading}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 shadow-lg shadow-cyan-500/30 h-[48px]"
                        >
                            <Send className="w-5 h-5" />
                            <span className="hidden sm:inline">Send</span>
                        </button>
                    </div>
                    {isListening && (
                        <p className="text-xs text-cyan-400 mt-2 ml-1 animate-pulse">
                            🎤 Listening... Speak now
                        </p>
                    )}
                </div>
            </div>

            <QuestionUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                socket={socketRef.current}
            />
        </div>
    );
}
