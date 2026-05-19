import React, { useState } from 'react';

const FinalAssessmentPage: React.FC = () => {
    const [rating, setRating] = useState<number>(0);
    const [hover, setHover] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState<string>('');
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since no backend is defined yet, we'll just mock the submission and lock the UI.
        console.log("Feedback Submitted:", { rating, feedbackText });
        setIsSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-2.5 flex items-center justify-between">
                <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {/* Decorative background elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

                <div className="max-w-xl w-full bg-white border border-gray-200 rounded-3xl p-10 shadow-xl relative z-10">
                    
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100 animate-in fade-in zoom-in duration-300">
                            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Assessment Completed</h1>
                        <p className="text-gray-500 mb-6 text-sm">
                            Thank you for completing the assessment. Your responses have been successfully recorded and your camera and microphone have been turned off.
                        </p>

                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-4 text-left">
                            <div className="mt-0.5">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-red-800 font-bold text-sm mb-1">Action Required to Exit</h3>
                                <p className="text-red-700 text-xs leading-relaxed">
                                    Please exit the Safe Exam Browser by clicking the <strong>Power Button</strong> located in the bottom right corner of your screen.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-8">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">How was your experience?</h2>
                        
                        {!isSubmitted ? (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                {/* Star Rating */}
                                <div className="flex justify-center gap-2">
                                    {[...Array(5)].map((_, index) => {
                                        index += 1;
                                        return (
                                            <button
                                                type="button"
                                                key={index}
                                                className={`text-4xl transition-colors duration-200 ${index <= (hover || rating) ? 'text-yellow-400' : 'text-gray-200'}`}
                                                onClick={() => setRating(index)}
                                                onMouseEnter={() => setHover(index)}
                                                onMouseLeave={() => setHover(rating)}
                                            >
                                                <svg className="w-10 h-10 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Text Area */}
                                <div>
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder-gray-400 shadow-inner"
                                        rows={4}
                                        placeholder="Tell us what you liked or how we can improve..."
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={rating === 0}
                                    className={`w-full py-3.5 text-white text-sm font-bold rounded-xl transition-all uppercase tracking-wider ${rating === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-200'}`}
                                >
                                    Submit Feedback
                                </button>
                            </form>
                        ) : (
                            <div className="bg-green-50 rounded-xl p-6 text-center border border-green-100 animate-in fade-in duration-500">
                                <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <h3 className="text-green-800 font-bold mb-1">Thank You!</h3>
                                <p className="text-green-700 text-sm">Your feedback has been submitted successfully. You may now close this window using the Power Button.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalAssessmentPage;
