import React, { useState, type ChangeEvent } from 'react';
import NavBar from '../Components/NavBar';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

type SectionType = 'Coding' | 'MCQ' | 'SQL' | 'Gaming' | 'FITB';

interface Section {
  id: number;
  type: SectionType;
  name: string;
  duration: string;
  file1: File | null;
}

type AssessmentCategory = 'Hiring' | 'University' | 'Certification';

const steps = ['Basic Info', 'Gaming', 'MCQ', 'Coding', 'SQL', 'FITB', 'Review'];

const CERTIFICATION_TRACKS: Record<string, any> = {
  'Python Developer': { MCQ: true, Coding: true, SQL: false, FITB: true, Essay: true, Gaming: false },
  'Data Analyst': { MCQ: true, Coding: false, SQL: true, FITB: true, Essay: true, Gaming: false },
  'Full Stack Dev': { MCQ: true, Coding: true, SQL: true, FITB: false, Essay: false, Gaming: false },
  'Problem Solving': { MCQ: true, Coding: true, SQL: false, FITB: false, Essay: false, Gaming: true },
  'AI/ML Engineer': { MCQ: true, Coding: true, SQL: false, FITB: true, Essay: true, Gaming: false },
};

const TestCreator: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<AssessmentCategory>('Hiring');

  // University Fields State
  const [universityData, setUniversityData] = useState({
    examTitle: '',
    department: '',
    semester: '',
    subjectCode: '',
    examDate: '',
    duration: '180'
  });

  const [certificationData, setCertificationData] = useState({
    trackName: '',
    issuer: 'Virtusa - Jatayu Season 5',
    certificateTitle: 'Certificate of Achievement',
    globalThreshold: 60,
    sectionThresholds: {} as Record<string, number>
  });

  const [testName, setTestName] = useState<string>('');
  const [sections, setSections] = useState<Section[]>([
    { id: 1, type: 'Gaming', name: 'Gaming', duration: '4', file1: null },
    { id: 2, type: 'MCQ', name: 'MCQ', duration: '', file1: null },
    { id: 3, type: 'Coding', name: 'Coding', duration: '', file1: null },
    { id: 4, type: 'SQL', name: 'SQL', duration: '', file1: null },
    { id: 5, type: 'FITB', name: 'FITB', duration: '', file1: null },
  ]);

  const handleTrackChange = (trackName: string) => {
    const config = CERTIFICATION_TRACKS[trackName];
    if (!config) return;

    setCertificationData(prev => ({ ...prev, trackName }));
    setSectionEnabled({
      MCQ: config.MCQ,
      Coding: config.Coding,
      SQL: config.SQL,
      FITB: config.FITB,
      Gaming: config.Gaming
    });
    setEssayEnabled(config.Essay);
  };
  const [gamingEnabled, setGamingEnabled] = useState<boolean>(true);
  const [gamingRounds, setGamingRounds] = useState<string>('3');
  const [uniStep, setUniStep] = useState<number>(1);
  const [certStep, setCertStep] = useState<number>(1);

  // Essay state — dynamic rubric
  const [essayEnabled, setEssayEnabled] = useState<boolean>(false);
  const [essayTopic, setEssayTopic] = useState<string>('');
  const [essayDuration, setEssayDuration] = useState<string>('30');

  interface RubricSection {
    key: string;
    name: string;
    max_marks: number;
    criteria: string[];
  }

  const DEFAULT_RUBRIC: RubricSection[] = [
    {
      key: 'introduction',
      name: 'Introduction',
      max_marks: 10,
      criteria: [
        'Clearly introduces the topic',
        'States purpose of essay',
        'Mentions specific industry or context',
      ],
    },
    {
      key: 'industry_overview',
      name: 'Industry Overview',
      max_marks: 10,
      criteria: [
        'Explains the industry clearly',
        'Covers key characteristics',
        'Mentions current challenges',
      ],
    },
    {
      key: 'impact_analysis',
      name: 'Impact Analysis',
      max_marks: 10,
      criteria: [
        'Covers positive impacts',
        'Covers risks and challenges',
        'Provides concrete examples',
      ],
    },
    {
      key: 'future_predictions',
      name: 'Future Predictions',
      max_marks: 10,
      criteria: [
        'Predicts future trends',
        'Provides justification for predictions',
      ],
    },
    {
      key: 'conclusion',
      name: 'Conclusion',
      max_marks: 10,
      criteria: [
        'Summarizes key points effectively',
        'Ends with a clear, forward-looking insight',
      ],
    },
  ];

  const [rubricSections, setRubricSections] = useState<RubricSection[]>(DEFAULT_RUBRIC);
  const [expandedRubricKey, setExpandedRubricKey] = useState<string | null>(null);

  const updateRubricSection = (key: string, field: keyof RubricSection, value: any) => {
    setRubricSections(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
  };

  const updateCriterion = (sectionKey: string, idx: number, value: string) => {
    setRubricSections(prev => prev.map(s => {
      if (s.key !== sectionKey) return s;
      const updated = [...s.criteria];
      updated[idx] = value;
      return { ...s, criteria: updated };
    }));
  };

  const addCriterion = (sectionKey: string) => {
    setRubricSections(prev => prev.map(s =>
      s.key === sectionKey ? { ...s, criteria: [...s.criteria, ''] } : s
    ));
  };

  const removeCriterion = (sectionKey: string, idx: number) => {
    setRubricSections(prev => prev.map(s =>
      s.key === sectionKey ? { ...s, criteria: s.criteria.filter((_, i) => i !== idx) } : s
    ));
  };

  const totalRubricMarks = rubricSections.reduce((sum, s) => sum + (s.max_marks || 0), 0);

  // Per-section enabled toggles
  const [sectionEnabled, setSectionEnabled] = useState<Record<SectionType, boolean>>({
    MCQ:    true,
    Coding: true,
    SQL:    true,
    FITB:   true,
    Gaming: true,
  });

  const toggleSection = (type: SectionType) =>
    setSectionEnabled(prev => ({ ...prev, [type]: !prev[type] }));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, sectionId: number) => {
    const file = e.target.files?.[0] || null;
    setSections(sections.map(s => s.id === sectionId ? { ...s, file1: file } : s));
  };

  const handleDurationChange = (sectionId: number, value: string) => {
    setSections(sections.map(s => s.id === sectionId ? { ...s, duration: value } : s));
  };

  const handleSubmit = async () => {
    const adminId = "MexicanMonster";
    const mcqSection = sections.find(s => s.type === "MCQ")!;
    const codingSection = sections.find(s => s.type === "Coding")!;

    const formData = new FormData();
    formData.append("Admin_id", adminId);
    // Certification specific
    if (selectedCategory === 'Certification') {
      formData.append("Test_Title", certificationData.trackName);
      formData.append("Certification_Track", certificationData.trackName);
      formData.append("Certification_Issuer", certificationData.issuer);
      formData.append("Certification_Title", certificationData.certificateTitle);
      formData.append("Certification_Thresholds", JSON.stringify(certificationData.sectionThresholds));
      formData.append("Certification_Global_Threshold", String(certificationData.globalThreshold));
    } else {
      formData.append("Test_Title", testName);
    }
    formData.append("Category", selectedCategory);

    if (selectedCategory === 'University') {
      formData.append("Department", universityData.department);
      formData.append("Semester", universityData.semester);
      formData.append("Subject_Code", universityData.subjectCode);
      formData.append("Regulation", universityData.regulation);
      formData.append("Subject_Name", universityData.subjectName);
    }

    if (mcqSection.file1 && sectionEnabled.MCQ) formData.append("MCQ_file", mcqSection.file1);
    if (sectionEnabled.MCQ) formData.append("MCQ_duration", mcqSection.duration);

    if (codingSection.file1 && sectionEnabled.Coding) formData.append("Coding_file", codingSection.file1);
    if (sectionEnabled.Coding) formData.append("Coding_duration", codingSection.duration);

    const sqlSection = sections.find(s => s.type === "SQL");
    if (sqlSection?.file1 && sectionEnabled.SQL) formData.append("SQL_file", sqlSection.file1);
    if (sqlSection && sectionEnabled.SQL) formData.append("SQL_duration", sqlSection.duration);

    const fitbSection = sections.find(s => s.type === "FITB");
    if (fitbSection?.file1 && sectionEnabled.FITB) formData.append("FITB_file", fitbSection.file1);
    if (fitbSection && sectionEnabled.FITB) formData.append("FITB_duration", fitbSection.duration);

    const gamingSection = sections.find(s => s.type === "Gaming");
    const isUni = selectedCategory === 'University';
    formData.append("Gaming_enabled", String(isUni ? false : gamingEnabled));
    if (gamingSection && !isUni) {
      formData.append("Gaming_duration_per_round", gamingSection.duration);
      formData.append("Gaming_rounds_count", gamingRounds);
    }

    // Essay section
    formData.append("Essay_enabled", String(essayEnabled));
    if (essayEnabled) {
      formData.append("Essay_topic", essayTopic);
      formData.append("Essay_duration", essayDuration);
      // Build rubric object: { sections: { [key]: { name, max_marks, criteria } } }
      const rubricPayload: Record<string, { name: string; max_marks: number; criteria: string[] }> = {};
      rubricSections.forEach(s => {
        rubricPayload[s.key] = { name: s.name, max_marks: s.max_marks, criteria: s.criteria.filter(c => c.trim() !== '') };
      });
      formData.append("Essay_rubric", JSON.stringify({ sections: rubricPayload }));
    }

    try {
      const response = await fetch("http://localhost:8000/create-test", {
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
  const fitb = sections.find(s => s.type === 'FITB')!;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <NavBar />
      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Assessment</h1>
        <div className="h-1 w-12 bg-orange-500 rounded-full mb-6" />

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

        {(selectedCategory === 'Hiring' || (selectedCategory === 'Certification' && certStep === 2)) && (
          <>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
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

            <div className="space-y-4">
              {([
                { section: mcq,    label: 'MCQ Questions',      color: 'blue',    sublabel: 'Multiple choice question bank',    type: 'MCQ'    as SectionType },
                { section: coding, label: 'Coding Challenges',  color: 'indigo',  sublabel: 'Algorithm & programming tasks',    type: 'Coding' as SectionType },
                { section: sql,    label: 'SQL Queries',        color: 'emerald', sublabel: 'Database query challenges',        type: 'SQL'    as SectionType },
                { section: fitb,   label: 'Fill in the Blanks', color: 'amber',   sublabel: 'Vocabulary and concept recall',    type: 'FITB'   as SectionType },
              ] as { section: Section; label: string; color: string; sublabel: string; type: SectionType }[]).map(({ section, label, color, sublabel, type }) => {
                const enabled = sectionEnabled[type];
                return (
                  <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">{label}</h3>
                        <p className="text-xs text-gray-500">{sublabel}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={enabled} onChange={() => toggleSection(type)} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                      </label>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className={`flex items-center justify-between p-4 bg-${color}-50 rounded-xl border border-${color}-100 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{label}</p>
                          <p className="text-xs text-gray-500">{sublabel}</p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Question File</label>
                            <label className={`flex items-center gap-2 px-3 py-1.5 border-2 border-dashed ${section.file1 ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'} rounded-lg cursor-pointer transition-all`}>
                              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e, section.id)} />
                              <svg className={`w-4 h-4 shrink-0 ${section.file1 ? 'text-orange-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span className={`text-xs font-bold truncate max-w-[130px] ${section.file1 ? 'text-orange-700' : 'text-gray-400'}`}>
                                {section.file1 ? section.file1.name : 'Choose .xlsx'}
                              </span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Duration</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                placeholder="Mins"
                                value={section.duration}
                                onChange={(e) => handleDurationChange(section.id, e.target.value)}
                              />
                              <span className="text-[10px] text-gray-500 font-bold uppercase">Mins</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══ Essay / Long Answer — Dynamic Rubric Builder ═══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Essay / Long Answer</h3>
                  <p className="text-xs text-gray-500">AI-evaluated with a custom rubric you define below</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={essayEnabled} onChange={(e) => setEssayEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
                </label>
              </div>

              <div className={`space-y-4 pt-4 border-t border-gray-100 transition-opacity duration-300 ${essayEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>

                {/* Topic + Duration row */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Essay Topic / Prompt</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      placeholder="e.g., Impact of Generative AI on the Healthcare Industry"
                      value={essayTopic}
                      onChange={(e) => setEssayTopic(e.target.value)}
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Duration</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                        placeholder="Mins"
                        value={essayDuration}
                        onChange={(e) => setEssayDuration(e.target.value)}
                      />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Mins</span>
                    </div>
                  </div>
                </div>

                {/* Rubric builder header */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Evaluation Rubric</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Gemini will evaluate each section using these criteria</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                    totalRubricMarks === 50
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    Total: {totalRubricMarks} / 50 marks
                  </span>
                </div>

                {/* Rubric sections */}
                <div className="space-y-2">
                  {rubricSections.map((section, sIdx) => {
                    const isOpen = expandedRubricKey === section.key;
                    const sectionColors = [
                      { bg: 'bg-indigo-50',  border: 'border-indigo-200',  badge: 'bg-indigo-100 text-indigo-700',  accent: 'text-indigo-600',  ring: 'focus:ring-indigo-300'  },
                      { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',      accent: 'text-blue-600',    ring: 'focus:ring-blue-300'    },
                      { bg: 'bg-orange-50',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700',  accent: 'text-orange-600',  ring: 'focus:ring-orange-300'  },
                      { bg: 'bg-purple-50',  border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700',  accent: 'text-purple-600',  ring: 'focus:ring-purple-300'  },
                      { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700',accent: 'text-emerald-600', ring: 'focus:ring-emerald-300' },
                    ];
                    const sc = sectionColors[sIdx % sectionColors.length];
                    return (
                      <div key={section.key} className={`rounded-xl border ${sc.border} ${sc.bg} overflow-hidden`}>
                        {/* Section row header */}
                        <button
                          type="button"
                          onClick={() => setExpandedRubricKey(isOpen ? null : section.key)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${sc.badge}`}>
                            {sIdx + 1}
                          </span>

                          {/* Editable section name */}
                          <input
                            type="text"
                            value={section.name}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateRubricSection(section.key, 'name', e.target.value)}
                            className={`flex-1 bg-transparent text-sm font-bold text-gray-800 border-none outline-none focus:bg-white/70 focus:rounded px-1 ${sc.ring}`}
                          />

                          {/* Max marks */}
                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={section.max_marks}
                              onChange={e => updateRubricSection(section.key, 'max_marks', parseInt(e.target.value) || 0)}
                              className={`w-12 px-2 py-0.5 text-sm font-black text-center border border-gray-300 rounded-lg bg-white focus:outline-none ${sc.ring} focus:ring-2`}
                            />
                            <span className="text-[10px] text-gray-500 font-bold">marks</span>
                          </div>

                          <span className={`text-xs ${sc.accent} ml-1`}>{isOpen ? '▲' : '▼'}</span>
                        </button>

                        {/* Expanded: criteria list */}
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/60">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Grading Criteria — Gemini checks each of these</p>
                            {section.criteria.map((criterion, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs shrink-0">•</span>
                                <input
                                  type="text"
                                  value={criterion}
                                  onChange={e => updateCriterion(section.key, cIdx, e.target.value)}
                                  placeholder="e.g., Clearly introduces the topic..."
                                  className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeCriterion(section.key, cIdx)}
                                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                                >×</button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addCriterion(section.key)}
                              className={`mt-1 flex items-center gap-1.5 text-[11px] font-bold ${sc.accent} hover:underline`}
                            >
                              <span className="text-base leading-none">+</span> Add criterion
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { icon: '💡', label: 'Specific improvement suggestions per section' },
                    { icon: '🔍', label: 'Originality & generic writing detection' },
                    { icon: '✨', label: 'Strengths highlighted per section' },
                  ].map(f => (
                    <span key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-lg text-[10px] font-bold text-violet-700">
                      <span>{f.icon}</span>{f.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {selectedCategory === 'University' && (
          <div className="space-y-6">
            {uniStep === 1 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🎓 University Exam Details
                </h3>
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
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <button 
                    onClick={() => setUniStep(1)}
                    className="text-orange-500 text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    ← Back to Details
                  </button>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Question Uploads</span>
                </div>
                {([
                  { section: mcq,    label: 'MCQ Questions',      color: 'blue',    sublabel: 'Multiple choice question bank',    type: 'MCQ'    as SectionType },
                  { section: coding, label: 'Coding Challenges',  color: 'indigo',  sublabel: 'Algorithm & programming tasks',    type: 'Coding' as SectionType },
                  { section: sql,    label: 'SQL Queries',        color: 'emerald', sublabel: 'Database query challenges',        type: 'SQL'    as SectionType },
                  { section: fitb,   label: 'Fill in the Blanks', color: 'amber',   sublabel: 'Vocabulary and concept recall',    type: 'FITB'   as SectionType },
                ] as { section: Section; label: string; color: string; sublabel: string; type: SectionType }[]).map(({ section, label, color, sublabel, type }) => {
                  const enabled = sectionEnabled[type];
                  return (
                    <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800">{label}</h3>
                          <p className="text-xs text-gray-500">{sublabel}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={enabled} onChange={() => toggleSection(type)} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
                        </label>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className={`flex items-center justify-between p-4 bg-${color}-50 rounded-xl border border-${color}-100 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{label}</p>
                            <p className="text-xs text-gray-500">{sublabel}</p>
                          </div>
                          <div className="flex items-center gap-8">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Question File</label>
                              <label className={`flex items-center gap-2 px-3 py-1.5 border-2 border-dashed ${section.file1 ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'} rounded-lg cursor-pointer transition-all`}>
                                <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFileChange(e, section.id)} />
                                <svg className={`w-4 h-4 shrink-0 ${section.file1 ? 'text-orange-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className={`text-xs font-bold truncate max-w-[130px] ${section.file1 ? 'text-orange-700' : 'text-gray-400'}`}>
                                  {section.file1 ? section.file1.name : 'Choose .xlsx'}
                                </span>
                              </label>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Duration</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                  placeholder="Mins"
                                  value={section.duration}
                                  onChange={(e) => handleDurationChange(section.id, e.target.value)}
                                />
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Mins</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedCategory === 'Certification' && certStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner">📜</div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">Professional Certification Designer</h3>
                  <p className="text-sm text-gray-500 font-medium">Define the standards for your industry-grade certification</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-left">Certification Track Name</label>
                    <div className="relative">
                      <select
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 appearance-none"
                        value={certificationData.trackName}
                        onChange={(e) => handleTrackChange(e.target.value)}
                      >
                        <option value="">Select a Certification Track</option>
                        {Object.keys(CERTIFICATION_TRACKS).map(track => (
                          <option key={track} value={track}>{track}</option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-2 h-2 border-b-2 border-r-2 border-gray-400 rotate-45" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-left">Issuing Authority</label>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-400 outline-none transition-all"
                      placeholder="e.g. Virtusa - Jatayu Season 5"
                      value={certificationData.issuer}
                      onChange={(e) => setCertificationData({...certificationData, issuer: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-3">
                      <span className="px-2 py-1 bg-blue-500 text-[8px] font-black text-white rounded uppercase">Preview</span>
                   </div>
                   <div className="w-full border-4 border-double border-gray-300 p-4 bg-white shadow-sm flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full mb-2 flex items-center justify-center text-[10px] text-white font-bold">V</div>
                      <h4 className="text-[10px] font-black uppercase tracking-tighter text-blue-900">{certificationData.certificateTitle}</h4>
                      <div className="w-12 h-[1px] bg-gray-200 my-2" />
                      <p className="text-[7px] text-gray-400 uppercase tracking-widest font-bold">This is to certify that</p>
                      <p className="text-[12px] font-serif italic my-1 text-gray-800">Candidate Name</p>
                      <p className="text-[7px] text-gray-400 uppercase tracking-widest font-bold">has successfully cleared the</p>
                      <p className="text-[9px] font-black text-gray-700">{certificationData.trackName || 'Certification Track'}</p>
                   </div>
                </div>
              </div>

              <div className="mt-10">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider">Passing Standards (%)</h4>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Global Cutoff:</span>
                    <input 
                      type="number" 
                      value={certificationData.globalThreshold}
                      onChange={(e) => setCertificationData({...certificationData, globalThreshold: Number(e.target.value)})}
                      className="w-10 bg-transparent text-xs font-black text-blue-700 outline-none text-center"
                    />
                    <span className="text-[10px] font-black text-blue-600">%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'mcq', label: 'MCQ Concepts', enabled: sectionEnabled.MCQ },
                    { key: 'coding', label: 'Coding Lab', enabled: sectionEnabled.Coding },
                    { key: 'sql', label: 'SQL Mastery', enabled: sectionEnabled.SQL },
                    { key: 'fitb', label: 'Theory (FITB)', enabled: sectionEnabled.FITB },
                    { key: 'essay', label: 'Strategic Essay', enabled: essayEnabled },
                    { key: 'gaming', label: 'Problem Solving', enabled: sectionEnabled.Gaming },
                  ].map((sec) => (
                    <div key={sec.key} className={`p-4 rounded-xl border-2 transition-all ${sec.enabled ? 'border-blue-100 bg-white shadow-sm' : 'border-gray-50 bg-gray-50/50 opacity-40 grayscale pointer-events-none'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sec.label}</span>
                        {sec.enabled && <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />}
                      </div>
                      <div className="flex items-end gap-1">
                        <input
                          type="number"
                          className="w-full text-2xl font-black text-gray-800 bg-transparent outline-none border-b-2 border-gray-100 focus:border-blue-400 transition-colors"
                          value={certificationData.sectionThresholds[sec.key] || certificationData.globalThreshold}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCertificationData({
                              ...certificationData,
                              sectionThresholds: { ...certificationData.sectionThresholds, [sec.key]: val }
                            });
                          }}
                        />
                        <span className="text-sm font-black text-gray-400 mb-1">%</span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 mt-2">Required to pass section</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-8">
          {(selectedCategory === 'University' && uniStep === 2) && (
            <button
              onClick={() => setUniStep(1)}
              className="px-8 py-3 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-all"
            >
              Back: Edit Info
            </button>
          )}

          {(selectedCategory === 'Certification' && certStep === 2) && (
            <button
              onClick={() => setCertStep(1)}
              className="px-8 py-3 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition-all"
            >
              Back: Edit Certificate
            </button>
          )}

          {selectedCategory === 'University' && uniStep === 1 ? (
            <button
              onClick={() => setUniStep(2)}
              disabled={!universityData.examTitle || !universityData.department || !universityData.subjectCode}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              Next: Add Questions
            </button>
          ) : selectedCategory === 'Certification' && certStep === 1 ? (
            <button
              onClick={() => setCertStep(2)}
              disabled={!certificationData.trackName || !certificationData.issuer}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              Next: Add Questions
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={
                selectedCategory === 'Hiring' ? !testName : 
                selectedCategory === 'Certification' ? !certificationData.trackName :
                !universityData.examTitle
              }
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              {selectedCategory === 'University' ? 'Create University Exam' : 
               selectedCategory === 'Certification' ? 'Deploy Certification' : 'Next Step'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestCreator;