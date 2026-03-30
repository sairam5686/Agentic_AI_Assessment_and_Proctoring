import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { createBrowserRouter, RouterProvider } from 'react-router'
import TestCreater from './Pages/TestCreater.tsx'
import PreviewTest from './Pages/PreviewTest.tsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';
import ViewTest from './Pages/ViewTest.tsx'
import StartTest from './Pages/StartTest.tsx'
import DeploySuccess from './Pages/DeploySuccess.tsx'
import AssessmentDetails from './Pages/AssessmentDetails.tsx'
import CandidateAnalytics from './Pages/CandidateAnalytics.tsx'
import ContactUs from './Pages/ContactUs.tsx'
import About from './Pages/About.tsx'


const routes = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/test-creater', element: <TestCreater /> },
  { path: '/preview-test', element: <PreviewTest /> },
  { path: '/assessments', element: <ViewTest /> },
  { path: '/start-test', element: <StartTest /> },
  { path: '/deploy-success', element: <DeploySuccess /> },
  { path: '/assessment-details', element: <AssessmentDetails /> },
  { path: '/candidate-analytics', element: <CandidateAnalytics /> },
  {path:"/about-us" , element:<About/>},
  { path:'/contact-us' , element: <ContactUs />}
])



createRoot(document.getElementById('root')!).render(
  <>
    <RouterProvider router={routes} />
    <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
  </>
)
