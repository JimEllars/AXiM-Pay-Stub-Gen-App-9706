import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Generator from './pages/Generator';
import Success from './pages/Success';
import { usePayStubStore } from './store/usePayStubStore';

function AppContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setAuth = usePayStubStore(state => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('passport_token');
    if (token) {
      // Decode or fetch user profile using token, for now let's mock it or store token
      // Storing token securely in state and session storage
      sessionStorage.setItem('passportToken', token);
      setAuth(token, { email: 'enterprise@axim.us.com', avatar: '' }); // Mocked profile

      // Clean token from URL
      searchParams.delete('passport_token');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setAuth]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/generator" element={<Generator />} />
      <Route path="/success" element={<Success />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
