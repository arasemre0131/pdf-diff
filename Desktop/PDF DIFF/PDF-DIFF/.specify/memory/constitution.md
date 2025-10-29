# PDF Contract Comparison System Constitution

<!--
  SYNC IMPACT REPORT
  ==================
  Version: 0.1.0 → 1.0.0 (MINOR: New system; foundational principles established)

  New Principles Added:
  - Docker-First Architecture
  - Modular Microservices Design
  - Git Submodule Integration
  - Async-First Backend with Celery
  - Modern React Frontend
  - Nginx Reverse Proxy & SSL
  - Flexible Storage Strategy
  - MVP Minimalism Constraints

  Sections Added:
  - Technology Stack (mandatory)
  - MVP Constraints (mandatory)
  - Deployment & Infrastructure
  - Development Workflow

  Templates Requiring Updates:
  ✅ plan-template.md - Aligns with Docker multi-service structure
  ✅ spec-template.md - Supports frontend/backend feature separation
  ✅ tasks-template.md - Supports parallel service development

  Follow-up TODOs: None - all fields fully defined
-->

## Core Principles

### I. Docker-First Architecture

Every service component runs in a containerized environment. Containers are built, tested, and deployed as the primary deployment unit. Local development MUST use Docker Compose to mirror production architecture.

**Non-negotiable rules:**
- All services defined in `docker-compose.yml` with explicit service names
- `.dockerignore` configured to minimize image size
- Health checks configured on all services
- Volume mounts for development code reload where applicable
- Environment variables externalized to `.env` (not in Dockerfile)
- Production images use minimal base images (Alpine or distroless)

**Rationale**: Docker ensures consistency across dev/staging/production, eliminates "works on my machine" issues, and enables predictable infrastructure scaling. Required for the multi-service distributed system design.

---

### II. Modular Microservices Design

The system decomposes into independent services with clear responsibilities and minimal coupling. Each service owns its domain and communicates via well-defined contracts (HTTP/REST or message queues).

**Required services:**
- **Frontend**: React 18 TypeScript app (separate service)
- **Backend API**: FastAPI Python service
- **Redis**: Shared cache and message broker
- **Celery Worker**: Async task processor
- **Nginx**: Reverse proxy and SSL termination
- **MinIO**: Local S3-compatible object storage

**Non-negotiable rules:**
- Each service has its own repository subdirectory with independent dependency management
- Services communicate via HTTP REST or Redis queues only
- No direct service-to-service database access
- Each service can be started/stopped independently without breaking others
- Service interdependencies documented in `docker-compose.yml` (depends_on)

**Rationale**: Microservices allow independent scaling, testing, and deployment. Loose coupling enables parallel development and reduces cognitive load per service.

---

### III. Git Submodule Integration

The `pdf-diff` library is integrated as a git submodule. This ensures version pinning, enables independent evolution of the library, and maintains separation of concerns.

**Non-negotiable rules:**
- `pdf-diff` submodule located at `./pdf-diff` in repository root
- Submodule updates require explicit commit (not automatic)
- Backend service imports `pdf-diff` as local dependency via pip (editable install for dev)
- Submodule version pinned in parent repository `.gitmodules`
- All PRs referencing submodule changes must include rationale for version bump

**Rationale**: Submodules prevent dependency version drift, allow parallel library development, and keep the core contract comparison system modular and reusable.

---

### IV. Async-First Backend with Celery

Long-running PDF processing tasks MUST run asynchronously via Celery workers. The FastAPI backend accepts requests, enqueues tasks, and returns job identifiers. Workers process in the background without blocking the API.

**Non-negotiable rules:**
- PDF comparison jobs submitted to Celery queue
- API endpoints return immediately with job status, not blocking
- Task results cached in Redis with configurable TTL (default 24h)
- Celery tasks idempotent (safe to retry without side effects)
- Failed tasks logged with full context for debugging
- At least one Celery worker deployed in docker-compose.yml

**Rationale**: PDF comparison is CPU/IO intensive; async processing prevents API timeouts, allows horizontal scaling of workers, and improves user experience via job polling.

---

### V. Modern React Frontend Stack

Frontend built with React 18, TypeScript, Vite build tool, and TailwindCSS for styling. The frontend is a separate service deployed independently.

**Non-negotiable rules:**
- React 18+ with hooks-based components only
- Full TypeScript type safety (no `any` types without justification)
- Vite as build tool (no CRA)
- TailwindCSS for all styling (no inline CSS)
- Environment variables via `.env.local` (not committed)
- Build output in `frontend/dist/` served by Nginx

**Rationale**: React 18 with TypeScript and Vite provides fast development cycles, type safety, and optimized production bundles. TailwindCSS reduces CSS boilerplate. Independent deployment enables rapid UI iterations.

---

### VI. Nginx Reverse Proxy & SSL

Nginx serves as the single entry point for all traffic. It handles SSL/TLS termination, routes requests to backend API or frontend static assets, and provides security headers.

**Non-negotiable rules:**
- Nginx listens on port 443 (HTTPS) and 80 (HTTP redirect)
- SSL certificates provided via volume mount (certbot or self-signed for dev)
- Backend API routed to `/api/` prefix
- Frontend static assets served at `/` with caching headers
- Security headers (HSTS, CSP, X-Frame-Options) configured
- Nginx config committed to repository as `nginx/nginx.conf`

**Rationale**: Reverse proxy simplifies client interactions (single domain), enables SSL termination without per-service cert management, and provides centralized security configuration.

---

### VII. Flexible Storage Strategy

MinIO provides local S3-compatible object storage for development and testing. AWS S3 is used in production environments. Code abstracts storage behind a consistent interface.

**Non-negotiable rules:**
- Local development uses MinIO service (docker-compose.yml)
- Production environment uses AWS S3 via environment variable configuration
- Storage client library (e.g., boto3) abstracts S3/MinIO differences
- Bucket names and credentials externalized to environment
- All PDF files stored with UUID-based keys (no user-provided names in paths)

**Rationale**: MinIO enables offline development without AWS credentials. Abstraction layer allows production scale-up to AWS without code changes. S3-compatible interface provides durability and consistent object access patterns.

---

### VIII. MVP Minimalism Constraints

The MVP intentionally excludes features to maintain simplicity and focus on core value delivery. These constraints MUST be revisited in post-MVP phases.

**Non-negotiable MVP constraints:**
- **NO user authentication** - System is single-tenant MVP (no user accounts, login, or authorization)
- **NO PostgreSQL or relational DB** - Job metadata stored in Redis or local files only
- **NO automated tests** - Manual testing and visual validation acceptable for MVP
- **NO non-essential dependencies** - Every imported library must directly support core feature
- **NO email/notifications** - Job completion status polled by client only
- **NO audit logging** - Minimal operational logging for debugging only
- **NO API versioning** - Single API version acceptable for MVP

**Post-MVP review**: These constraints will be re-evaluated when moving to production (multi-tenant, persistence, monitoring, etc.). Document rationale for any MVP constraint violations.

**Rationale**: Constraints reduce scope and accelerate MVP delivery. Enables rapid validation of core PDF comparison feature without infrastructure overhead. Each constraint can be lifted post-MVP based on user feedback and scaling needs.

---

## Technology Stack (Mandatory)

### Backend
- **Runtime**: Python 3.11+
- **Framework**: FastAPI 0.100+
- **Async Tasks**: Celery 5.3+ with Redis broker
- **PDF Processing**: pdf-diff library (git submodule)
- **Environment**: python-dotenv for configuration

### Frontend
- **Runtime**: Node.js 18+ (build-time only)
- **Framework**: React 18.2+
- **Language**: TypeScript 5.0+
- **Build Tool**: Vite 4.0+
- **Styling**: TailwindCSS 3.3+
- **HTTP Client**: fetch API or axios

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx 1.25+
- **Message Broker**: Redis 7.0+
- **Object Storage**: MinIO (local) / AWS S3 (production)
- **SSL**: OpenSSL certificates (self-signed for dev, certbot for staging/prod)

### Minimal Dependencies
- Backend: FastAPI, Celery, Redis, python-dotenv, boto3 (aws-sdk), requests (optional)
- Frontend: React, TypeScript, Vite, TailwindCSS, react-router (optional)
- Shared: None (no monorepo shared libraries in MVP)

---

## MVP Constraints (Mandatory)

| Constraint | Impact | Post-MVP Consideration |
|-----------|--------|----------------------|
| No authentication | Single-tenant only | Implement OAuth2/JWT when multi-tenant needed |
| No PostgreSQL | Job metadata ephemeral | Migrate to PostgreSQL for persistence |
| No automated tests | Manual testing only | Add pytest (backend) + Jest (frontend) post-MVP |
| Minimal dependencies | Smaller attack surface | Evaluate additional libraries post-MVP |
| No email notifications | Poll-based status only | Add email/Slack integrations post-MVP |
| No audit logging | Limited debugging info | Add structured logging (ELK/CloudWatch) post-MVP |
| No API versioning | Breaking changes acceptable | Version API when external integrations added |

---

## Development Workflow

### Local Setup
1. Clone repository with submodules: `git clone --recursive`
2. Copy `.env.example` to `.env.local`
3. Run `docker-compose up -d` to start all services
4. Frontend accessible at `http://localhost` or `https://localhost` (self-signed)
5. Backend API accessible at `http://localhost/api/`

### Code Changes
- **Frontend**: Edit `frontend/src/`, Vite auto-reloads on save
- **Backend**: Edit `backend/src/`, FastAPI auto-reloads on save (if enabled)
- **pdf-diff library**: Updates via `git submodule update --remote` after committing library changes
- **Docker configuration**: Rebuild with `docker-compose up --build`

### Deployment
- **Development**: `docker-compose up` on local machine
- **Staging**: Push to git, CI/CD builds and deploys containers
- **Production**: Environment variables adjusted for AWS S3, certificate management via certbot

---

## Governance

**Principle Compliance**: All PRs MUST verify compliance with core principles (Docker containerization, service independence, async processing, TypeScript types, MVP constraints).

**Amendment Procedure**:
1. Document rationale for principle change in PR description
2. Discuss with team before merging
3. Update constitution.md and version accordingly
4. Re-check affected templates (plan, spec, tasks) for consistency
5. Update README or quickstart docs if developer workflow affected

**Version Numbering**:
- MAJOR: Core principle removed or redefined (backward incompatible)
- MINOR: New principle/section added or MVP constraint lifted
- PATCH: Clarifications, typo fixes, non-semantic refinements

**Compliance Review**: After every 5 merged PRs, spot-check 2-3 PRs for constitution compliance (Docker usage, service boundaries, async patterns, dependency additions).

**Version**: 1.0.0 | **Ratified**: 2025-10-29 | **Last Amended**: 2025-10-29
