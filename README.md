# ChainScout - Automated Smart Contract Security Scanner
<img width="1494" height="733" alt="image" src="https://github.com/user-attachments/assets/21e04ac7-55f9-4788-ade7-2c0567395d64" />
<img width="1180" height="609" alt="image" src="https://github.com/user-attachments/assets/d6f94740-d1cb-4b8c-9c74-c41c2a421619" />
<img width="1419" height="786" alt="image" src="https://github.com/user-attachments/assets/39155991-a3d8-4527-8400-baeba161d404" />



<p align="center">
  <img src="https://img.shields.io/badge/status-production%20ready-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/security-0%20critical%20CVEs-success" alt="Security">
  <img src="https://img.shields.io/badge/detectors-7-coral" alt="Detectors">
  <img src="https://img.shields.io/badge/chains-5-midnightblue" alt="Chains">
  <img src="https://img.shields.io/github/v/release/BarmaleiDB-infosec/ChainScout?label=version" alt="Version">
</p>

**ChainScout** is an open-source platform for automated static analysis and security auditing of Ethereum smart contracts and Web3 applications.

## 🎯 Key Features

- **Smart Contract Analysis**: Detects 7 critical vulnerability categories in Solidity code
- **Blockchain Integration**: Fetch contract source from Etherscan, BSCScan, PolygonScan
- **Multi-Chain Support**: Ethereum mainnet, Sepolia testnet, BSC, Polygon
- **Web3 Application Scanning**: Analyze dApp codebases for security issues
- **Risk Scoring**: Weighted vulnerability scoring (0-100)
- **PDF Reports**: Generate detailed security audit reports
- **REST API**: Programmatic access to scanning engine
- **Freemium Model**: 3 free scans/day, unlimited with subscription

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- Docker & Docker Compose
- Supabase project (create free at https://supabase.com)
- Etherscan API key (optional, free at https://etherscan.io/apis)

### 1. Clone & Configure

```bash
git clone https://github.com/BarmaleiDB-infosec/chain-scout-web.git
cd chain-scout-web

# Copy environment template
cp .env.example .env

# Edit with your credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# SUPABASE_SERVICE_KEY=sb_secret_...
# ETHERSCAN_API_KEY=your_etherscan_key
```

### 2. Generate SSL Certificates (Development)

```bash
# On Linux/macOS
chmod +x generate-certs.sh
./generate-certs.sh

# On Windows
powershell -ExecutionPolicy Bypass -File generate-certs.ps1
```

### 3. Launch Docker Compose

```bash
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

**Services**:
- Frontend: https://localhost/ (or http://localhost for dev)
- API: http://localhost:4000
- Nginx: https://localhost (reverse proxy)
- Postgres: localhost:5432 (internal only)

### 4. Test the Application

```bash
# Register new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Scan a contract
curl -X POST http://localhost:4000/api/scans \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"contract_address","targetUrl":"0x1234...","level":"comprehensive"}'
```

## 🔍 Vulnerability Detection

ChainScout's Security Engine detects **7 critical categories**:

1. **Reentrancy Attacks** - External calls modifying state (CEI pattern violations)
2. **Integer Overflow/Underflow** - Arithmetic operations without SafeMath
3. **tx.origin Misuse** - Phishing-vulnerable authorization
4. **Unchecked Calls** - External calls without return value validation
5. **Delegatecall Misuse** - Code injection via delegatecall to untrusted contracts
6. **Access Control Issues** - Missing permission checks on sensitive functions
7. **Timestamp Dependence** - Miner-manipulatable timestamps in critical logic

## 🏗️ Architecture

```
┌─────────────────┐
│   React App     │ (Frontend - Port 5173)
│   (Vite Build)  │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx   │ (Reverse Proxy - Port 80/443)
    │ (HTTPS)  │ - Rate Limiting (3 scans/day)
    │ Headers  │ - Security Headers (CSP, HSTS)
    └────┬────┘
         │
    ┌────▼─────────┐
    │  Node.js API │ (Port 4000)
    │  (Express)   │
    └────┬─────────┘
         │
    ┌────┴──────────────────────┐
    │                           │
┌───▼──────┐          ┌────────▼────────┐
│ Supabase │          │ Security Engine │
│ (Auth &  │          │ - Solidity      │
│  Data)   │          │   Analyzer      │
└──────────┘          │ - Etherscan     │
                      │   Integration   │
                      └─────────────────┘
```

## 🔐 Security Features

- **Row-Level Security (RLS)**: Supabase policies ensure user isolation
- **JWT Authentication**: Bearer token validation on all API endpoints
- **Rate Limiting**: Nginx-level limiting per IP address
- **Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Input Validation**: Address format, file type checks
- **SSRF Protection**: Private IP ranges blocked
- **No SQL Injection**: Parameterized queries via Supabase

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/refresh` - Refresh token

### Scanning
- `POST /api/scans` - Start new scan (requires auth)
  - Body: `{ targetType, targetUrl, level }`
  - Returns: `{ jobId, status }`
- `GET /api/scans/:id` - Get scan details
- `GET /api/scans/:id/report` - Get detailed report

### Integrations
- `POST /api/integrations/github/sync` - Sync GitHub repositories
- `GET /api/integrations/github/info` - Get repository info

## 🛠️ Local Development (Without Docker)

### Backend
```bash
cd server
npm install
npm run dev  # Requires SUPABASE_URL, SUPABASE_SERVICE_KEY
```

### Frontend
```bash
npm install
npm run dev  # http://localhost:5173
```

### Backend Tests
```bash
node test-supabase-integration.mjs
```

## 📦 Deployment

### Production Checklist
- [ ] Replace self-signed SSL certs with Let's Encrypt
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS enforcement
- [ ] Configure backup PostgreSQL instance
- [ ] Set up monitoring/alerting
- [ ] Run `npm audit` (should show 0 high/critical in production)
- [ ] Load test `/api/scans` endpoint

## 🐛 Troubleshooting

### "Failed to fetch" on registration
- Check Supabase URL is correct in `.env`
- Verify `SUPABASE_SERVICE_KEY` is set in `server/.env`
- Ensure CORS is configured: `CORS_ORIGIN=http://localhost:5173`

### Docker containers won't start
```bash
# Check logs
docker-compose logs api
docker-compose logs frontend

# Rebuild
docker-compose down
docker-compose up -d --build
```

### Etherscan API rate limit
- Wait 30 seconds and retry
- Upgrade to paid Etherscan API tier for higher limits

### SSL certificate errors
- On macOS: `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain nginx/certs/chainscout.crt`
- On Windows: Import cert in Certificate Manager
- On Linux: Add to `/etc/ssl/certs/` and update `ca-certificates`

## ⚠️ Security Disclaimer

ChainScout is an **automated analysis tool** and should **NOT be used as a substitute for professional security audits**. Automated scanning can miss complex vulnerabilities. Always:

- Have critical contracts audited by professional firms
- Test thoroughly in testnet before mainnet deployment
- Review generated reports with security expertise
- Follow best practices from OpenZeppelin, Certora, Trail of Bits

## 📄 License

MIT License

## 🙋 Support

- GitHub Issues: [Report bugs](../../issues)
- Discussions: [Ask questions](../../discussions)
- Security: [Report vulnerabilities](SECURITY.md)

---

**Built with ❤️ by the ChainScout Team**

MVP Status: ✅ Ready for deployment
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b955a3a8-337d-45a2-b8ba-141e71f97430) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
