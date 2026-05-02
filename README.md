# ChainScout — Automated Smart Contract Security Scanner

<p align="center">
  <img src="https://img.shields.io/badge/status-MVP%20Ready-brightgreen" alt="MVP Status">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/security-0%20critical%20CVEs-success" alt="Security">
  <img src="https://img.shields.io/badge/detectors-7-coral" alt="Detectors">
  <img src="https://img.shields.io/badge/chains-Ethereum%20%7C%20Solana%20%7C%20BSC%20%7C%20Polygon-midnightblue" alt="Chains">
  <img src="https://img.shields.io/badge/AI-OpenRouter-purple" alt="AI">
  <img src="https://img.shields.io/badge/engine-Slither%20%7C%20Heuristics-orange" alt="Engine">
</p>


**ChainScout** is an open-source platform for automated security analysis of Web3 projects.  
Supports **Ethereum smart contracts**, **Solana programs**, and **dApp/Web3 applications** with AI-powered reporting.

<img width="1805" height="824" alt="image" src="https://github.com/user-attachments/assets/f8d6a843-825b-4177-9475-ea2b6653d4df" />
<img width="1548" height="867" alt="image" src="https://github.com/user-attachments/assets/aafe363d-c2f3-4ec1-865e-315ef5bc2530" />

---

## What It Does

1. **Smart Contract Analysis** — Paste a contract address, get a full security report
2. **Solana Program Scanning** — Analyze on-chain programs for upgradeability risks
3. **DApp / Web3 Surface Analysis** — Detect wallet SDKs, signature prompts, chain gating
4. **AI-Powered Reports** — Detailed audit reports via OpenRouter (Claude GPT-4o-mini)
5. **Slither Integration** — AST-based deep analysis for Solidity contracts
6. **Risk Scoring** — 0–100 weighted vulnerability scoring

---

## Vulnerability Detection (7 Categories)

| # | Category | Severity | Description |
|---|----------|----------|-------------|
| 1 | **Reentrancy Attacks** | HIGH | External calls modifying state (CEI violations) |
| 2 | **Integer Overflow/Underflow** | MEDIUM | Arithmetic without SafeMath/Solidity 0.8+ |
| 3 | **tx.origin Misuse** | HIGH | Phishing-vulnerable authorization |
| 4 | **Unchecked Calls** | HIGH | Low-level calls without return validation |
| 5 | **Delegatecall Misuse** | CRITICAL | Code injection via delegatecall |
| 6 | **Access Control Issues** | CRITICAL | Missing permission checks |
| 7 | **Timestamp Dependence** | LOW | Miner-manipulatable timestamps |

---

## Quick Start (Docker Compose)

### Prerequisites

- Docker & Docker Compose
- [Supabase](https://supabase.com) project (free tier)
- [Etherscan](https://etherscan.io/apis) API key (free)
- [OpenRouter](https://openrouter.ai) API key (optional, for AI reports)

### 1. Clone & Configure

```bash
git clone https://github.com/BarmaleiDB-infosec/ChainScout.git
cd ChainScout
cp .env.example .env
# Edit .env with your keys
```

### 2. Launch

```bash
docker compose up -d
```

### 3. Verify

```bash
curl http://localhost/health
# → {"status":"ok","service":"chainscout-api"}
```

Open **http://localhost** in browser.

---

## Architecture

```
┌─────────────────┐
│   React App     │  Port 5173 (dev) / 80 (prod via Nginx)
│   (Vite + TS)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx   │  Reverse Proxy, Rate Limiting, Security Headers
    │  :80/443 │
    └────┬────┘
         │
    ┌────▼─────────┐
    │  Node.js API │  Express, JWT Auth, Scan Orchestration
    │    :4000     │
    └────┬─────────┘
         │
    ┌────┴──────────────────────┐
    │                           │
┌───▼──────┐          ┌────────▼────────┐
│ Supabase │          │ Security Engine  │
│ Auth + DB│          │ • 7 Detectors    │
│   RLS    │          │ • Slither (AST)  │
└──────────┘          │ • Infura (RPC)   │
                      │ • Solana Client  │
                      │ • OpenRouter AI  │
                      └─────────────────┘
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |

### Scanning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scans` | Start new scan |
| GET | `/api/scans/:id` | Get scan status/results |
| GET | `/api/scans/recent` | List recent scans |
| POST | `/api/solana/scan` | Scan Solana program |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service status |

---

## Security

| Feature | Implementation |
|---------|---------------|
| **Row-Level Security** | Supabase RLS policies |
| **JWT Authentication** | Bearer tokens on all endpoints |
| **Rate Limiting** | Nginx-level (10 req/min auth, 1 req/min scan) |
| **CORS** | Whitelisted origins only |
| **SSRF Protection** | Private IP ranges blocked |
| **Input Validation** | Address format, file type checks |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| Backend | Node.js, Express |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth + JWT |
| AI | OpenRouter (Claude / GPT-4o-mini) |
| Analysis | Slither, Custom Heuristics, Etherscan V2 API, Infura RPC, Solana RPC |
| Infra | Docker, Nginx, GitHub Actions |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `ETHERSCAN_API_KEY` | Yes | Etherscan API key |
| `OPENROUTER_API_KEY` | No | OpenRouter API key (for AI reports) |
| `INFURA_API_KEY` | No | Infura RPC key |

---

## Deployment

Production checklist:
- [ ] Replace self-signed SSL with Let's Encrypt (`certbot --nginx`)
- [ ] Set `NODE_ENV=production`
- [ ] Enable firewall: `ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable`
- [ ] Configure monitoring (CPU > 80%, RAM > 90%, Disk > 85%)
- [ ] Set up database backups

---

## ⚠️ Disclaimer

ChainScout is an **automated analysis tool** and should **NOT** replace professional security audits. Automated scanning can miss complex vulnerabilities. Always:

- Have critical contracts audited by professional firms
- Test thoroughly on testnet before mainnet deployment
- Review generated reports with security expertise

---

## License

MIT License

---

**Built by the ChainScout Team | MVP Ready — May 2026**




