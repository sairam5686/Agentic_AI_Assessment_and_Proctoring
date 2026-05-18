const isSEB = navigator.userAgent.includes("SEB") || import.meta.env.VITE_DISABLE_SEB_CHECK === "true";
if (!isSEB && window.location.pathname !== "/seb-required") {
  window.location.href = "/seb-required";
}

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
import FITBSection from './Pages/FitbSection.tsx'
import EssayPage from './Pages/EssayPage.tsx'
import DiagramSection from './Pages/DiagramSection.tsx'
import SebRequired from './Pages/SebRequired.tsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const routes = createBrowserRouter([
  { path: "/seb-required", element: <SebRequired /> },
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
      { path: "/section/fitb", element: <FITBSection /> },
      { path: "/section/essay", element: <EssayPage /> },
      { path: "/section/diagram", element: <DiagramSection /> },
      { path: "/section/pipe-puzzle", element: <PipePuzzle /> },
      { path: "/dashboard", element: <UserQuestionSections /> },
      { path: "/submission", element: <Submission /> }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <>
    <ToastContainer limit={1} autoClose={2000} newestOnTop={true} />
    <RouterProvider router={routes} />
  </>
)
