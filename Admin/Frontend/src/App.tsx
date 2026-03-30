
import LandingFeatures from './Components/LandingFeatures'
import MarqueeSection from './Components/MarqueeSection'
import NavBar from './Components/NavBar'
import VideoPlayer from './Components/VideoPlayer'
import Dashboard from './Pages/Dashboard'

const App = () => {
  return (
    <>
      <NavBar />
      <Dashboard />
     <VideoPlayer />
     <LandingFeatures />
     <MarqueeSection />
    </>
  )
}

export default App