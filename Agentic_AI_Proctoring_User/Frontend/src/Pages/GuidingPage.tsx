import React from 'react';
import { useNavigate, useLocation } from 'react-router';

const GuidingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { nextSection, roundsCompleted, totalRounds, assessmentData } = location.state || {};

    const handleNext = () => {
        if (nextSection === "Finish") {
            navigate("/submission");
            return;
        }

        const sectionMapping: Record<string, string> = {
            "MCQ": "/section/mcq",
            "Coding": "/section/coding",
            "SQL": "/section/sql",
            "Essay": "/section/essay",
            "Fill in the Blanks": "/section/fitb",
            "Gaming": "/section/gaming",
            "Diagram": "/section/diagram"
        };

        const targetRoute = sectionMapping[nextSection];
        if (targetRoute) {
            navigate(targetRoute, { state: assessmentData });
        } else {
            navigate("/submission");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-2.5 flex items-center">
                <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
            </header>

            <div className="flex-1 flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-100 transition-all hover:shadow-2xl">
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm border border-green-100" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                        {nextSection === "Finish" ? "Assessment Finished!" : "Section Completed!"}
                    </h2>
                    <p className="text-sm text-gray-500 mb-8">
                        {nextSection === "Finish" 
                            ? "You have completed all sections of the assessment. Click below to finalize your submission."
                            : "Your responses have been recorded successfully."}
                    </p>

                    <button
                        onClick={handleNext}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 cursor-pointer uppercase tracking-wide"
                    >
                        {nextSection === "Finish" ? "Finalize & Submit Assessment" : "Take next sections →"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidingPage;
