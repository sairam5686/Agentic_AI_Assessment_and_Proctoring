import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const QueryForm: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const email = localStorage.getItem('user_email');
  const assessmentId = localStorage.getItem('assessment_id');

  useEffect(() => {
    if (!email || !assessmentId) {
      navigate('/');
    }
  }, [email, assessmentId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8003/submit-query', {
        email,
        assessment_id: assessmentId,
        query
      });
      if (response.data.status === 'success') {
        navigate('/thank-you');
      }
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        setError('Submission rate limit reached. Please wait a few seconds.');
      } else {
        setError(err.response?.data?.detail || 'Submission failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="logo-container">
        <img src="https://pbs.twimg.com/profile_images/1973372506271584256/Sb4wfgD0_400x400.jpg" alt="Virtusa Logo" className="logo" />
      </div>
      <h2>Submit Your Query</h2>
      <p className="subtitle">Raising query for Assessment: {assessmentId}</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Detailed Query</label>
          <textarea 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            required 
            rows={5}
            placeholder="Describe your query or reason for appeal here..."
          />
        </div>
        
        {error && (
          <div className="error">
            <span>⚠️</span> {error}
          </div>
        )}
        
        <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Submitting...' : 'Submit Query'}
        </button>
      </form>
    </div>
  );
};

export default QueryForm;
