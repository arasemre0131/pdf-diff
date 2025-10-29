import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UploadProvider } from './context/UploadContext';
import { JobProvider } from './context/JobContext';
import { UploadPage } from './pages/UploadPage';
import { ResultsPage } from './pages/ResultsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <UploadProvider>
        <JobProvider>
          <Router>
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/results/:jobId" element={<ResultsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </JobProvider>
      </UploadProvider>
    </ErrorBoundary>
  );
}
