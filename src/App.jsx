
if (typeof localStorage !== 'undefined' && !localStorage.getItem('axim_user_id')) {
  localStorage.setItem('axim_user_id', crypto.randomUUID());
}
import ErrorBoundary from './components/ErrorBoundary';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Generator from './pages/Generator';
import Success from './pages/Success';

function App() {
  return (
    <ErrorBoundary>
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/generator" element={<Generator />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
