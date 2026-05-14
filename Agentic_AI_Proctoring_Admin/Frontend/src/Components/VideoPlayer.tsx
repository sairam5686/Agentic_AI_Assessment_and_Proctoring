import React from 'react';
import { motion } from 'framer-motion';
import videoFile   from '../assets/WhatsApp Video 2026-03-25 at 1.44.56 PM.mp4'
export default function VideoPlayer() {
  return (
    <div className="w-full min-h-screen flex justify-center items-center bg-white p-4 md:p-8 font-sans">
      
      {/* Outer Gray Container (Mockup Style) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[1400px] bg-[#F5F5F5] rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 lg:p-12"
      >
        
        {/* Inner White App Window */}
        <div className="w-full bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm overflow-hidden border border-gray-100">
          
          {/* Top Navigation Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 md:px-10 md:py-6 border-b border-gray-50 gap-4">
            
            {/* Left: Logo & Links */}
            <div className="flex items-center gap-6">
              <div className="font-black text-2xl tracking-tighter flex items-center gap-1">
                {/* Mobbin-style abstract logo */}
               
              </div>
              
            </div>

          </div>

        

          {/* Video Player Section */}
          <div className="px-6 md:px-15 pb-10">
            <div className="relative w-full aspect-video bg-gray-900 rounded-[1.5rem] overflow-hidden group shadow-md border border-gray-100">
              
              {/* Badge Overlay */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                  Featured Walkthrough
                </span>
              </div>

              {/* HTML5 Video Element */}
              <video 
                className="w-full h-full object-cover"
                controls
                poster="https://media.licdn.com/dms/image/v2/D5605AQF8rNEvYF7L5g/feedshare-thumbnail_720_1280/feedshare-thumbnail_720_1280/0/1686665424139?e=2147483647&v=beta&t=9CEO0cJxmGoeLTh6y4OvshuiXDmxeTmQTzU1CxXCO1g"
              >
                {/* A standard high-quality placeholder video */}
                <source 
                src={videoFile }
                 type="video/mp4" />
                Your browser does not support the video tag.
              </video>

            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}