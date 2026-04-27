# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-28

### Added
- 7-category Solidity vulnerability detection engine
  - Reentrancy detection
  - Integer overflow/underflow analysis
  - tx.origin misuse detection
  - Unchecked external calls identification
  - Delegatecall vulnerability detection
  - Access control issue discovery
  - Timestamp dependence analysis
- Multi-chain support (Ethereum, Sepolia, BSC, Polygon, Goerli)
- REST API with JWT authentication
- Risk scoring algorithm (0-100 scale)
- Nginx reverse proxy with security headers
- Row-Level Security via Supabase
- Rate limiting (3 scans/day freemium model)
- Docker Compose deployment
- E2E test suite
- GitHub Actions CI/CD
- Comprehensive documentation

### Fixed
- 22 security vulnerabilities (CVE remediation)
  - postcss XSS vulnerability (CVE-2026-41305)
  - react-router-dom vulnerabilities (CVE-2026-22029, CVE-2025-68470)
  - Transitive dependency vulnerabilities

### Security
- 0 critical vulnerabilities in production code
- OWASP Top 10 hardening implemented
- SSL/TLS certificate support
- Input validation and SSRF protection
- IDOR prevention with Row-Level Security

## [0.9.0] - 2026-04-27 (MVP)

### Added
- Initial MVP release
- Security Engine core implementation
- Etherscan blockchain integration
- Basic REST API endpoints
- Docker infrastructure
