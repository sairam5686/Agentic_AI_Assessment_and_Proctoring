import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';
import { useNavigate } from 'react-router';

interface FloatingIconProps {
  top: string;
  left: string;
  delay: number;
  duration?: number;
  depth?: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  children: React.ReactNode;
  className?: string;
}

// Reusable component for the floating app icons with Parallax
const FloatingIcon = ({ top, left, delay, duration = 4, depth = 20, mouseX, mouseY, children, className }: FloatingIconProps) => {
  // Map mouse position to movement distance based on depth
  const xOffset = useTransform(mouseX, [-1, 1], [-depth, depth]);
  const yOffset = useTransform(mouseY, [-1, 1], [-depth, depth]);

  // Apply spring for smooth, floaty parallax response
  const smoothX = useSpring(xOffset, { damping: 40, stiffness: 150 });
  const smoothY = useSpring(yOffset, { damping: 40, stiffness: 150 });

  return (
    <motion.div
      className="absolute z-0 pointer-events-none"
      style={{ top, left, x: smoothX, y: smoothY }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: [0, -12, 0] // Continuous gentle floating effect
        }}
        transition={{
          opacity: { duration: 0.8, delay },
          scale: { duration: 0.8, delay, type: 'spring', bounce: 0.4 },
          y: {
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 0.5, // Start floating after entrance
          }
        }}
        className={`w-12 h-12 rounded-[14px] md:w-16 md:h-16 md:rounded-2xl shadow-xl flex items-center justify-center text-lg md:text-xl font-bold ${className}`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  // Motion values for tracking mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Normalize mouse coordinates between -1 and 1
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set((clientX / innerWidth) * 2 - 1);
    mouseY.set((clientY / innerHeight) * 2 - 1);
  };

  // Reset mouse position softly when mouse leaves the window
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      className="relative min-h-screen w-full bg-white overflow-hidden text-[#111] font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Keeping the font import to ensure it loads exactly as it did before */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* BACKGROUND: Floating Background Icons (z-0) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Top Left Area */}
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={30} top="18%" left="10%" delay={0.2} className="bg-black text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
          </svg>
        </FloatingIcon>
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={15} top="48%" left="14%" delay={0.5} duration={4.5} className="bg-[#FFD028] text-black rounded-full"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"> <path d="M12 2l1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2z" />  </svg> </FloatingIcon>
        {/* Bottom Left Area */}
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={40} top="70%" left="15%" delay={0.8} className="bg-[#121212] border border-gray-800 text-white"><div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-purple-600 rounded-md"></div></FloatingIcon>


        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={25} top="58%" left="9%" delay={1.1} duration={5} className="bg-purple-500 text-white rounded-2xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M12 2C12 2 7 6 7 13h10c0-7-5-11-5-11z" fill="currentColor" fillOpacity={0.2} />
            <path d="M12 2c0 0-5 4-5 11h10c0-7-5-11-5-11z" />
            <path d="M9 13v3a3 3 0 006 0v-3" />
            <path d="M7 13c-2 1-3 3-3 3l2 1" strokeOpacity={0.7} />
            <path d="M17 13c2 1 3 3 3 3l-2 1" strokeOpacity={0.7} />
            <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </FloatingIcon>        {/* Center Left Area */}
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={10} top="28%" left="18%" delay={0.3} className="bg-blue-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
            {/* Main cylinder body */}
            <path d="M4 6v12c0 2.2 3.6 4 8 4s8-1.8 8-4V6" />
            {/* Top ellipse */}
            <ellipse cx="12" cy="6" rx="8" ry="3" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth={1.8} />
            {/* Mid divider line */}
            <path d="M4 10c0 2.2 3.6 4 8 4s8-1.8 8-4" strokeOpacity={0.6} />
            {/* Bottom divider line */}
            <path d="M4 14c0 2.2 3.6 4 8 4s8-1.8 8-4" strokeOpacity={0.35} />
            {/* Small dot details on top ellipse */}
            <circle cx="9" cy="5.5" r="0.6" fill="currentColor" fillOpacity={0.7} stroke="none" />
            <circle cx="12" cy="4.8" r="0.6" fill="currentColor" fillOpacity={0.7} stroke="none" />
            <circle cx="15" cy="5.5" r="0.6" fill="currentColor" fillOpacity={0.7} stroke="none" />
          </svg>
        </FloatingIcon>
        {/* Top Right Area */}
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={35} top="15%" left="88%" delay={0.4} className="bg-white border border-gray-200 text-black rounded-full">AI</FloatingIcon>
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={20} top="25%" left="82%" delay={0.7} duration={3.5} className="bg-white border border-gray-100"><div className="w-8 h-8 bg-orange-400 rounded-full"></div></FloatingIcon>

        {/* Center Right Area */}
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={15} top="35%" left="75%" delay={0.6} className="bg-[#F0F0F0] text-gray-500 rounded-xl grid grid-cols-2 gap-[2px] p-3">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        </FloatingIcon>
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={45} top="52%" left="85%" delay={0.9} duration={4.2} className="bg-[#FF5A5F] text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </FloatingIcon>

        {/* Bottom Right Area */}
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={25} top="75%" left="82%" delay={1.0} className="bg-black text-white rounded-xl">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </FloatingIcon>
        <FloatingIcon mouseX={mouseX} mouseY={mouseY} depth={10} top="80%" left="65%" delay={1.2} duration={4.8} className="bg-white border border-gray-200 text-black">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"></path></svg>
        </FloatingIcon>
      </div>

      {/* FOREGROUND: Dashboard Content (z-10) */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center mt-10">
        <main className="flex flex-col items-center text-center pt-[72px] px-6 pb-[80px]">
          {/* App Icon */}
          <div className="w-[100px] h-[100px] rounded-[24px] bg-[#f0f0f0] mb-10 shadow-[0_2px_0_0_rgba(0,0,0,0.2),_0_10px_30px_rgba(0,0,0,0.1)] relative overflow-hidden">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZPaiVinZMrO5Ph8tBMnXQpqq6pGXC0Kkuww&s"
              alt="App Icon"
              className="absolute inset-0 w-full h-full z-10 object-cover"
            />
            <div className="absolute inset-0 z-20 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.4)_0%,transparent_55%)]" />
          </div>

          {/* Headline */}
          <h1 className="font-black text-[clamp(49px,7.5vw,84px)] leading-[1.04] tracking-[-3.5px] max-w-[1000px] mb-[22px] text-[#151C28] selection:text-white selection:bg-[#02F576] ">
            AI that watches<br />so integrity never sleeps
          </h1>

          {/* Subtitle */}
          <p className="text-[17px] font-normal text-[#00000093] leading-[1.65] max-w-[440px] mb-[36px]">
            Real-time monitoring, intelligent detection, and secure assessments — all in one platform
          </p>

          {/* CTAs */}
          <div className="flex gap-[10px] items-center">

            <button 
              onClick={() => navigate('/test-creater')}
              className="px-[26px] py-[14px] rounded-full   bg-[#151C28] text-[#02F576] hover:bg-white text-[15px] font-semibold border-[1.5px] border-[#ddd] cursor-pointer inline-flex items-center gap-[6px] transition-colors duration-150 hover:border-[#aaa]"
            >
              Get Started <span>→</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;