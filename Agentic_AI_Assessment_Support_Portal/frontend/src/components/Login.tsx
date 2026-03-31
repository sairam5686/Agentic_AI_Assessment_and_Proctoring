import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8003/login', {
        email,
        assessment_id: assessmentId
      });
      if (response.data.status === 'success') {
        localStorage.setItem('user_email', email);
        localStorage.setItem('assessment_id', assessmentId);
        navigate('/query');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="logo-container">
        <img src="https://pbs.twimg.com/profile_images/1973372506271584256/Sb4wfgD0_400x400.jpg" alt="Virtusa Logo" className="logo" />
      </div>
      <h2>Candidate Login</h2>
      <p className="subtitle">Enter your credentials to access the support portal</p>
      
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="e.g. candidate@example.com"
          />
        </div>
        <div className="form-group">
          <label>Assessment ID</label>
          <input 
            type="text" 
            value={assessmentId} 
            onChange={(e) => setAssessmentId(e.target.value)} 
            required 
            placeholder="Enter your assessment ID"
          />
        </div>
        
        {error && (
          <div className="error">
            <span>⚠️</span> {error}
          </div>
        )}
        
        <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Verifying...' : 'Proceed'}
        </button>
      </form>
    </div>
  );
};

export default Login;
