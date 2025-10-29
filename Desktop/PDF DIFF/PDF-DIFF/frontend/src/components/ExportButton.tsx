import { useState } from 'react';

interface ExportButtonProps {
  jobId: string;
  fileName?: string;
}

export function ExportButton({ jobId, fileName = 'comparison-report' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html' | 'json'>('pdf');
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'pdf' | 'html' | 'json') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'json';
      link.download = `${fileName}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setShowMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M12 2a1 1 0 011 1v1h3a2 2 0 012 2v3a1 1 0 11-2 0V6h-3v11h3v-3a1 1 0 112 0v3a2 2 0 01-2 2h-3v1a1 1 0 11-2 0v-1H7a2 2 0 01-2-2v-3a1 1 0 00-2 0v3a4 4 0 004 4h3v1a1 1 0 112 0v-1h3a4 4 0 004-4V6a4 4 0 00-4-4h-3V3a1 1 0 011-1z" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export Report'}
      </button>

      {showMenu && !isExporting && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <button
            onClick={() => handleExport('pdf')}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('html')}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
            Export as HTML
          </button>
          <button
            onClick={() => handleExport('json')}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
}
