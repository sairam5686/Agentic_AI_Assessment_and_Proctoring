import React from 'react';
import { useNavigate } from 'react-router-dom';

const ThankYou: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="logo-container">
        <img src="https://pbs.twimg.com/profile_images/1973372506271584256/Sb4wfgD0_400x400.jpg" alt="Virtusa Logo" className="logo" />
      </div>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
      <h2>Thank You!</h2>
      <p className="subtitle" style={{ marginTop: '1rem', lineHeight: '1.6' }}>
        Our team will consider this query and respond to you. 
        A detailed AI-analyzed report will be sent to your email shortly.
      </p>
      
      <button 
        onClick={() => {
          localStorage.clear();
          navigate('/');
        }}
        style={{ marginTop: '1.5rem' }}
      >
        Back to Login
      </button>
    </div>
  );
};

export default ThankYou;
