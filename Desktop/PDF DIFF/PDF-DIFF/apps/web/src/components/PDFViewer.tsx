import { useState, useEffect } from 'react';
import type { ComparisonResult } from '../types/domain';
import { API_BASE_PATH } from '../utils/constants';

interface PDFViewerProps {
  result: ComparisonResult;
  jobId?: string;
}

export function PDFViewer({ result, jobId }: PDFViewerProps) {
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDifferences, setShowDifferences] = useState(true);

  // Load result image
  useEffect(() => {
    const loadResultImage = async () => {
      if (!jobId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const imageUrl = `${API_BASE_PATH}/jobs/${jobId}/result.png`;
        setResultImageUrl(imageUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load result image';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadResultImage();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <p className="text-lg">Loading comparison results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <div className="text-center">
          <p className="text-lg text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!resultImageUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <p>Result image not available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-neutral-700 bg-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">PDF Comparison</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDifferences}
                onChange={(e) => setShowDifferences(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show Differences</span>
            </label>
          </div>
        </div>
      </header>

      {/* Main: Result Image */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="h-full w-full bg-gray-900 flex items-center justify-center p-4">
            {showDifferences ? (
              <img
                src={resultImageUrl}
                alt="PDF Comparison Result"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-neutral-400">
                <p>Differences are hidden. Check "Show Differences" to view the comparison.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {showDifferences && result?.changesCount && (
        <footer className="flex-shrink-0 border-t border-neutral-700 bg-neutral-800 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>{result.changesCount} differences found</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
