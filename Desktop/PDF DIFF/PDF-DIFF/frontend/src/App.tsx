/**
 * App Component
 * Root component with routing setup
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UploadProvider } from './context/UploadContext';
import { JobProvider } from './context/JobContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Pages (will be created in Phase 3-7)
const UploadPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p>Upload Page - Coming Soon</p>
  </div>
);

const ResultsPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p>Results Page - Coming Soon</p>
  </div>
);

const NotFoundPage = () => (
  <div className="flex items-center justify-center min-h-screen">
    <p>404 - Page Not Found</p>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <UploadProvider>
        <JobProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/results/:jobId" element={<ResultsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </JobProvider>
      </UploadProvider>
    </ErrorBoundary>
  );
}
