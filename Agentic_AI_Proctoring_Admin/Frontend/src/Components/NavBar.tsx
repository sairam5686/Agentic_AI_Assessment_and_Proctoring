import React from 'react';
import { useNavigate } from 'react-router';

const NavBar = () => {
  const navigator = useNavigate()
  return (
    <div className="fixed top-0 w-full flex justify-center pt-3 z-50 px-4">
      <nav className="
        flex items-center justify-between 
        px-8 py-1
        /* Glassmorphism Logic */
        bg-white/40 backdrop-blur-md 
        border border-white/20 
        shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]
        /* Shape and Size */
        rounded-full 
        w-full max-w-[900px]
        transition-all duration-300
      ">
        
        {/* Logo Section */}
        <div className="flex items-center">
          <img
            src="https://www.greatplacetowork.in/great/api/assets/uploads/8935/logo/logo.png"
            alt="Virtusa Logo"
            className="h-8 w-auto object-contain hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-8">
              <h1 onClick={() => navigator("/")}
              className="
              cursor-pointer
                text-sm font-semibold text-gray-800 
                relative py-1
                after:content-[''] after:absolute after:bottom-0 after:left-0 
               after:w-0 after:h-[2px] after:bg-[#02F576] 
                after:transition-all after:duration-300 
                hover:after:w-full hover:text-[#02F576]
              ">
                Home
            </h1>

            <h1 onClick={() => navigator("/test-creater")}
              className="
              cursor-pointer
                text-sm font-semibold text-gray-800 
                relative py-1
                after:content-[''] after:absolute after:bottom-0 after:left-0 
               after:w-0 after:h-[2px] after:bg-[#02F576] 
                after:transition-all after:duration-300 
                hover:after:w-full hover:text-[#02F576]
              ">
                Create Assessment
            </h1>



         


             <h1 onClick={() => navigator("/assessments")}
              className="
              cursor-pointer
                text-sm font-semibold text-gray-800 
                relative py-1
                after:content-[''] after:absolute after:bottom-0 after:left-0 
               after:w-0 after:h-[2px] after:bg-[#02F576] 
                after:transition-all after:duration-300 
                hover:after:w-full hover:text-[#02F576]
              ">
                My Assessments
            </h1>



             <h1 onClick={() => navigator("/about-us")}
              className="
              cursor-pointer
                text-sm font-semibold text-gray-800 
                relative py-1
                after:content-[''] after:absolute after:bottom-0 after:left-0 
                after:w-0 after:h-[2px] after:bg-[#02F576] 
                after:transition-all after:duration-300 
                hover:after:w-full hover:text-[#02F576]
              ">
                About us
            </h1>



              <h1 onClick={() => navigator("/contact-us")}
              className="
              cursor-pointer
                text-sm font-semibold text-gray-800 
                relative py-1
                after:content-[''] after:absolute after:bottom-0 after:left-0 
                after:w-0 after:h-[2px] after:bg-[#02F576] 
                after:transition-all after:duration-300 
                hover:after:w-full hover:text-[#02F576]
              ">
                Contact us
            </h1>


     
        </div>

      
      </nav>
    </div>
  );
};

export default NavBar;