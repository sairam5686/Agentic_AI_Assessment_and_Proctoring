import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileCheck,
  X,
  ChevronRight,
  File as FileIcon,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router';

const StartTest = () => {
  const location = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get assessment_id from location state or fallback to URL parsing if necessary
  const assessmentId = location.state?.assessment_id || location.state?.test?.test_id;

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Only .xlsx files are allowed');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
    setIsSaved(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const handleSave = async () => {
    if (!file || !assessmentId) {
      toast.error("Assessment ID or File missing");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assessment_id', assessmentId);

      const response = await fetch('http://localhost:8000/save-test', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to save file');

      setIsSaved(true);
      toast.success('Candidate list saved successfully.');
    } catch {
      setError('Error saving file. Please try again.');
      toast.error('Failed to save candidate list.');
      setIsSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  const navigate = useNavigate();

  const handleInitiateTest = async () => {
    if (!assessmentId) return;
    // Navigate to deployment progress page
    navigate('/deploy-success', { state: { assessmentId } });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 relative overflow-hidden">
      {/* Decorative background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-white overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-10 py-10 relative">

            <div className="flex items-center gap-5 relative z-10">
              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30"
              >
                <FileCheck className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Enroll Candidates</h2>
                <p className="text-blue-100/80 text-sm font-medium mt-1">Ready to launch your assessment?</p>
              </div>
            </div>
          </div>

          <div className="px-10 py-10 space-y-8">
            {/* Drop Zone */}
            <motion.div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`relative cursor-pointer rounded-[2rem] border-2 border-dashed p-10 text-center transition-all duration-300 ${isDragging
                ? 'border-blue-500 bg-blue-50/50 shadow-inner'
                : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5'
                }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file-info"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-200/50">
                      <FileIcon size={32} />
                    </div>
                    <div className="text-center w-full px-4">
                      <p className="text-base font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-3 py-1 rounded-full inline-block mt-2">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); setFile(null); setIsSaved(false); setError(null); }}
                      className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="drop-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-lg shadow-blue-200/50">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-700">
                        {isDragging ? 'Release to upload' : 'Upload Candidate List'}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-1">Excel (.xlsx) files up to 10MB</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Status Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 text-sm px-5 py-4 rounded-[1.5rem]"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="font-semibold">{error}</span>
                </motion.div>
              )}

              {isSaved && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-5 py-4 rounded-[1.5rem]"
                >
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span className="font-semibold">Candidate list captured successfully!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Steps Visualizer */}
            <div className="flex items-center px-2">
              {[
                { label: 'Upload', done: !!file },
                { label: 'Verify', done: isSaved },
                { label: 'Deploy', done: false },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 z-10 ${step.done
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                      : 'bg-slate-100 text-slate-400 scale-90'
                      }`}>
                      {step.done ? <FileCheck size={14} strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-black transition-colors duration-500 ${step.done ? 'text-blue-600' : 'text-slate-300'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-12 h-[3px] bg-slate-100 rounded-full mt-[-18px] z-0 overflow-hidden relative">
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: step.done ? '0%' : '-100%' }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="absolute inset-0 bg-blue-400"
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Actions */}
            <div className="grid gap-4">
              <motion.button
                onClick={handleSave}
                disabled={!file || isSaving || isSaved}
                whileHover={!file || isSaving || isSaved ? {} : { scale: 1.02 }}
                whileTap={!file || isSaving || isSaved ? {} : { scale: 0.98 }}
                className={`w-full py-4 rounded-2xl text-sm font-black tracking-wide transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden ${!file || isSaving || isSaved
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-900/10'
                  }`}
              >
                {isSaving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Loader2 size={18} />
                  </motion.div>
                ) : isSaved ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Upload size={18} />
                )}
                {isSaving ? 'Processing...' : isSaved ? 'Verified' : 'Verify & Store List'}
              </motion.button>

              <motion.button
                onClick={handleInitiateTest}
                disabled={!isSaved}
                whileHover={!isSaved ? {} : { scale: 1.02, x: 5 }}
                whileTap={!isSaved ? {} : { scale: 0.98 }}
                className={`w-full py-4 rounded-2xl text-sm font-black tracking-wide transition-all duration-500 flex items-center justify-center gap-3 group overflow-hidden ${!isSaved
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span>Deploy Assessment</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 mt-8 text-slate-400"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Secure Cloud Protocol Active</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default StartTest;