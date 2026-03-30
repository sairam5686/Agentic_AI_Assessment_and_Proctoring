import { motion } from 'framer-motion';
import { ArrowDown, MonitorPlay, BrainCircuit, BarChart2, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};

const listItem = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ─── Reusable Section Image ──────────────────────────────────────────────────
const SectionImage = ({ src, alt, caption }) => (
  <motion.div
    variants={fadeUp}
    className="w-full my-10 rounded-2xl overflow-hidden shadow-lg border border-gray-100"
  >
    <img src={src} alt={alt} className="w-full h-64 md:h-80 object-cover" />
    {caption && (
      <p className="text-xs text-gray-400 text-center py-2 bg-gray-50">{caption}</p>
    )}
  </motion.div>
);

export default function AboutLander() {
  return (
    <div className="w-full min-h-screen bg-white font-sans text-gray-800">

      {/* ─── 1. HERO ───────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[520px] bg-[#0A2656] overflow-hidden">

        {/* Background panel — right portion */}
        <div
          className="absolute inset-y-0 right-0 w-[62%] flex items-center justify-center bg-[#081e46]"
          style={{ clipPath: 'polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
        >
          {/* Subtle grid pattern for depth */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#00E676 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotate: 0,
              y: [0, -20, 0] 
            }}
            transition={{ 
              opacity: { duration: 1 },
              scale: { duration: 1.2, ease: "easeOut" },
              rotate: { duration: 1.5, ease: "easeOut" },
              y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
            }}
            className="relative w-64 h-64 md:w-80 md:h-80"
          >
            {/* Soft glow behind logo */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3, 
                ease: "easeInOut" 
              }}
              className="absolute inset-0 bg-[#00E676]/30 blur-[100px] rounded-full" 
            />
            
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_30px_rgba(0,230,118,0.5)]"
            >
              <path
                d="M50 0C50 27.6142 72.3858 50 100 50C72.3858 50 50 72.3858 50 100C50 72.3858 27.6142 50 0 50C27.6142 50 50 27.6142 50 0Z"
                fill="#00E676"
              />
            </svg>
          </motion.div>
        </div>

        {/* SVG diagonal overlay — creates the exact slanted left panel shape */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Main navy fill covering left ~55% with a clean diagonal cut */}
          <path d="M0,0 L60,0 L45,100 L0,100 Z" fill="#0A2656" />
          {/* Soft feather strip for blending */}
          <defs>
            <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0A2656" stopOpacity="1" />
              <stop offset="100%" stopColor="#0A2656" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M45,0 L70,0 L55,100 L30,100 Z" fill="url(#fadeRight)" />
        </svg>

        {/* Hero text */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 h-full flex flex-col justify-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-lg"
          >
            <motion.p variants={fadeUp} className="text-white/70 text-[11px] font-bold tracking-[0.18em] uppercase mb-5">
              Solution
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-white text-4xl sm:text-5xl font-light leading-tight mb-5">
              AI Assessments and Proctoring Platform
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/80 text-base sm:text-lg font-light mb-10 leading-relaxed">
              The AI-First Assessment & Proctoring Ecosystem for secure evaluations.
            </motion.p>

          </motion.div>
        </div>

        {/* Scroll chevron */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            initial={{ y: -4 }}
            animate={{ y: 4 }}
            transition={{ repeat: Infinity, duration: 1.3, repeatType: 'reverse', ease: 'easeInOut' }}
            className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
          >
            <ArrowDown className="text-white/70 w-4 h-4" />
          </motion.div>
        </div>
      </div>

      {/* ─── BREADCRUMB / NAV BAR ──────────────────────────────────────────── */}
      <div className="w-full bg-[#F5F6F8] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              Home / Solutions / AI Assessments and Proctoring Platform /
            </span>
            <span className="text-[#0A2656] font-bold text-sm mt-0.5 tracking-wide">
              About Us
            </span>
          </div>
          <div className="flex items-center gap-6 text-[#0A2656]">
            {[
              { Icon: ShieldCheck, label: 'AI Monitoring' },
              { Icon: BrainCircuit, label: 'Smart Evaluation' },
              { Icon: MonitorPlay, label: 'Evidence Logging' },
              { Icon: BarChart2, label: 'Secure Assessment' },
            ].map(({ Icon, label }) => (
              <button
                key={label}
                type="button"
                title={label}
                className="flex flex-col items-center gap-1 group"
              >
                <Icon className="w-5 h-5 group-hover:text-[#00C853] transition-colors" />
                <span className="text-[9px] font-medium text-gray-500 group-hover:text-[#00C853] transition-colors hidden lg:block tracking-wide max-w-[70px] text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-20 space-y-28">

        {/* 2. Introduction */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8">
            <div className="space-y-5 text-gray-600 font-light leading-relaxed text-[15px]">
              <motion.p variants={fadeUp}>
                In an era where remote evaluation is becoming the standard, ensuring the integrity and accuracy of
                online assessments is paramount. Organizations face significant challenges in detecting
                unauthorized behavior and maintaining a fair testing environment for all candidates.
              </motion.p>
              <motion.p variants={fadeUp}>
                Traditional proctoring methods often fall short when dealing with sophisticated AI tools or
                multi-device setups. Decisive detection and real-time monitoring are no longer optional—they
                are essential for any high-stakes assessment system.
              </motion.p>
            </div>

            <motion.div
              variants={fadeUp}
              className="bg-[#F5F6F8] p-8 rounded-2xl border border-gray-100"
            >
              <h3 className="text-lg font-semibold text-[#0A2656] mb-5">Key challenges include:</h3>
              <ul className="space-y-4">
                {[
                  'Detecting unauthorized aids and multi-person violations',
                  'Monitoring across both Laptop and Mobile camera feeds',
                  'Handling diverse assessment types from MCQ to Coding and SQL',
                  'Providing real-time evidence for post-test analysis',
                ].map((item, i) => (
                  <motion.li key={i} variants={listItem} className="flex items-start gap-3 text-gray-600 text-[15px]">
                    <ChevronRight className="w-4 h-4 text-[#00C853] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.p variants={fadeUp} className="text-gray-600 font-light leading-relaxed text-[15px]">
            AI Assessments and Proctoring Platform addresses these challenges by offering a centralized ecosystem where administrators
            can create comprehensive tests, monitor candidates in real-time with AI assistance,
            and evaluate performance with side-by-side evidence logs—all within a single, secure platform.
          </motion.p>
        </motion.section>

        {/* 3. Key Features */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-xs font-bold tracking-widest text-[#00C853] uppercase mb-3">
            Capabilities
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl font-light text-[#0A2656] mb-3">
            AI Assessments and Proctoring Platform — key features
          </motion.h2>
          <motion.h3 variants={fadeUp} className="text-lg font-medium text-gray-700 mb-5">
            Monitor, assess, and analyze with an AI-first approach to testing
          </motion.h3>
          <motion.p variants={fadeUp} className="text-gray-500 font-light mb-4 max-w-3xl text-[15px] leading-relaxed">
            The AI Assessments and Proctoring Platform ecosystem has been built for modern educational institutions and enterprises
            that require a robust, scalable environment to evaluate talent. It simplifies proctoring by letting 
            administrators view live feeds, access detailed violation reports, and manage complex test configurations.
          </motion.p>

          {/* Section screenshot-style image */}
          <SectionImage
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop"
            alt="AI Assessments and Proctoring Platform key features interface"
            caption="AI Assessments and Proctoring Platform — Comprehensive Admin Dashboard"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {[
              'Real-time AI Violation Detection with Laptop/Mobile support',
              'Multi-modal Assessments: MCQ, Coding, and SQL',
              'Innovative Logic Testing via Gaming (Pipe Puzzle)',
              'Live Side-by-Side Monitoring and Real-time Chat (Agora)',
              'Detailed Evidence Logs with timestamped violations',
              'Automated Evaluation for Coding and SQL submissions',
            ].map((feat, i) => (
              <motion.div
                key={i}
                variants={listItem}
                className="flex items-start gap-3 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#00E676] transition-all duration-200 group"
              >
                <CheckCircle2 className="w-5 h-5 text-[#00C853] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-gray-700 text-sm leading-relaxed">{feat}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 4. Key Benefits */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="relative"
        >
          {/* Dark card */}
          <div className="bg-[#0A2656] text-white rounded-3xl px-10 md:px-16 pt-14 pb-16 overflow-hidden relative">
            {/* Decorative blobs */}
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#00E676]/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-[#00E676]/5 blur-2xl" />

            <div className="relative z-10">
              <motion.p variants={fadeUp} className="text-[#00C853] text-xs font-bold tracking-widest uppercase mb-3">
                Value
              </motion.p>
              <motion.h2 variants={fadeUp} className="text-3xl font-light mb-3">
                AI Assessments and Proctoring Platform — key benefits
              </motion.h2>
              <motion.h3 variants={fadeUp} className="text-lg font-medium text-[#00E676] mb-5">
                Ensure evaluation integrity with data-backed proctoring analytics
              </motion.h3>
              <motion.p variants={fadeUp} className="text-gray-300 font-light mb-4 max-w-3xl text-[15px] leading-relaxed">
                AI Assessments and Proctoring Platform delivers immediate value to institutions seeking trust and scalability in their
                hiring or certification processes. By automating the detection of violations and providing
                deep analytics, the platform ensures that only the most qualified candidates succeed.
              </motion.p>
            </div>

            {/* Benefits image */}
            <motion.div variants={fadeUp} className="relative z-10 w-full my-8 rounded-xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop"
                alt="AI Proctoring Violation Analytics"
                className="w-full h-60 md:h-72 object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A2656]/60 to-transparent" />
            </motion.div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-5">
              {[
                'Unrivaled Integrity through multi-camera AI monitoring',
                'Reduced Admin Overhead via automated scoring and evaluation',
                'Data-driven Hiring with comprehensive candidate analytics',
                'Scalable infrastructure supporting thousands of Concurrent candidates',
                'Instant Violation alerts and real-time proctor intervention',
                'Seamless integration with Coding and SQL assessment engines',
              ].map((benefit, i) => (
                <motion.div key={i} variants={listItem} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] shrink-0 mt-2" />
                  <span className="text-gray-200 text-sm leading-relaxed">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* 5. Why Virtusa */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-xs font-bold tracking-widest text-[#00C853] uppercase mb-3">
            Differentiators
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl font-light text-[#0A2656] mb-3">
            Why AI Assessments and Proctoring Platform?
          </motion.h2>
          <motion.h3 variants={fadeUp} className="text-lg font-medium text-gray-700 mb-5">
            Beyond standard proctoring — an intelligent evaluation ecosystem
          </motion.h3>
          <motion.p variants={fadeUp} className="text-gray-500 font-light mb-4 max-w-3xl text-[15px] leading-relaxed">
            AI Assessments and Proctoring Platform stands apart by combining state-of-the-art AI monitoring with a diverse range of
            assessment types, including logic-based gaming. Designed for modern evaluation, we empower
            organizations to see beyond just the scores and understand the candidate's true potential.
          </motion.p>

          {/* Why Virtusa image */}
          <SectionImage
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop"
            alt="Secure Professional Assessment Environment"
            caption="AI Assessments and Proctoring Platform empowers teams with secure, high-fidelity evaluations"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Multi-Cam Integrity',
                desc: 'Supports concurrent monitoring from both mobile and laptop cameras for full coverage.',
              },
              {
                title: 'Diverse Test Modes',
                desc: 'Support for MCQ, Coding, SQL, and logical Gaming assessments in one platform.',
              },
              {
                title: 'Real-time Intervention',
                desc: 'Proctors can communicate directly with candidates and view live violation logs.',
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="p-8 border border-gray-200 rounded-2xl group hover:border-[#00E676] hover:shadow-lg transition-all duration-300 cursor-default"
              >
                <div className="w-8 h-0.5 bg-[#00E676] mb-5 group-hover:w-12 transition-all duration-300" />
                <h4 className="text-base font-semibold text-[#0A2656] mb-3 group-hover:text-[#0A2656] transition-colors">
                  {card.title}
                </h4>
                <p className="text-gray-500 font-light text-sm leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 6. CTA — "Secure evaluation starts here" */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="text-center py-10"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-semibold text-[#0A2656] mb-4">
            Secure evaluation starts here
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 font-light max-w-xl mx-auto mb-8 text-[15px] leading-relaxed">
            Experience the full power of AI-driven proctoring and multi-modal assessments.
            Schedule a personalised demo with our experts now.
          </motion.p>
          <motion.div variants={fadeUp}>
            <button onClick={() => window.location.href = '/contact-us'} type="button" className="bg-[#0A2656] hover:bg-[#0d2f6e] text-white font-bold py-4 px-10 rounded-full transition-all duration-300 shadow-lg hover:shadow-blue-900/30 hover:scale-105 active:scale-95 text-sm tracking-wide">
              Contact us
            </button>
          </motion.div>
        </motion.section>

      </div>

  
    </div>
  );
}