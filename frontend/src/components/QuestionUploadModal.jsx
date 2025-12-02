import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function QuestionUploadModal({ isOpen, onClose, socket }) {
    const { user } = useAuth();
    const [step, setStep] = useState('upload'); // upload, processing, approval, done
    const [progress, setProgress] = useState({ phase: '', percent: 0, detail: '' });
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [summary, setSummary] = useState(null);
    const [file, setFile] = useState(null);
    const [contestHint, setContestHint] = useState('');

    useEffect(() => {
        if (isOpen && socket) {
            const onProgress = (data) => {
                setStep('processing');
                setProgress(data);
            };

            const onApprovalNeeded = (data) => {
                setStep('approval');
                setCurrentQuestion(data);
            };

            const onDone = (data) => {
                setStep('done');
                setSummary(data.summary);
            };

            socket.on('progress', onProgress);
            socket.on('approval_needed', onApprovalNeeded);
            socket.on('done', onDone);

            return () => {
                socket.off('progress', onProgress);
                socket.off('approval_needed', onApprovalNeeded);
                socket.off('done', onDone);
            };
        }
    }, [isOpen, socket]);

    const handleStartUpload = async () => {
        if (!file || !socket) return;

        // Mock URL for demo purposes since we don't have a file upload endpoint
        const mockUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

        // In a real app, we would upload the file here and get the URL.
        console.log("Simulating upload for:", file.name);

        // Send message to agent to start ingestion
        const message = `I have uploaded a PDF file. URL: ${mockUrl}. Contest Hint: ${contestHint}`;
        socket.emit('user_message', { message });

        setStep('processing');
        setProgress({ phase: 'Starting...', percent: 0, detail: 'Agent is analyzing your request...' });
    };

    const handleDecision = (decision, editedQuestion = null) => {
        if (socket && currentQuestion) {
            // Send decision as a message to the agent
            const message = `Decision for Question ${currentQuestion.index}: ${decision}`;
            socket.emit('user_message', { message });

            setCurrentQuestion(null);
            setStep('processing');
            setProgress({ phase: 'Processing decision...', percent: 0, detail: 'Agent is updating...' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Question Upload Assistant</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contest Name (Optional)</label>
                            <input
                                type="text"
                                value={contestHint}
                                onChange={(e) => setContestHint(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
                                placeholder="e.g. Weekly Contest 5"
                            />
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer text-indigo-600 hover:text-indigo-500">
                                {file ? file.name : "Upload a PDF file"}
                            </label>
                            <p className="text-xs text-gray-500 mt-2">PDF up to 10MB</p>
                        </div>
                        <button
                            onClick={handleStartUpload}
                            disabled={!file}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Start Processing
                        </button>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{progress.phase || 'Processing...'}</p>
                        <p className="text-sm text-gray-500">{progress.detail}</p>
                    </div>
                )}

                {step === 'approval' && currentQuestion && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Question {currentQuestion.index}</h3>
                            <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                                <p>{currentQuestion.question.body}</p>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {currentQuestion.question.choices?.map((choice, i) => (
                                    <div key={i} className={`p-2 rounded border ${choice === currentQuestion.question.answer ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'}`}>
                                        {choice}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleDecision('approve')}
                                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => handleDecision('reject')}
                                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => alert("Edit not implemented in demo")}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                )}

                {step === 'done' && (
                    <div className="text-center py-8">
                        <div className="text-green-500 text-5xl mb-4">✓</div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Upload Complete!</h3>
                        <p className="text-gray-500 mb-6">{summary || "All questions processed successfully."}</p>
                        <button
                            onClick={onClose}
                            className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
