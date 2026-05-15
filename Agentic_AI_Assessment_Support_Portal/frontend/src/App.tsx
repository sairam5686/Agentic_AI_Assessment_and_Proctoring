import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import QueryForm from './components/QueryForm';
import ThankYou from './components/ThankYou';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/query" element={<QueryForm />} />
          <Route path="/thank-you" element={<ThankYou />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
