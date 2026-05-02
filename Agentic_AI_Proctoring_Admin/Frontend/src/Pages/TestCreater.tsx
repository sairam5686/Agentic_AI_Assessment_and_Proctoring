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

type AssessmentCategory = 'Hiring' | 'University' | 'Certification';

const steps = ['Basic Info', 'Gaming', 'MCQ', 'Coding', 'SQL', 'Review'];



const TestCreator: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<AssessmentCategory>('Hiring');

  // University Fields State
  const [universityData, setUniversityData] = useState({
    department: '',
    semester: '',
    subjectCode: '',
    regulation: '',
    subjectName: '',
    examTitle: ''
  });

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

        {/* Category Selection Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { id: 'Hiring', title: 'Hiring Assessment', icon: '💼' },
            { id: 'University', title: 'University Exam', icon: '🎓' },
            { id: 'Certification', title: 'Skills Certification', icon: '📜' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as AssessmentCategory)}
              className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                selectedCategory === cat.id 
                ? 'border-orange-500 bg-orange-50 shadow-md transform scale-[1.02]' 
                : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className={`text-sm font-bold ${selectedCategory === cat.id ? 'text-orange-600' : 'text-gray-600'}`}>
                {cat.title}
              </span>
            </button>
          ))}
        </div>

        {/* Hiring Assessment Section */}
        {selectedCategory === 'Hiring' && (
          <>
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
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                  placeholder="e.g., Summer Internship 2026"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
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
              {[
                { section: mcq, label: 'MCQ Questions', icon: '📝', color: 'blue' },
                { section: coding, label: 'Coding Challenges', icon: '💻', color: 'indigo' },
                { section: sql, label: 'SQL Queries', icon: '📊', color: 'emerald' }
              ].map(({ section, label, icon, color }) => (
                <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center justify-between group hover:shadow-md transition-all">
                  {/* Left: Icon and Title */}
                  <div className="flex items-center gap-4 w-1/3">
                    <div className={`w-12 h-12 bg-${color}-50 text-${color}-600 rounded-xl flex items-center justify-center text-2xl shadow-sm`}>
                      {icon}
                    </div>
                    <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{label}</p>
                  </div>

                  {/* Center: Styled Upload Button */}
                  <div className="flex-1 flex justify-center px-4">
                    <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed ${section.file1 ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'} rounded-xl cursor-pointer transition-all group/upload max-w-[220px] w-full overflow-hidden`}>
                      <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e, section.id)} />
                      <svg className={`w-4 h-4 ${section.file1 ? 'text-orange-600' : 'text-gray-400 group-hover/upload:text-orange-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className={`text-xs font-bold truncate ${section.file1 ? 'text-orange-700' : 'text-gray-400 group-hover/upload:text-orange-600'}`}>
                        {section.file1 ? section.file1.name : 'Choose File (.xlsx)'}
                      </span>
                    </label>
                  </div>

                  {/* Right: Duration Input */}
                  <div className="flex items-center gap-4 pl-6 border-l border-gray-100 w-1/4 justify-end">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Duration</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 text-center text-sm font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition bg-gray-50"
                          placeholder="Min"
                          value={section.duration}
                          onChange={(e) => handleDurationChange(section.id, e.target.value)}
                        />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Mins</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* University Exams Section */}
        {selectedCategory === 'University' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                🎓 University Exam Details
              </h3>
              
              {/* Exam Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition"
                  placeholder="e.g., Semester End Examinations - Nov/Dec 2024"
                  value={universityData.examTitle}
                  onChange={(e) => setUniversityData({...universityData, examTitle: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition"
                    value={universityData.department}
                    onChange={(e) => setUniversityData({...universityData, department: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    <option value="CSE">Computer Science Engineering (CSE)</option>
                    <option value="AIML">AI & Machine Learning (AIML)</option>
                    <option value="AIDS">AI & Data Science (AIDS)</option>
                    <option value="ECE">Electronics and Communication (ECE)</option>
                    <option value="EEE">Electrical and Electronics (EEE)</option>
                    <option value="MECH">Mechanical Engineering (MECH)</option>
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition"
                    value={universityData.semester}
                    onChange={(e) => setUniversityData({...universityData, semester: e.target.value})}
                  >
                    <option value="">Select Semester</option>
                    {[...Array(8)].map((_, i) => (
                      <option key={i} value={`0${i + 1}`}>Semester 0{i + 1}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition"
                    placeholder="e.g., CS3351"
                    value={universityData.subjectCode}
                    onChange={(e) => setUniversityData({...universityData, subjectCode: e.target.value})}
                  />
                </div>

                {/* Regulation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regulations</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition"
                    value={universityData.regulation}
                    onChange={(e) => setUniversityData({...universityData, regulation: e.target.value})}
                  >
                    <option value="">Select Regulation</option>
                    <option value="2017">Regulation 2017</option>
                    <option value="2021">Regulation 2021</option>
                    <option value="2023">Regulation 2023</option>
                  </select>
                </div>
              </div>

              {/* Subject Name */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition"
                  placeholder="e.g., Data Structures and Algorithms"
                  value={universityData.subjectName}
                  onChange={(e) => setUniversityData({...universityData, subjectName: e.target.value})}
                />
              </div>
            </div>

          </div>
        )}

        {/* Skills Certification Section */}
        {selectedCategory === 'Certification' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📜</div>
            <h3 className="text-xl font-bold text-gray-800">Skills Certification Portal</h3>
            <p className="text-gray-500 mt-2">This feature is coming soon to the platform.</p>
          </div>
        )}

        {/* Next Step Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={selectedCategory === 'Hiring' ? !testName : !universityData.examTitle}
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