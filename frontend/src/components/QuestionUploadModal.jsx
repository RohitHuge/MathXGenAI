import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function QuestionUploadModal({ isOpen, onClose, socket} ) {
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pendingQuestions, setPendingQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingState, setLoadingState] = useState({ message: '', label: '' });

    // Reset index when modal opens or questions change
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen, pendingQuestions]);

    if (!isOpen) return null;

    const currentQuestion = pendingQuestions[currentIndex];
    const isFinished = !currentQuestion && pendingQuestions.length > 0 && currentIndex >= pendingQuestions.length;


    const checkPendingQuestions = async () => {
            if (!user) return;
            try {
                console.log("Checking pending questions...");
                const response = await fetch(`${backendUrl}/api/questions/pending`, {
                    headers: {
                        'X-User-ID': user.$id
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log("Pending questions:", data);
                    if (data.questions && data.questions.length > 0) {
                        setPendingQuestions(data.questions);
                        // setIsUploadModalOpen(true);
                    }
                }
            } catch (error) {
                console.error("Error checking pending questions:", error);
            }
        };

    useEffect(() => {
        checkPendingQuestions();
    }, []);
    // If we have processed all questions
    useEffect(() => {
        if (isFinished) {
            // Small delay to show success state if needed, or just close
            const timer = setTimeout(() => {
                onClose();
                }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isFinished, onClose]);

    const handleDecision = async (decision) => {
        if (!currentQuestion) return;

        setLoading(true);
        setLoadingState({
            message: decision === 'approve' ? 'Approving Question...' : 'Rejecting Question...',
            label: 'Please wait while we update the database.'
        });

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/questions/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user?.$id
                },
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    action: decision,
                    updatedData: {}
                })
            });

            if (!response.ok) throw new Error('Failed to process decision');

            // Move to next question
            setCurrentIndex(prev => prev + 1);

        } catch (error) {
            console.error("Decision error:", error);
            alert("Failed to process request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER HELPERS ---

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center h-96 animate-in fade-in duration-300">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {loadingState.message || 'Loading...'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
                {loadingState.label}
            </p>
        </div>
    );

    const renderFinished = () => (
        <div className="flex flex-col items-center justify-center h-96 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Done!</h3>
            <p className="text-gray-500 dark:text-gray-400">You've reviewed all pending questions.</p>
        </div>
    );

    const renderQuestion = () => {
        if (!currentQuestion) return null;

        const { contest_id, question_body, options, correct_answer } = currentQuestion;

        // Parse options if they are strings (JSON stringified in DB)
        let parsedOptions = [];
        try {
            parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
        } catch (e) {
            parsedOptions = [];
        }

        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                {/* Header Info */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                                {contest_id || 'General Contest'}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Pending Question {currentIndex + 1} of {pendingQuestions.length}
                        </p>
                    </div>
                    <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        ID: {currentQuestion.id.slice(0, 8)}...
                    </div>
                </div>

                {/* Question Body */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
                        <div className="prose dark:prose-invert max-w-none mb-6 text-lg">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {question_body}
                            </ReactMarkdown>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {parsedOptions.map((choice, i) => {
                                const isCorrect = choice === correct_answer || String.fromCharCode(65 + i) === correct_answer;
                                return (
                                    <div key={i} className={`p-4 rounded-lg border transition-all ${isCorrect
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500'
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}>
                                        <div className="flex items-start">
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border mr-4 ${isCorrect
                                                    ? 'bg-green-500 text-white border-green-500'
                                                    : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                                                }`}>
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <div className="prose dark:prose-invert prose-base max-w-none pt-1">
                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                    {choice}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                    <button
                        onClick={() => handleDecision('reject')}
                        className="flex-1 py-3.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        Reject
                    </button>
                    <button
                        onClick={() => handleDecision('approve')}
                        className="flex-[2] py-3.5 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Approve & Next
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10 bg-white/50 dark:bg-black/50 rounded-full p-1"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-8 h-full flex flex-col">
                    {loading ? renderLoading() : (isFinished ? renderFinished() : renderQuestion())}
                </div>
            </div>
        </div>
    );
}
