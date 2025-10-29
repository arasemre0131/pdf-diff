# Quickstart: PDF Comparison Frontend Development

**Target**: Complete Phase 1-2 implementation of MVP within 1-2 sprints
**Scope**: Upload page + Results viewer with polling and highlighting

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git for version control
- Backend API running on `http://localhost:8000` (see `001-pdf-api-foundation`)

## Project Setup

### 1. Create React Project Structure

```bash
# Create Vite + React + TypeScript project
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Remove default example code
rm -rf src/App.css src/index.css
```

### 2. Install Core Dependencies

```bash
# Frontend framework & routing
npm install react-router-dom@6.x

# PDF rendering & manipulation
npm install pdfjs-dist@4.x

# HTTP client & utilities
npm install axios@1.6.x axios-retry@2.x
npm install date-fns@3.x    # Date formatting

# Styling
npm install -D tailwindcss@3.x postcss autoprefixer
npm install -D @tailwindcss/typography
npx tailwindcss init -p

# Testing
npm install -D vitest@1.x
npm install -D @testing-library/react@14.x
npm install -D @testing-library/jest-dom@6.x
npm install -D @testing-library/user-event@14.x
npm install -D @vitest/ui@1.x

# E2E Testing
npm install -D @playwright/test@1.x

# Type definitions
npm install -D @types/node@20.x
```

### 3. Configure Build Tools

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  }
})
```

**tsconfig.json** - Update `compilerOptions`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 4. Initialize TailwindCSS

**tailwind.config.js**:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pdf-green': '#22c55e',
        'pdf-red': '#ef4444',
        'pdf-yellow': '#eab308',
      }
    },
  },
  plugins: [],
}
```

**src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Development Workflow

### Phase 1: Core Structure (Week 1)

1. **Project Layout** (Commit 1)
   ```bash
   frontend/src/
   ├── components/
   ├── pages/
   ├── services/
   ├── hooks/
   ├── types/
   ├── context/
   ├── utils/
   ├── App.tsx
   └── main.tsx
   ```

2. **Type Definitions** (Commit 2)
   - Create `src/types/api.ts` from `contracts/api.ts`
   - Create `src/types/domain.ts` for frontend models
   - Create `src/types/ui.ts` for component props

3. **API Service Layer** (Commit 3)
   - `src/services/api.ts` - Axios instance & API calls
   - `src/services/fileValidator.ts` - File validation
   - `src/services/uploadManager.ts` - Upload state
   - `src/services/pollingService.ts` - Job polling

4. **Context & State** (Commit 4)
   - `src/context/UploadContext.tsx` - File upload state
   - `src/context/JobContext.tsx` - Comparison job state
   - Create hooks in `src/hooks/` for context consumers

### Phase 2: UI Components (Week 1-2)

5. **Upload Page** (Commit 5)
   - `src/pages/UploadPage.tsx` - Main upload layout
   - `src/components/FileUploadArea.tsx` - Drag-drop zone
   - `src/components/FileList.tsx` - Show selected files
   - `src/components/ProgressIndicator.tsx` - Upload progress

6. **Results Page** (Commit 6)
   - `src/pages/ResultsPage.tsx` - Results layout
   - `src/components/PDFViewer.tsx` - Single PDF rendering
   - `src/components/DifferenceHighlight.tsx` - Overlay highlighting
   - `src/components/SyncedScroll.tsx` - Synchronization logic

7. **Supporting Views** (Commit 7)
   - `src/pages/NotFoundPage.tsx` - 404 for invalid job ID
   - `src/pages/ProcessingPage.tsx` - Processing state
   - `src/pages/ErrorPage.tsx` - Error state

### Phase 3: Integration & Testing (Week 2)

8. **Routing & Navigation** (Commit 8)
   - Configure React Router in `App.tsx`
   - Handle navigation: Upload → Results (with job_id)
   - Support direct URL access to results

9. **End-to-End Tests** (Commit 9)
   - E2E tests using Playwright
   - Test complete user flows: upload → poll → view

10. **Performance & Optimization** (Commit 10)
    - Code splitting for upload vs results
    - Lazy load PDF.js worker
    - Memoization for expensive components
    - Debouncing for scroll/zoom events

## Testing Strategy

### Unit Tests (40% coverage)

```bash
npm test  # Run vitest

# Test structure
src/tests/unit/
├── services/
│   ├── fileValidator.test.ts
│   ├── api.test.ts
│   └── pollingService.test.ts
├── utils/
│   ├── storage.test.ts
│   └── formatting.test.ts
└── hooks/
    └── useFileUpload.test.ts
```

### Component Tests (50% coverage)

```bash
# Test structure
src/tests/integration/
├── UploadPage.test.tsx
├── ResultsPage.test.tsx
└── FileUploadArea.test.tsx
```

### E2E Tests (Critical paths)

```bash
npx playwright test

# Test structure
src/tests/e2e/
├── upload.spec.ts      # Upload flow
├── results.spec.ts     # Viewing results
└── polling.spec.ts     # Job status polling
```

## Running Development Server

```bash
# Start dev server (with hot reload)
npm run dev
# Vite opens on http://localhost:5173

# In another terminal, ensure backend is running
cd ../backend
python -m uvicorn app:app --reload --port 8000

# Or use docker-compose
docker-compose up
```

## Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview

# Built files go to dist/
# Serve with: python -m http.server 8000 -d dist
```

## Key Implementation Patterns

### 1. File Upload with Progress

```typescript
// src/services/uploadManager.ts
async uploadFiles(
  files: File[],
  onProgress: (percent: number) => void,
  onCancel: () => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file1', files[0]);
  formData.append('file2', files[1]);

  try {
    const response = await api.post('/upload', formData, {
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      },
      cancelToken: source.token,
    });
    return response.data.job_id;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      onCancel();
    }
    throw error;
  }
}
```

### 2. Job Status Polling

```typescript
// src/services/pollingService.ts
startPolling(
  jobId: string,
  onComplete: (result: ComparisonResult) => void,
  onError: (error: string) => void
) {
  let interval = 3000;
  let startTime = Date.now();

  const poll = async () => {
    try {
      const response = await api.get(`/compare/${jobId}`);

      if (response.data.status === 'completed') {
        onComplete(response.data.result);
        clearInterval(timerId);
      } else if (response.data.status === 'failed') {
        onError(response.data.error_message);
        clearInterval(timerId);
      }

      // Exponential backoff
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 10) interval = 10000;
      if (elapsedMinutes > 5) interval = 5000;
    } catch (error) {
      onError(error.message);
      clearInterval(timerId);
    }
  };

  const timerId = setInterval(poll, interval);
  return timerId;
}
```

### 3. PDF Rendering with Highlighting

```typescript
// src/components/PDFViewer.tsx
const PDFViewer: React.FC<{
  pdfUrl: string;
  differences: DifferenceHighlight[];
  currentPage: number;
}> = ({ pdfUrl, differences, currentPage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    pdfjsLib.getDocument(pdfUrl).promise.then(doc => {
      setPdfDoc(doc);
    });
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    pdfDoc.getPage(currentPage).then(page => {
      const context = canvasRef.current!.getContext('2d')!;
      const viewport = page.getViewport({ scale: 2 });

      canvasRef.current!.width = viewport.width;
      canvasRef.current!.height = viewport.height;

      page.render({ canvasContext: context, viewport }).promise
        .then(() => drawHighlights(context, differences, currentPage));
    });
  }, [pdfDoc, currentPage, differences]);

  return <canvas ref={canvasRef} className="max-w-full" />;
};
```

## Environment Configuration

**Create .env file**:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_PDF_WORKER_SRC=/pdfjs-worker.js
```

**vite.config.ts** - Make .env vars available:
```typescript
defineConfig({
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
    ),
  },
})
```

## Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] No console errors/warnings
- [ ] Build succeeds with no warnings
- [ ] Production build tested locally
- [ ] CORS configured for target backend
- [ ] Environment variables configured
- [ ] Git branch pushed to remote
- [ ] PR review completed
- [ ] Merged to main branch

## Troubleshooting

### PDF not rendering
- Verify backend is running and accessible
- Check browser console for CORS errors
- Ensure PDF.js worker is available

### Upload stuck on progress
- Check network tab for request status
- Verify file size < 50MB
- Check backend logs for upload endpoint errors

### Polling not working
- Verify job_id in URL is valid
- Check API response format matches contract
- Look for polling interval errors in console

### Styling issues
- Ensure Tailwind CSS is installed and configured
- Check tailwind.config.js includes src/
- Run `npm install` if missing dependencies

## Next Steps After MVP

1. **WebSocket** instead of polling for real-time updates
2. **Persistent storage** (backend) for job history
3. **User authentication** (OAuth2 or email/password)
4. **Report export** (PDF generation) - P3 feature
5. **Advanced highlighting** (page-to-page navigation to differences)
6. **Performance optimizations** (caching, compression)
7. **Analytics** (tracking user flows, error rates)

## Resources

- [Vite Documentation](https://vitejs.dev)
- [React 18 Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [pdfjs-dist Documentation](https://github.com/mozilla/pdf.js)
- [Playwright Testing](https://playwright.dev)
- [React Router Documentation](https://reactrouter.com)

---

**Ready to start?** → Run `npm run dev` and begin with the Phase 1 structure! 🚀
