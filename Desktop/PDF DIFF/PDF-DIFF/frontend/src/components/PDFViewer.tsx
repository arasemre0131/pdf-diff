import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf';
import type { ComparisonResult } from '../types/domain';
import { API_BASE_PATH } from '../utils/constants';

// Setup PDF.js worker from backend API (MUST be at module level, before getDocument)
GlobalWorkerOptions.workerSrc = `/api/v1/worker`;

interface PDFViewerProps {
  result: ComparisonResult;
  jobId?: string;
}

type PDFDocument = any;

interface DiffChange {
  type: 'added' | 'removed' | 'changed';
  bbox: number[];
  text: string;
  original?: string;
}

interface DiffPage {
  pageNumber: number;
  changes: DiffChange[];
}

export function PDFViewer({ result, jobId }: PDFViewerProps) {
  // Use refs arrays for all pages - indexed by page number (0-based)
  const leftCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const rightCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const [pdfDocs, setPdfDocs] = useState<{ file1?: PDFDocument; file2?: PDFDocument }>({});
  const [totalPages, setTotalPages] = useState(result.pagesAffected || 5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDifferences, setShowDifferences] = useState(true);
  const [diffData, setDiffData] = useState<DiffPage[]>([]);
  const [canvasesReady, setCanvasesReady] = useState(false);

  // Load PDFs
  useEffect(() => {
    const loadPDFs = async () => {
      if (!jobId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch both PDF files
        const file1Url = `${API_BASE_PATH}/jobs/${jobId}/files/file1`;
        const file2Url = `${API_BASE_PATH}/jobs/${jobId}/files/file2`;

        console.log('Loading PDFs:', file1Url, file2Url);

        const [pdf1Data, pdf2Data] = await Promise.all([
          fetch(file1Url).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch file1: ${r.status}`);
            return r.arrayBuffer();
          }),
          fetch(file2Url).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch file2: ${r.status}`);
            return r.arrayBuffer();
          }),
        ]);

        console.log('PDF data received:', pdf1Data.byteLength, pdf2Data.byteLength);

        // Load PDFs with pdfjs (getDocument already has worker configured)
        const doc1 = await getDocument({ data: pdf1Data }).promise;
        const doc2 = await getDocument({ data: pdf2Data }).promise;

        console.log('PDFs loaded:', doc1.numPages, doc2.numPages);

        setPdfDocs({ file1: doc1, file2: doc2 });
        setTotalPages(Math.max(doc1.numPages, doc2.numPages));

        // Fetch diff data after PDFs are loaded
        try {
          const diffRes = await fetch(`${API_BASE_PATH}/jobs/${jobId}/diff`);
          if (diffRes.ok) {
            const diffJson = await diffRes.json();
            setDiffData(diffJson.pages || []);
            console.log('Diff data loaded:', diffJson.pages?.length, 'pages with changes');
          }
        } catch (diffErr) {
          console.warn('Failed to load diff data:', diffErr);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load PDFs';
        console.error('Error loading PDFs:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadPDFs();
  }, [jobId]);

  // Check if all canvas refs are mounted in DOM before rendering
  // NOTE: No dependency array - runs after every render to catch when refs populate
  useEffect(() => {
    if (!pdfDocs.file1 || !pdfDocs.file2 || totalPages === 0) {
      setCanvasesReady(false);
      return;
    }

    // Count how many refs are populated
    const leftCount = leftCanvasRefs.current.filter(Boolean).length;
    const rightCount = rightCanvasRefs.current.filter(Boolean).length;

    if (leftCount === totalPages && rightCount === totalPages) {
      console.log("✅ All canvas refs are now mounted in the DOM");
      setCanvasesReady(true);
    } else {
      console.log(`⏳ Waiting for canvas refs... Left: ${leftCount}/${totalPages}, Right: ${rightCount}/${totalPages}`);
      setCanvasesReady(false);
    }
  });

  // Render ALL pages to canvas (only when canvases are ready)
  useLayoutEffect(() => {
    const renderAllPages = async () => {
      if (!pdfDocs.file1 || !pdfDocs.file2) {
        console.log('PDFs not loaded yet, skipping render');
        return;
      }

      if (!canvasesReady) {
        console.log('⏳ Canvases not ready yet, skipping render');
        return;
      }

      console.log(`🎨 Starting to render ALL ${totalPages} pages...`);

      // Loop through each page
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const pageNum = pageIndex + 1; // PDF pages are 1-indexed

        // Skip if page doesn't exist in either PDF
        if (pageNum > pdfDocs.file1.numPages || pageNum > pdfDocs.file2.numPages) {
          console.warn(`⚠️ Page ${pageNum} doesn't exist in one or both PDFs`);
          continue;
        }

        // Get canvas refs for this page
        const leftCanvas = leftCanvasRefs.current[pageIndex];
        const rightCanvas = rightCanvasRefs.current[pageIndex];

        if (!leftCanvas || !rightCanvas) {
          console.warn(`⚠️ Canvas refs not ready for page ${pageNum}`);
          continue;
        }

        try {
          // Fetch pages from both PDFs
          const page1 = await pdfDocs.file1.getPage(pageNum);
          const page2 = await pdfDocs.file2.getPage(pageNum);

          const scale = 1.5;
          const viewport1 = page1.getViewport({ scale });
          const viewport2 = page2.getViewport({ scale });

          // Render left PDF
          leftCanvas.width = viewport1.width;
          leftCanvas.height = viewport1.height;
          leftCanvas.style.width = `${viewport1.width}px`;
          leftCanvas.style.height = `${viewport1.height}px`;
          const ctx1 = leftCanvas.getContext('2d');
          if (ctx1) {
            await page1.render({ canvasContext: ctx1, viewport: viewport1 }).promise;
          } else {
            console.error(`❌ leftCanvas.getContext('2d') returned null for page ${pageNum}`);
          }

          // Render right PDF
          rightCanvas.width = viewport2.width;
          rightCanvas.height = viewport2.height;
          rightCanvas.style.width = `${viewport2.width}px`;
          rightCanvas.style.height = `${viewport2.height}px`;
          const ctx2 = rightCanvas.getContext('2d');
          if (ctx2) {
            await page2.render({ canvasContext: ctx2, viewport: viewport2 }).promise;
          } else {
            console.error(`❌ rightCanvas.getContext('2d') returned null for page ${pageNum}`);
          }

          console.log(`✅ Rendered page ${pageNum}`, {
            leftCanvasSize: {
              wAttr: leftCanvas.width,
              hAttr: leftCanvas.height,
              wStyle: leftCanvas.style.width,
              hStyle: leftCanvas.style.height,
            },
            rightCanvasSize: {
              wAttr: rightCanvas.width,
              hAttr: rightCanvas.height,
              wStyle: rightCanvas.style.width,
              hStyle: rightCanvas.style.height,
            },
          });
        } catch (err) {
          console.error(`❌ Error rendering page ${pageNum}:`, err);
        }
      }

      console.log('✅ All pages rendered!');
    };

    renderAllPages();
  }, [pdfDocs, totalPages, canvasesReady]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading PDFs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-400">Error loading PDFs</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdfDocs.file1 || !pdfDocs.file2) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <p>Error: PDFs not loaded</p>
      </div>
    );
  }

  // Helper component for diff overlay - handles coordinate transformation
  const DiffOverlay = ({
    pageIndex,
    pageChanges,
    getCanvas,
  }: {
    pageIndex: number;
    pageChanges: DiffChange[];
    getCanvas: () => HTMLCanvasElement | null | undefined;
  }) => {
    const canvas = getCanvas();
    const overlayScale = 1; // TEMPORARY: assume bbox is already in display coords

    // Parse CSS dimensions (they have 'px' suffix)
    const canvasWidthStr = canvas?.style.width || '0px';
    const canvasHeightStr = canvas?.style.height || '0px';
    const canvasWidthPx = parseFloat(canvasWidthStr);
    const canvasHeightPx = parseFloat(canvasHeightStr);

    return (
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: canvasWidthStr,
          height: canvasHeightStr,
        }}
      >
        {pageChanges.map((change, idx) => {
          const [x1, y1, x2, y2] = change.bbox;

          // Apply overlay scale (calibration: assume bbox is in display coords)
          const boxWidth = (x2 - x1) * overlayScale;
          const boxHeight = (y2 - y1) * overlayScale;
          const leftPx = x1 * overlayScale;

          // Flip Y coordinate: PDF uses bottom-left origin, canvas uses top-left
          // Use CSS height (in pixels), not raw attribute height
          const topPx = Math.max(0, (canvasHeightPx - y2 * overlayScale));

          // Choose color based on change type
          const bgColor =
            change.type === 'added'
              ? 'rgba(34, 197, 94, 0.12)'
              : change.type === 'removed'
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(234, 179, 8, 0.12)';

          const borderColor =
            change.type === 'added'
              ? 'rgba(34, 197, 94, 0.8)'
              : change.type === 'removed'
              ? 'rgba(239, 68, 68, 0.8)'
              : 'rgba(234, 179, 8, 0.8)';

          return (
            <div
              key={idx}
              className="absolute rounded pointer-events-none transition-opacity"
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${boxWidth}px`,
                height: `${boxHeight}px`,
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
              }}
              title={`${change.type}: ${change.text}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white">
      {/* Header - fixed at top */}
      <header className="flex-shrink-0 border-b border-neutral-700 bg-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">PDF Comparison</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDifferences}
                onChange={(e) => setShowDifferences(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Show Differences</span>
            </label>
            <span className="text-xs text-neutral-400">
              {totalPages} page{totalPages !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Main diff area - fills the rest, scrolls independently */}
      <main className="flex-1 overflow-auto">
        <div className="flex flex-row flex-nowrap gap-8 px-6 py-6 w-max min-w-full">
          {/* LEFT COLUMN - Original Pages */}
          <section className="flex flex-col gap-8 w-[50vw] min-w-[600px]">
            <div className="text-sm font-semibold text-neutral-300 sticky top-0 bg-neutral-900/95 backdrop-blur z-10 px-3 py-2">
              Original
            </div>
            {Array.from({ length: totalPages }, (_, pageIndex) => {
              const pageNum = pageIndex + 1;
              const pageChanges = diffData.find(p => p.pageNumber === pageNum)?.changes || [];

              return (
                <div
                  key={`left-${pageIndex}`}
                  className="bg-white text-black rounded-lg shadow border border-neutral-700 overflow-hidden"
                >
                  {/* Page Header */}
                  <div className="text-[11px] font-medium text-neutral-400 bg-neutral-900 px-3 py-2 flex items-center justify-between border-b border-neutral-700">
                    <span className="text-neutral-200">Original</span>
                    <span className="text-neutral-500">Page {pageNum}</span>
                  </div>

                  {/* Canvas with Overlay */}
                  <div className="relative">
                    <canvas
                      ref={(el) => {
                        leftCanvasRefs.current[pageIndex] = el;
                      }}
                      className="block w-full h-auto bg-white"
                      style={{ display: 'block' }}
                    />
                    {/* Diff Overlay for Left PDF */}
                    {showDifferences && pageChanges.length > 0 && (
                      <DiffOverlay
                        pageIndex={pageIndex}
                        pageChanges={pageChanges}
                        getCanvas={() => leftCanvasRefs.current[pageIndex]}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          {/* RIGHT COLUMN - Modified Pages */}
          <section className="flex flex-col gap-8 w-[50vw] min-w-[600px]">
            <div className="text-sm font-semibold text-neutral-300 sticky top-0 bg-neutral-900/95 backdrop-blur z-10 px-3 py-2">
              Modified
            </div>
            {Array.from({ length: totalPages }, (_, pageIndex) => {
              const pageNum = pageIndex + 1;
              const pageChanges = diffData.find(p => p.pageNumber === pageNum)?.changes || [];

              return (
                <div
                  key={`right-${pageIndex}`}
                  className="bg-white text-black rounded-lg shadow border border-neutral-700 overflow-hidden"
                >
                  {/* Page Header */}
                  <div className="text-[11px] font-medium text-neutral-400 bg-neutral-900 px-3 py-2 flex items-center justify-between border-b border-neutral-700">
                    <span className="text-neutral-200">Modified</span>
                    <span className="text-neutral-500">Page {pageNum}</span>
                  </div>

                  {/* Canvas with Overlay */}
                  <div className="relative">
                    <canvas
                      ref={(el) => {
                        rightCanvasRefs.current[pageIndex] = el;
                      }}
                      className="block w-full h-auto bg-white"
                      style={{ display: 'block' }}
                    />
                    {/* Diff Overlay for Right PDF */}
                    {showDifferences && pageChanges.length > 0 && (
                      <DiffOverlay
                        pageIndex={pageIndex}
                        pageChanges={pageChanges}
                        getCanvas={() => rightCanvasRefs.current[pageIndex]}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>

      {/* Footer summary - fixed at bottom */}
      {showDifferences && (
        <footer className="flex-shrink-0 border-t border-neutral-700 bg-neutral-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Summary</h2>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">+</span>
                <span className="text-neutral-300">
                  {diffData.reduce((sum, page) => sum + page.changes.filter(c => c.type === 'added').length, 0)} added
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-400">−</span>
                <span className="text-neutral-300">
                  {diffData.reduce((sum, page) => sum + page.changes.filter(c => c.type === 'removed').length, 0)} removed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">~</span>
                <span className="text-neutral-300">
                  {diffData.reduce((sum, page) => sum + page.changes.filter(c => c.type === 'changed').length, 0)} changed
                </span>
              </div>
              <div className="flex items-center gap-2 border-l border-neutral-700 pl-6">
                <span className="text-neutral-400">Pages:</span>
                <span className="text-neutral-300">{diffData.length}</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
