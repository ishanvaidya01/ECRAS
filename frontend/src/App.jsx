import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import JobPostings from './pages/JobPostings';
import Candidates from './pages/Candidates';
import ApplicationRanking from './pages/ApplicationRanking';
import Interviews from './pages/Interviews';
import BiasAudit from './pages/BiasAudit';
import AuditTrailReports from './pages/AuditTrailReports';
import VectorDatabase from './pages/VectorDatabase';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/jobs" replace />} />
          <Route path="jobs" element={<JobPostings />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="ranking" element={<ApplicationRanking />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="bias-audit" element={<BiasAudit />} />
          <Route path="audit-trail" element={<AuditTrailReports />} />
          <Route path="vector-db" element={<VectorDatabase />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<TermsAndConditions />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
