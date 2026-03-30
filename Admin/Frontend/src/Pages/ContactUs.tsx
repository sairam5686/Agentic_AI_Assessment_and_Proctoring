import React from 'react'
import NavBar from '../Components/NavBar'
import ContactUsLander from '../Components/ContactUsLander'

const ContactUs = () => {
  return (
    <div>
      <NavBar />
      <div className='mt-20'>
      <ContactUsLander />
      </div>
    </div>
  )
}

export default ContactUs