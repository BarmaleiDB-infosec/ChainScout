# ChainScout Security Analysis Module - Complete Architecture Prompt

## PROJECT OVERVIEW

ChainScout - это платформа для анализа безопасности Web3 проектов, включающая сканирование смарт-контрактов, GitHub репозиториев и веб-приложений. Текущий стек: React + TypeScript (frontend), Supabase (backend), Edge Functions (serverless API).

**Задача:** Создать production-ready Python модуль для углубленного анализа безопасности, который будет работать как микросервис и интегрироваться с существующей системой через REST API.

---

## EXISTING DATABASE SCHEMA (PostgreSQL via Supabase)

### 1. Table: `scan_history`
Хранит историю всех сканирований пользователей.

```sql
CREATE TABLE public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_url TEXT NOT NULL,
  scan_type TEXT NOT NULL,  -- 'github_repo' | 'smart_contract' | 'web_app' | 'api'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'failed'
  
  -- Web3 specific fields
  repository_url TEXT,
  contract_address TEXT,
  blockchain_network TEXT,  -- 'ethereum' | 'bsc' | 'polygon'
  template_id UUID REFERENCES public.scan_templates(id) ON DELETE SET NULL,
  
  -- Results
  results JSONB,  -- Структура описана ниже
  ai_analysis TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies: Users can only access their own scans
CREATE POLICY "Users can view their own scan history" ON scan_history
  FOR SELECT USING (auth.uid() = user_id);
```

**Expected `results` JSONB structure:**
```json
{
  "scanner": "string",
  "targetUrl": "string",
  "timestamp": "ISO datetime",
  "vulnerabilities": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "findings": [
    {
      "id": "uuid",
      "severity": "critical|high|medium|low",
      "title": "string",
      "description": "string",
      "location": "Line 123 or Contract:Function",
      "recommendation": "string",
      "cwe_id": "CWE-123 (optional)",
      "code_snippet": "string (optional)"
    }
  ],
  "summary": {
    "totalIssues": 10,
    "riskScore": 75
  },
  "github_analysis": {
    "repository": "owner/repo",
    "language": "Solidity",
    "stars": 100,
    "forks": 50,
    "open_issues": 5
  },
  "smart_contract_analysis": {
    "contract_name": "MyToken",
    "compiler_version": "0.8.0",
    "optimization_used": true,
    "runs": 200,
    "is_verified": true,
    "abi": "string",
    "source_code": "string"
  }
}
```

### 2. Table: `integrations`
Хранит API ключи пользователей для интеграций.

```sql
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'etherscan', 'infura', 'alchemy')),
  api_key TEXT NOT NULL,  -- Encrypted in production
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS: Users can only access their own integrations
```

### 3. Table: `scan_templates`
Шаблоны для повторяющихся сканирований.

```sql
CREATE TABLE public.scan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('github_repo', 'smart_contract', 'web_app', 'api')),
  configuration JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4. Table: `user_subscriptions`
Подписки пользователей и лимиты.

```sql
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  scans_used INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5. Table: `subscription_plans`
Доступные тарифы.

```sql
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- 'Free' | 'Pro' | 'Enterprise'
  scan_limit INTEGER,  -- NULL = unlimited
  price_monthly NUMERIC NOT NULL,
  price_yearly NUMERIC,
  features JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default plans:
-- Free: 3 scans/day, $0
-- Pro: 50 scans/day, $29/month
-- Enterprise: unlimited, $299/month
```

### 6. Database Functions

```sql
-- Check if user can create a scan (based on subscription limits)
CREATE FUNCTION can_user_create_scan(user_uuid UUID) RETURNS BOOLEAN AS $$
DECLARE
    subscription_record RECORD;
    scans_today INTEGER;
    plan_limit INTEGER;
BEGIN
    SELECT us.scans_used, sp.scan_limit, sp.name
    INTO subscription_record
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid AND us.status = 'active'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    IF subscription_record.scan_limit IS NULL THEN
        RETURN true;
    END IF;
    
    RETURN subscription_record.scans_used < subscription_record.scan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment scan counter
CREATE FUNCTION increment_scans_used(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET scans_used = scans_used + 1, updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## EXISTING API ARCHITECTURE (Supabase Edge Functions)

### Edge Function: `analyze-security`
**Path:** `https://rrcbgqledrotnnvpjtnk.supabase.co/functions/v1/analyze-security`

**Request:**
```json
{
  "targetUrl": "https://example.com or contract address",
  "scanType": "github_repo | smart_contract | web_app | api",
  "repositoryUrl": "https://github.com/user/repo (optional)",
  "contractAddress": "0x123... (optional)",
  "blockchainNetwork": "ethereum | bsc | polygon (optional)",
  "templateId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "scanId": "uuid",
  "results": { /* see results JSONB structure above */ },
  "aiAnalysis": "AI-generated security assessment text"
}
```

**Current Implementation:**
- Validates user authentication (JWT)
- Checks scan limits via `can_user_create_scan()`
- Creates scan record with status 'processing'
- Fetches user integrations (GitHub, Etherscan tokens)
- Performs basic scanning:
  - GitHub: Calls GitHub API for repo metadata
  - Smart Contract: Calls Etherscan API for source code
  - Mock vulnerability detection (currently simulated)
- Generates AI analysis via Lovable AI Gateway (Gemini)
- Updates scan with results and status 'completed'
- Increments `scans_used` counter

**Integration Points:**
```typescript
// Current GitHub scanning
async function scanGitHubRepository(repoUrl: string, githubToken?: string) {
  // Fetches repo metadata via GitHub API v3
  // Returns: { repository, language, stars, forks, open_issues }
}

// Current Smart Contract scanning
async function scanSmartContract(contractAddress: string, network: string, etherscanKey?: string) {
  // Fetches verified source code from Etherscan
  // Returns: { contract_name, compiler_version, source_code, abi, is_verified }
}

// Mock vulnerability detection (TO BE REPLACED by Python module)
async function simulateScan(targetUrl: string, scanType: string) {
  // Currently generates random vulnerabilities
  // THIS IS WHERE YOUR PYTHON MODULE WILL BE CALLED
}
```

### Edge Function: `generate-pdf-report`
**Path:** `https://rrcbgqledrotnnvpjtnk.supabase.co/functions/v1/generate-pdf-report`

**Request:**
```json
{
  "scanId": "uuid"
}
```

**Response:** HTML report (currently) or PDF blob (future)

---

## INTEGRATION WITH PYTHON MODULE - REQUIREMENTS

### How the Python Module Should Integrate:

**Option A: Standalone Microservice (Recommended)**
```
Edge Function (analyze-security) 
  → Calls Python API endpoint
  → Python module performs deep analysis
  → Returns results to Edge Function
  → Edge Function saves to database
```

**Option B: Direct Database Integration**
```
Python module polls database for scans with status='pending'
  → Picks up scan job
  → Updates status to 'processing'
  → Performs analysis
  → Writes results directly to scan_history
  → Updates status to 'completed'
```

### Expected Python Module API Endpoints:

#### POST `/api/scan/analyze`
Request:
```json
{
  "scan_id": "uuid",
  "scan_type": "github_repo | smart_contract | web_app | api",
  "target": {
    "repository_url": "https://github.com/user/repo (optional)",
    "contract_address": "0x123... (optional)",
    "blockchain_network": "ethereum | bsc | polygon (optional)",
    "source_code": "string (optional, if already fetched)",
    "target_url": "string (for web apps)"
  },
  "integrations": {
    "github_token": "string (optional)",
    "etherscan_key": "string (optional)",
    "infura_key": "string (optional)",
    "alchemy_key": "string (optional)"
  },
  "configuration": {
    "depth": "quick | standard | deep",
    "include_dependencies": true,
    "max_analysis_time_seconds": 300
  }
}
```

Response:
```json
{
  "scan_id": "uuid",
  "status": "completed | failed | processing",
  "timestamp": "ISO datetime",
  "analysis_duration_seconds": 45.2,
  "vulnerabilities": {
    "critical": 2,
    "high": 5,
    "medium": 10,
    "low": 15
  },
  "findings": [
    {
      "id": "uuid",
      "severity": "critical",
      "title": "Reentrancy vulnerability in withdraw function",
      "description": "The withdraw function is vulnerable to reentrancy attacks...",
      "location": "Contract.sol:line 45-52",
      "cwe_id": "CWE-841",
      "owasp_category": "A03:2021 – Injection",
      "recommendation": "Use Checks-Effects-Interactions pattern or ReentrancyGuard",
      "code_snippet": "function withdraw() public {\n  uint amount = balances[msg.sender];\n  (bool success,) = msg.sender.call{value: amount}(\"\");\n  balances[msg.sender] = 0;\n}",
      "references": [
        "https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/"
      ]
    }
  ],
  "metadata": {
    "files_analyzed": 15,
    "contracts_analyzed": 3,
    "dependencies_found": 25,
    "tools_used": ["slither", "mythril", "semgrep"]
  },
  "error": null
}
```

#### GET `/api/scan/status/{scan_id}`
Response:
```json
{
  "scan_id": "uuid",
  "status": "pending | processing | completed | failed",
  "progress_percentage": 75,
  "current_step": "Analyzing dependencies",
  "estimated_time_remaining_seconds": 30
}
```

#### POST `/api/scan/cancel/{scan_id}`
Cancel a running scan.

---

## VULNERABILITY DETECTION REQUIREMENTS

### 1. Smart Contract Analysis (Solidity)

**Critical Vulnerabilities to Detect:**
- Reentrancy (CWE-841)
- Integer Overflow/Underflow (CWE-190, CWE-191)
- Unchecked External Calls (CWE-703)
- Access Control Issues (CWE-284)
- Delegatecall to Untrusted Callee (CWE-829)
- Unprotected Ether Withdrawal (CWE-284)
- Timestamp Dependence (CWE-829)
- Front-running (MEV vulnerabilities)
- Signature Malleability (CWE-347)
- Gas Limit Issues

**Tools to Integrate:**
- Slither (static analysis)
- Mythril (symbolic execution)
- Securify (automated verification)
- Semgrep (pattern matching)

**Analysis Depth Levels:**
- **Quick (30s):** Basic pattern matching, known vulnerabilities
- **Standard (2-5min):** Static analysis with Slither, dependency checks
- **Deep (5-15min):** Symbolic execution with Mythril, full dependency tree analysis

### 2. GitHub Repository Analysis

**What to Analyze:**
- Dependency vulnerabilities (npm audit, pip-audit, cargo audit)
- Hardcoded secrets (API keys, private keys)
- Outdated dependencies with known CVEs
- Missing security best practices:
  - No .gitignore for sensitive files
  - Exposed environment variables
  - Weak access controls in code
- Code quality metrics
- License compliance

**Tools to Integrate:**
- Bandit (Python security)
- Semgrep (multi-language)
- TruffleHog (secret detection)
- npm audit / yarn audit
- OWASP Dependency-Check

### 3. Web Application Analysis

**What to Scan:**
- OWASP Top 10 vulnerabilities
- SQL Injection (CWE-89)
- XSS (CWE-79)
- CSRF (CWE-352)
- Security headers (HSTS, CSP, X-Frame-Options)
- SSL/TLS configuration
- Authentication/Authorization flaws

**Tools to Integrate:**
- OWASP ZAP
- Nuclei
- Wapiti

---

## TECHNICAL REQUIREMENTS

### Architecture Style
- **Microservice architecture** with FastAPI
- **Async/await** for all I/O operations
- **Task queue** (Celery + Redis) for handling multiple scans
- **Docker containers** for isolated analysis environments
- **Rate limiting** for external API calls
- **Caching** (Redis) for repeated scans of same contracts

### Performance Requirements
- Handle **10+ concurrent scans**
- Quick scans: **< 30 seconds**
- Standard scans: **< 5 minutes**
- Deep scans: **< 15 minutes**
- API response time: **< 100ms** (for status checks)

### Security Requirements
- **No credential storage** in logs
- **Sandboxed execution** for untrusted code analysis
- **Input validation** for all parameters
- **Rate limiting** on API endpoints
- **Timeout protection** for long-running operations
- **Error sanitization** (don't leak internal paths)

### Scalability Requirements
- **Horizontal scaling** with multiple worker containers
- **Stateless design** (all state in Redis/PostgreSQL)
- **Health check endpoints** for orchestration
- **Graceful shutdown** for running scans

---

## DIRECTORY STRUCTURE (Suggested)

```
chainscout-analysis-module/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration management
│   ├── dependencies.py         # FastAPI dependencies
│   └── api/
│       ├── __init__.py
│       ├── v1/
│       │   ├── __init__.py
│       │   ├── scan.py         # Scan endpoints
│       │   └── health.py       # Health check
│       └── models/
│           ├── __init__.py
│           ├── scan.py         # Pydantic models
│           └── findings.py
├── analyzers/
│   ├── __init__.py
│   ├── base.py                 # Base analyzer class
│   ├── smart_contract/
│   │   ├── __init__.py
│   │   ├── slither_analyzer.py
│   │   ├── mythril_analyzer.py
│   │   └── pattern_detector.py
│   ├── github/
│   │   ├── __init__.py
│   │   ├── repo_scanner.py
│   │   ├── dependency_checker.py
│   │   └── secret_detector.py
│   └── webapp/
│       ├── __init__.py
│       ├── zap_scanner.py
│       └── header_checker.py
├── services/
│   ├── __init__.py
│   ├── scan_orchestrator.py   # Main scan coordinator
│   ├── cache_service.py
│   └── notification_service.py
├── integrations/
│   ├── __init__.py
│   ├── github_client.py
│   ├── etherscan_client.py
│   ├── infura_client.py
│   └── alchemy_client.py
├── workers/
│   ├── __init__.py
│   └── celery_worker.py
├── db/
│   ├── __init__.py
│   ├── models.py               # SQLAlchemy models (if needed)
│   └── connection.py
├── utils/
│   ├── __init__.py
│   ├── logging.py
│   ├── retry.py
│   └── validators.py
├── tests/
│   ├── __init__.py
│   ├── test_analyzers/
│   ├── test_api/
│   └── fixtures/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── scripts/
│   ├── setup.sh
│   └── test_scan.py
├── .env.example
├── pyproject.toml
├── README.md
└── LICENSE
```

---

## DELIVERABLES REQUIRED

1. **Complete Python project structure** with all files
2. **Detailed class diagrams** showing relationships
3. **API documentation** (OpenAPI/Swagger spec)
4. **Docker setup** for local development and production
5. **Example usage scripts** for testing
6. **Integration guide** for connecting to Supabase Edge Functions
7. **Performance benchmarks** and optimization strategies
8. **Security hardening checklist**
9. **CI/CD pipeline** configuration (GitHub Actions)
10. **Monitoring and logging** setup (with structured logs)

---

## EXAMPLE INTEGRATION FLOW

```
User clicks "Start Scan" in ChainScout UI
  ↓
Frontend calls Supabase Edge Function: analyze-security
  ↓
Edge Function:
  1. Validates user authentication
  2. Checks scan limits (can_user_create_scan)
  3. Creates scan record in DB (status='processing')
  4. Fetches user's integration keys (GitHub, Etherscan)
  5. Calls Python module API: POST /api/scan/analyze
     - Passes scan_id, target info, integration keys
  ↓
Python Module:
  1. Validates request
  2. Queues scan job in Celery
  3. Returns 202 Accepted immediately
  ↓
Celery Worker:
  1. Picks up job from queue
  2. Clones GitHub repo (if needed)
  3. Fetches contract source (if needed)
  4. Runs analyzers in parallel:
     - Slither for static analysis
     - Mythril for symbolic execution
     - Semgrep for pattern matching
     - Dependency scanners
  5. Aggregates findings
  6. Calculates risk score
  7. Stores results in cache
  8. Calls Edge Function callback or updates DB directly
  ↓
Edge Function (callback):
  1. Receives results from Python module
  2. Generates AI analysis summary
  3. Updates scan_history with results
  4. Sets status='completed'
  5. Increments scans_used counter
  ↓
Frontend polls scan status
  ↓
User sees results in dashboard
```

---

## ADDITIONAL CONTEXT

### Current Technology Stack (ChainScout Platform)
- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Auth:** Supabase Auth (email, Google OAuth)
- **Hosting:** Lovable.dev (Vercel-like platform)
- **AI:** Lovable AI Gateway (Gemini 2.5 Flash)

### Performance Expectations
- Platform currently has ~100 users
- Expected growth to 1000+ users in 6 months
- Need to support 100+ concurrent scans
- 99.5% uptime SLA

### Compliance Requirements
- GDPR compliant (EU users)
- No storage of user source code beyond scan duration
- API keys encrypted at rest
- Audit logs for all scans

---

## YOUR TASK

Create a **complete, production-ready Python module** with:

1. **Full implementation** of all analyzers (smart contract, GitHub, webapp)
2. **FastAPI REST API** with async endpoints
3. **Celery task queue** for background processing
4. **Docker setup** for easy deployment
5. **Comprehensive tests** (unit, integration, e2e)
6. **Documentation** (API docs, deployment guide, architecture diagrams)
7. **Error handling and retry logic** for external APIs
8. **Rate limiting and caching** strategies
9. **Logging and monitoring** integration
10. **Security best practices** throughout

Focus on:
- **Scalability** (handle 100+ concurrent scans)
- **Reliability** (graceful error handling, retries)
- **Performance** (efficient parallelization, caching)
- **Security** (sandboxing, input validation, no credential leaks)
- **Maintainability** (clean code, type hints, docstrings)

Provide **complete code examples** for core components, not just high-level descriptions.
