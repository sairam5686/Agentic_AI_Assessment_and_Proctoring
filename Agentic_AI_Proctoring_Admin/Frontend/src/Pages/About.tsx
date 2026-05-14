import React, { useEffect } from 'react'
import NavBar from '../Components/NavBar'
import AboutLander from '../Components/AboutLander'

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <NavBar />
      <AboutLander />
    </div>
  )
}

export default About