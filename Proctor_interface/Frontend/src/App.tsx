/**
 * App.tsx — Root Application Component
 *
 * Sets up client-side routing using React Router.
 * Routes:
 *   /login      → Login page (redirects to /dashboard if already authenticated)
 *   /dashboard  → Dashboard page (redirects to /login if not authenticated)
 *   /           → Redirects to /dashboard
 *   *           → Fallback redirect to /login
 *
 * Authentication state is read from the Zustand proctorStore.
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Pages/Dashboard';
import Login from './Pages/Login';
import { useProctorStore } from './store/proctorStore';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
    const isAuthenticated = useProctorStore((state) => state.isAuthenticated);

    return (
        <Router>
            <ToastContainer />
            <Routes>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
                <Route 
                    path="/dashboard" 
                    element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
