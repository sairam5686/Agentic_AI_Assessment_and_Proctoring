import React, { useState } from 'react';
import { useNavigate } from 'react-router';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    localStorage.removeItem('assessment_completed');
    localStorage.removeItem('assessment_started');
    localStorage.removeItem('mcq_completed');
    localStorage.removeItem('coding_completed');
    localStorage.removeItem('sql_completed');
    sessionStorage.removeItem('system_check_passed');

    try {
      const response = await fetch('http://127.0.0.1:8000/candidate/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, assessment_id: assessmentId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store all candidate details in localStorage
        localStorage.setItem('candidate_name', data.user_name);
        localStorage.setItem('candidate_email', data.email);
        localStorage.setItem('assessment_id', data.assessment_id);
        localStorage.setItem('roll_number', data.roll_number);
        localStorage.setItem('candidate_id', data.candidate_id);
        localStorage.setItem('department', data.department);

        // Redirect to environment validation (SystemCheck)
        navigate('/system-check');
      } else {
        setError(data.detail || 'Login failed. Please check your email and password.');
      }
    } catch (err) {
      setError('Connection error. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc to-[#01F965] ] flex flex-col items-center justify-center p-6 font-['Inter']">
      {/* Logo */}
      <div className="mb-8">
        <img src="https://pbs.twimg.com/profile_images/1973372506271584256/Sb4wfgD0_400x400.jpg"  alt="Virtusa" className="h-10 rounded-xl" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Candidate Login</h1>
          <p className="text-gray-500 text-sm">Enter your credentials to start the assessment</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="e.g. candidate@example.com"
              className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all duration-200 text-gray-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
            <input
              type="text"
              required
              placeholder="Enter your password"
              className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all duration-200 text-gray-800 font-mono"
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-medium p-4 rounded-xl flex items-center gap-2 border border-red-100 animate-shake">
              <span className="text-sm">⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 mt-4"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              'Launch Assessment'
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-400 leading-relaxed max-w-[240px] mx-auto">
            Secure browser environment will be initialized upon login.
          </p>
        </div>
      </div>

      {/* Footer */}
    
      <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
            `}</style>
    </div>
  );
};

export default UserLogin;
