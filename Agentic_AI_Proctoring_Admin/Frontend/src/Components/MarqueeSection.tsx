import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// --- Icons (inline SVG paths) ---
const icons = {
  Schools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  University: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L2 9l10 6 10-6-10-6z" />
      <path d="M2 9v6" />
      <path d="M6 11v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
    </svg>
  ),
  Marketing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  IT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  Enterprise: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  ),
  Finance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  'Health Care': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  'Online Exams': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  ),
  'Real-Time Proctoring': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="19" cy="5" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  'Mobile Monitoring': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2.5} />
    </svg>
  ),
  'Skill Evaluation': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  'Code Engine': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  'Behaviour Analysis': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M6 20V10M12 20V4M18 20v-8" />
    </svg>
  ),
};

// --- Color accent map ---
const accentMap = {
  Schools: { bg: '#f0f0f0', icon: '#111', dot: '#111' },
  University: { bg: '#fff0f0', icon: '#dc2626', dot: '#dc2626' },
  Marketing: { bg: '#eff6ff', icon: '#2563eb', dot: '#2563eb' },
  IT: { bg: '#f0fdf4', icon: '#16a34a', dot: '#16a34a' },
  Enterprise: { bg: '#fff7ed', icon: '#ea580c', dot: '#ea580c' },
  Finance: { bg: '#fff1f2', icon: '#e11d48', dot: '#e11d48' },
  'Health Care': { bg: '#f0f0f0', icon: '#111', dot: '#111' },
  'Online Exams': { bg: '#eef2ff', icon: '#4f46e5', dot: '#4f46e5' },
  'Real-Time Proctoring': { bg: '#f0f0f0', icon: '#111', dot: '#111' },
  'Mobile Monitoring': { bg: '#fefce8', icon: '#ca8a04', dot: '#ca8a04' },
  'Skill Evaluation': { bg: '#faf5ff', icon: '#7c3aed', dot: '#7c3aed' },
  'Code Engine': { bg: '#ecfdf5', icon: '#059669', dot: '#059669' },
  'Behaviour Analysis': { bg: '#f0fdf4', icon: '#16a34a', dot: '#16a34a' },
};

// --- Row data ---
const row1 = [
  { name: 'Schools' },
  { name: 'University' },
  { name: 'Marketing' },
  { name: 'IT' },
  { name: 'Enterprise' },
  { name: 'Finance' },
  { name: 'Health Care' },
];

const row2 = [
  { name: 'Online Exams' },
  { name: 'Real-Time Proctoring' },
  { name: 'Mobile Monitoring' },
  { name: 'Skill Evaluation' },
  { name: 'Code Engine' },
  { name: 'Behaviour Analysis' },
];

// --- Pill Component ---
const LogoPill = ({ name }) => {
  const [hovered, setHovered] = useState(false);
  const accent = accentMap[name] || { bg: '#f5f5f5', icon: '#555', dot: '#555' };
  const icon = icons[name];

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        y: hovered ? -3 : 0,
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.10)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        borderColor: hovered ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)',
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 20px 10px 14px',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '999px',
        cursor: 'default',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {/* Icon container */}
      <motion.div
        animate={{
          backgroundColor: hovered ? accent.bg : '#f5f5f5',
        }}
        transition={{ duration: 0.2 }}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ color: hovered ? accent.icon : '#888' }}
          transition={{ duration: 0.2 }}
          style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {icon}
        </motion.div>
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{ color: hovered ? '#111' : '#555' }}
        transition={{ duration: 0.2 }}
        style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', fontFamily: 'inherit' }}
      >
        {name}
      </motion.span>

      {/* Live indicator dot */}
      <motion.span
        animate={{
          backgroundColor: hovered ? accent.dot : '#d1d5db',
          scale: hovered ? 1.2 : 1,
        }}
        transition={{ duration: 0.2 }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          marginLeft: 2,
          flexShrink: 0,
        }}
      />
    </motion.div>
  );
};

// --- Marquee Row ---
const MarqueeRow = ({ items, direction = 'left', speed = 35 }) => {
  const duplicated = [...items, ...items, ...items];

  return (
    <div style={{ position: 'relative', display: 'flex', width: '100%', overflow: 'hidden', padding: '6px 0' }}>
      <motion.div
        style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}
        animate={{ x: direction === 'left' ? ['0%', '-33.33%'] : ['-33.33%', '0%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: speed }}
      >
        {duplicated.map((item, i) => (
          <LogoPill key={i} name={item.name} />
        ))}
      </motion.div>
    </div>
  );
};

// --- Footer ---
const Footer = () => (
  <footer style={{ width: '100%', background: '#111', color: '#fff', paddingTop: 96, paddingBottom: 48, paddingLeft: 24, paddingRight: 24, position: 'relative', zIndex: 0 }}>
    <div style={{ maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 50, height: 50, borderRadius: 8, background: '#02F576', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontWeight: 638, fontSize: 50, letterSpacing: '-0.02em' }}>TITANS</span>
        </div>
        <p style={{ color: '#fff', fontSize: 13, maxWidth: 220, lineHeight: 1.6 }}>
          Smarter monitoring for secure, trusted online examinations.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 64 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
        </div>
      </div>
    </div>
    <div style={{ maxWidth: 1024, margin: '80px auto 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderTop: '1px solid #222', paddingTop: 32 }}>
      <p style={{ fontSize: 12, color: '#fff' }}>© Titans - Virtusa Jatayu S5. All rights reserved.</p>
      <div style={{ display: 'flex', gap: 24 }}>
        {['Privacy policy', 'Terms'].map(l => (
          <a key={l} href="#" style={{ fontSize: 12, color: '#fff', textDecoration: 'none' }}>{l}</a>
        ))}
      </div>
    </div>
  </footer>
);

// --- App ---
const App = () => {
  const navigate = useNavigate();
  return (
    <main style={{ background: '#111', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: '#fff', paddingBottom: 80, borderRadius: '0 0 3rem 3rem', position: 'relative', zIndex: 10 }}>
        <section style={{ width: '100%', paddingTop: 96, overflow: 'hidden' }}>
          {/* Hero */}
          <div style={{ maxWidth: 768, margin: '0 auto', textAlign: 'center', padding: '0 24px', marginBottom: 64 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d', letterSpacing: '0.04em', textTransform: 'uppercase' }}>AI-Powered Proctoring</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
              Smarter monitoring for<br />secure examinations.
            </h1>
            <p style={{ color: '#6b7280', fontSize: 18, lineHeight: 1.6, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
              AI-powered proctoring that secures online examinations across every industry.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button 
                onClick={() => navigate('/about-us')}
                style={{
                  padding: '12px 28px', background: '#0a0a0a', color: '#02F576',
                  fontWeight: 600, fontSize: 13, borderRadius: 999, border: 'none',
                  cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                About Us
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Marquee */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
            maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}>
            <MarqueeRow items={row1} direction="left" speed={38} />
            <MarqueeRow items={row2} direction="right" speed={44} />
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
};

export default App;