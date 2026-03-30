import React from 'react';

const ContactUsLander = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 font-sans text-gray-800">
      {/* Header Section */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#1a1f2b]">
        Smarter AI starts here
      </h1>
      <p className="text-gray-500 mb-12 text-lg">
        Experience the full power of configurable, side-by-side LLM testing. Schedule a personalized demo with our experts now.
      </p>

      {/* Form Section */}
      <form className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          
          {/* First Name */}
          <div className="relative">
            <input 
              type="text" 
              id="firstName" 
              required
              placeholder=" "
              className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors" 
            />
            <label 
              htmlFor="firstName" 
              className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-valid:-top-4 peer-valid:text-sm"
            >
              First name <span className="text-[#4169E1]">*</span>
            </label>
          </div>

          {/* Last Name */}
          <div className="relative">
            <input 
              type="text" 
              id="lastName" 
              required
              placeholder=" "
              className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors" 
            />
            <label 
              htmlFor="lastName" 
              className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-valid:-top-4 peer-valid:text-sm"
            >
              Last name <span className="text-[#4169E1]">*</span>
            </label>
          </div>

          {/* Job Title */}
          <div className="relative">
            <input 
              type="text" 
              id="jobTitle" 
              required
              placeholder=" "
              className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors" 
            />
            <label 
              htmlFor="jobTitle" 
              className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-valid:-top-4 peer-valid:text-sm"
            >
              Job title <span className="text-[#4169E1]">*</span>
            </label>
          </div>

          {/* Organization */}
          <div className="relative">
            <input 
              type="text" 
              id="organization" 
              required
              placeholder=" "
              className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors" 
            />
            <label 
              htmlFor="organization" 
              className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-valid:-top-4 peer-valid:text-sm"
            >
              Organization <span className="text-[#4169E1]">*</span>
            </label>
          </div>

          {/* Email */}
          <div className="relative">
            <input 
              type="email" 
              id="email" 
              required
              placeholder=" "
              className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors" 
            />
            <label 
              htmlFor="email" 
              className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-valid:-top-4 peer-valid:text-sm"
            >
              Email <span className="text-[#4169E1]">*</span>
            </label>
          </div>

          {/* Phone */}
          <div className="relative">
            <input 
              type="tel" 
              id="phone" 
              required
              placeholder=" "
              className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors" 
            />
            <label 
              htmlFor="phone" 
              className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-valid:-top-4 peer-valid:text-sm"
            >
              Phone <span className="text-[#4169E1]">*</span>
            </label>
          </div>
        </div>

        {/* Comment or question */}
        <div className="relative mt-12">
          <textarea 
            id="comment" 
            rows={1}
            placeholder=" "
            className="peer w-full border-b border-gray-400 py-2 bg-transparent outline-none focus:border-black text-gray-900 transition-colors resize-y min-h-[40px]"
          ></textarea>
          <label 
            htmlFor="comment" 
            className="absolute left-0 top-2 text-gray-400 text-lg pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-sm peer-placeholder-shown:top-2 peer-not-placeholder-shown:-top-4 peer-not-placeholder-shown:text-sm"
          >
            Comment or question
          </label>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start gap-3 mt-8">
          <input 
            type="checkbox" 
            id="consent" 
            className="mt-1.5 w-4 h-4 rounded border-gray-400 text-[#00ff7f] focus:ring-[#00ff7f]" 
          />
          <label htmlFor="consent" className="text-gray-500 text-sm md:text-base leading-relaxed">
            Yes, I want Virtusa to keep me up-to-date with recent industry developments including insights, upcoming events, and innovative solution capabilities according to the{' '}
            <a href="#" className="text-[#4169E1] font-semibold hover:underline">
              privacy policy
            </a>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button 
            type="submit" 
            className="bg-[#00fc7b] hover:bg-[#00e670] text-[#0a2b1b] font-bold py-3 px-8 rounded-full transition-colors text-lg tracking-wide"
          >
            Send an Mail
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactUsLander;