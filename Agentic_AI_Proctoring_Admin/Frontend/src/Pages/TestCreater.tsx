import React, { useState, type ChangeEvent } from 'react';
import NavBar from '../Components/NavBar';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

type SectionType = 'Coding' | 'MCQ' | 'SQL' | 'Gaming';

interface Section {
  id: number;
  type: SectionType;
  name: string;
  duration: string;
  file1: File | null;
}

const steps = ['Basic Info', 'Gaming', 'MCQ', 'Coding', 'SQL', 'Review'];



const TestCreator: React.FC = () => {
  const navigate = useNavigate();
  const [testName, setTestName] = useState<string>('');
  const [sections, setSections] = useState<Section[]>([
    { id: 1, type: 'Gaming', name: 'Gaming', duration: '4', file1: null },
    { id: 2, type: 'MCQ', name: 'MCQ', duration: '', file1: null },
    { id: 3, type: 'Coding', name: 'Coding', duration: '', file1: null },
    { id: 4, type: 'SQL', name: 'SQL', duration: '', file1: null },
  ]);
  const [gamingEnabled, setGamingEnabled] = useState<boolean>(true);
  const [gamingRounds, setGamingRounds] = useState<string>('3');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, sectionId: number) => {
    const file = e.target.files?.[0] || null;
    setSections(sections.map(s => s.id === sectionId ? { ...s, file1: file } : s));
  };

  const handleDurationChange = (sectionId: number, value: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, duration: value } : s));
  };

  const handleSubmit = async () => {
    const adminId = "MexicanMonster";
    const mcqSection = sections.find(s => s.type === "MCQ");
    const codingSection = sections.find(s => s.type === "Coding");

    if (!mcqSection || !codingSection) {
      toast.error("Required sections missing");
      return;
    }

    const formData = new FormData();
    formData.append("Admin_id", adminId);
    formData.append("Test_Title", testName);

    if (mcqSection.file1) formData.append("MCQ_file", mcqSection.file1);
    formData.append("MCQ_duration", mcqSection.duration);

    if (codingSection.file1) formData.append("Coding_file", codingSection.file1);
    formData.append("Coding_duration", codingSection.duration);

    const sqlSection = sections.find(s => s.type === "SQL");
    if (sqlSection?.file1) formData.append("SQL_file", sqlSection.file1);
    if (sqlSection) formData.append("SQL_duration", sqlSection.duration);

    const gamingSection = sections.find(s => s.type === "Gaming");
    formData.append("Gaming_enabled", String(gamingEnabled));
    if (gamingSection) {
      formData.append("Gaming_duration_per_round", gamingSection.duration);
      formData.append("Gaming_rounds_count", gamingRounds);
    }

    try {
      for (const pair of formData.entries()) console.log(pair[0], pair[1]);

      const response = await fetch("http://127.0.0.1:8000/create-test", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to create test");

      const result = await response.json();
      const data = { test: { test_id: result } }
      toast.success("Test created successfully!");
      navigate("/preview-test", { state: data });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error creating test");
    }
  };

  const mcq = sections.find(s => s.type === 'MCQ')!;
  const coding = sections.find(s => s.type === 'Coding')!;
  const sql = sections.find(s => s.type === 'SQL')!;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <NavBar />

      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6">

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Assessment</h1>
        <div className="h-1 w-12 bg-orange-500 rounded-full mb-6" />

        {/* Step Wizard */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto">
          {steps.map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`text-sm font-semibold ${i === 0 ? 'text-orange-500 border-b-2 border-orange-500 pb-0.5' : 'text-gray-400'}`}>
                  {i + 1}. {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <svg className="w-4 h-4 text-gray-300 mx-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">

          {/* Assessment Title */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              placeholder="e.g., Summer Internship 2026"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
          </div>

          {/* Duration Row */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Mins)</label>
            <div className="grid grid-cols-3 gap-4">
              {[mcq, coding, sql].map((section) => (
                <div key={section.id} className=''>
                  <label className="block text-[10px] text-gray-500 mb-1">{section.type} Duration </label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent transition">
                    <input
                      type="number"
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-white w-full"
                      placeholder="e.g., 30"
                      value={section.duration}
                      onChange={(e) => handleDurationChange(section.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gaming Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Gaming Section</h3>
              <p className="text-xs text-gray-500">Enable decision-making simulations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={gamingEnabled} onChange={(e) => setGamingEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className={`flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100 transition-opacity duration-300 ${gamingEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">🧩</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Pipe Puzzle</p>
                  <p className="text-xs text-gray-500">Cognitive assessment simulation</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Rounds (1-3)</label>
                  <select
                    className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    value={gamingRounds}
                    onChange={(e) => setGamingRounds(e.target.value)}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Total Duration</label>
                  <div className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-800 font-semibold shadow-sm">
                    {(parseInt(gamingRounds) || 0) * 4} Mins
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Sections */}
        <div className="space-y-4">
          {/* MCQ */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-2">Upload MCQ Questions</p>
            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl py-7 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 group">
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e, mcq.id)} />
              <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-400 mb-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-gray-500 group-hover:text-orange-500 transition-colors">
                {mcq.file1 ? mcq.file1.name : 'Upload MCQ Questions'}
              </span>
            </label>
          </div>

          {/* Coding */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-2">Upload Coding Challenges</p>
            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl py-7 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 group">
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e, coding.id)} />
              <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-400 mb-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-gray-500 group-hover:text-orange-500 transition-colors">
                {coding.file1 ? coding.file1.name : 'Upload Coding Challenges'}
              </span>
            </label>
          </div>

          {/* SQL */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-2">Upload SQL Queries</p>
            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl py-7 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 group">
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e, sql.id)} />
              <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-400 mb-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-gray-500 group-hover:text-orange-500 transition-colors">
                {sql.file1 ? sql.file1.name : 'Upload SQL Queries'}
              </span>
            </label>
          </div>
        </div>

        {/* Next Step Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={!testName}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            Next Step
          </button>
        </div>
      </main>
    </div>
  );
};

export default TestCreator;