
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router'
import McqSection from './Pages/McqSection.tsx'
import CodingSection from './Pages/CodingSection.tsx'
import SqlSection from './Pages/SqlSection.tsx'
import UserLogin from './Pages/UserLogin.tsx'
import UserQuestionSections from './Pages/UserQuestionSections.tsx'
import PipePuzzle from './Pages/PipePuzzle.tsx'
import GuidingPage from './Pages/GuidingPage.tsx'
import SystemCheck from './Pages/SystemCheck.tsx'
import Submission from './Pages/Submission.tsx'
import MobileConnect from './Pages/MobileConnect.tsx'
import IDVerification from './Pages/IDVerification.tsx'
import AgoraProctoringLayout from './Components/AgoraProctoringLayout.tsx'
const routes = createBrowserRouter([
  { path: "/Login", element: <UserLogin /> },
  { path: "/", element: <UserLogin /> },
  
  {
    element: <AgoraProctoringLayout />,
    children: [
      { path: "/id-verification", element: <IDVerification /> },
      { path: "/system-check", element: <SystemCheck /> },
      { path: "/mobile-connect", element: <MobileConnect /> },
      { path: "/guiding-page", element: <GuidingPage /> },
      { path: "/section/mcq", element: <McqSection /> },
      { path: "/section/coding", element: <CodingSection /> },
      { path: "/section/sql", element: <SqlSection /> },
      { path: "/section/pipe-puzzle", element: <PipePuzzle /> },
      { path: "/dashboard", element: <UserQuestionSections /> },
      { path: "/submission", element: <Submission /> }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <>
    <RouterProvider router={routes} />

  </>

)
