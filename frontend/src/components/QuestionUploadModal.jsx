import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css'; // Ensure CSS is imported

export default function QuestionUploadModal({ isOpen, onClose, socket }) {
    const { user } = useAuth();
    const [step, setStep] = useState('upload'); // upload, processing, approval, done
    const [progress, setProgress] = useState({ phase: '', percent: 0, detail: '' });
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [summary, setSummary] = useState(null);
    const [file, setFile] = useState(null);
    const [contestHint, setContestHint] = useState('');
    const [metrics, setMetrics] = useState({ total: 0, approved: 0, rejected: 0 });

    // WebSocket listeners removed as we shifted to HTTP
    // useEffect(() => { ... }, [isOpen, socket]);

    const handleStartUpload = async () => {
        if (!file) return;

        setStep('processing');
        setProgress({ phase: 'Uploading...', percent: 0, detail: 'Sending file to server...' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('message', `I have uploaded a file: ${file.name}. Contest Hint: ${contestHint}`);
            formData.append('contestHint', contestHint);

            // Get token if needed, but api service handles headers usually. 
            // Since we are using fetch directly here for FormData, we need to get user ID.
            // Better to use a service method, but for now direct fetch with headers.
            const token = user?.$id; // Or however we get the ID for header

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/chat/upload`, {
                method: 'POST',
                headers: {
                    'X-User-ID': token
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();

            // The backend now returns the agent response directly
            // We need to parse the agent response to see if it's a question approval request or done
            // For this specific flow, the agent might return a JSON string in the text

            console.log("Agent Response:", data.response);

            // Heuristic: If response contains "question" and "choices", it's likely an approval needed
            // This logic depends on what the agent returns. 
            // Assuming the agent returns a JSON string for the question structure.

            try {
                // Try to find JSON in the response text
                const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.question || parsed.body) {
                        setStep('approval');
                        setCurrentQuestion({
                            index: 1, // Mock index for now
                            question: parsed.question || parsed
                        });
                        return;
                    }
                }
            } catch (e) {
                console.log("Could not parse JSON from agent response", e);
            }

            // If no question structure found, assume it's a general summary or done
            setStep('done');
            setSummary(data.response);

        } catch (error) {
            console.error("Upload error:", error);
            setStep('processing'); // Go back to processing or show error state
            setProgress({ phase: 'Error', percent: 0, detail: 'Failed to upload file. Please try again.' });
        }
    };

    const handleDecision = async (decision) => {
        if (currentQuestion) {
            setStep('processing');
            setProgress({ phase: 'Processing decision...', percent: 0, detail: 'Agent is updating...' });

            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/chat/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': user?.$id
                    },
                    body: JSON.stringify({
                        message: `Decision for Question ${currentQuestion.index}: ${decision}`,
                        contestHint: contestHint
                    })
                });

                const data = await response.json();

                // Update local metrics
                setMetrics(prev => ({
                    ...prev,
                    [decision === 'approve' ? 'approved' : 'rejected']: prev[decision === 'approve' ? 'approved' : 'rejected'] + 1,
                    total: prev.total + 1
                }));

                // Check if there are more questions or done
                // For now, just go to done or stay in loop if agent sends another question
                try {
                    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.question || parsed.body) {
                            setStep('approval');
                            setCurrentQuestion({
                                index: metrics.total + 2,
                                question: parsed.question || parsed
                            });
                            return;
                        }
                    }
                } catch (e) {
                    // ignore
                }

                setStep('done');
                setSummary(data.response);

            } catch (error) {
                console.error("Decision error:", error);
                // Handle error
            }
        }
    };

    if (!isOpen) return null;

    const steps = ['upload', 'processing', 'approval', 'done'];
    const currentStepIndex = steps.indexOf(step);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

                {/* Header & Stepper */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Question Ingestion
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Stepper UI */}
                    <div className="flex items-center justify-between px-4">
                        {['Upload', 'Processing', 'Review', 'Summary'].map((label, idx) => {
                            const isActive = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            return (
                                <div key={label} className="flex flex-col items-center relative z-10">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                        {/* Progress Bar Background */}
                        <div className="absolute left-0 right-0 top-[5.5rem] h-0.5 bg-gray-200 dark:bg-gray-700 -z-0 mx-12 hidden md:block" />
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* STEP 1: UPLOAD */}
                    {step === 'upload' && (
                        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contest Context</label>
                                <input
                                    type="text"
                                    value={contestHint}
                                    onChange={(e) => setContestHint(e.target.value)}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white px-4 py-3 transition-all"
                                    placeholder="e.g. Weekly Contest 5 - Algebra Section"
                                />
                            </div>

                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50 group">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <span className="text-lg font-medium text-gray-900 dark:text-white">
                                        {file ? file.name : "Drop your PDF here"}
                                    </span>
                                    <span className="text-sm text-gray-500 mt-1">or click to browse</span>
                                </label>
                            </div>

                            <button
                                onClick={handleStartUpload}
                                disabled={!file}
                                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
                            >
                                Start Processing
                            </button>
                        </div>
                    )}

                    {/* STEP 2: PROCESSING */}
                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center h-full py-12 animate-in fade-in duration-500">
                            <div className="relative w-24 h-24 mb-8">
                                <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-indigo-600 font-bold text-xl">AI</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{progress.phase || 'Analyzing...'}</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md text-center">{progress.detail}</p>
                        </div>
                    )}

                    {/* STEP 3: APPROVAL (REVIEW) */}
                    {step === 'approval' && currentQuestion && (
                        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                                    Question #{currentQuestion.index}
                                </span>
                                <div className="text-sm text-gray-500">
                                    Confidence: <span className="text-green-600 font-bold">High</span>
                                </div>
                            </div>

                            {/* Question Card */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6">
                                <div className="prose dark:prose-invert max-w-none mb-6">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                        {currentQuestion.question.body}
                                    </ReactMarkdown>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {currentQuestion.question.choices?.map((choice, i) => (
                                        <div key={i} className={`p-4 rounded-lg border transition-all ${choice === currentQuestion.question.answer
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}>
                                            <div className="flex items-start">
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs border mr-3 ${choice === currentQuestion.question.answer
                                                    ? 'bg-green-500 text-white border-green-500'
                                                    : 'border-gray-300 text-gray-500'
                                                    }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <div className="prose dark:prose-invert prose-sm max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {choice}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-100 dark:border-gray-800 -mx-6 -mb-6">
                                <button
                                    onClick={() => handleDecision('reject')}
                                    className="flex-1 py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 font-medium transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => alert("Edit mode coming soon!")}
                                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDecision('approve')}
                                    className="flex-[2] py-3 px-4 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
                                >
                                    Approve & Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: DONE (SUMMARY) */}
                    {step === 'done' && (
                        <div className="text-center py-12 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ingestion Complete!</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">Your questions have been successfully processed.</p>

                            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.total}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.approved}</div>
                                    <div className="text-xs text-green-600/70 dark:text-green-400/70 uppercase tracking-wide">Approved</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.rejected}</div>
                                    <div className="text-xs text-red-600/70 dark:text-red-400/70 uppercase tracking-wide">Rejected</div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="bg-indigo-600 text-white py-3 px-8 rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
