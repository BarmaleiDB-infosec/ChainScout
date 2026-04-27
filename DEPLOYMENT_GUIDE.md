# ChainScout MVP Deployment Guide

## Table of Contents
1. [Local Docker Deployment](#local-docker-deployment)
2. [Cloud Deployment (AWS/Google Cloud)](#cloud-deployment)
3. [SSL/TLS Certificate Setup](#ssltls-setup)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Health Checks](#monitoring)
6. [Troubleshooting](#troubleshooting)

## Local Docker Deployment

### Prerequisites
```bash
# Check Docker and Docker Compose versions
docker --version     # Should be 20.10+
docker-compose --version  # Should be 2.0+
```

### Step 1: Clone and Configure

```bash
git clone https://github.com/BarmaleiDB-infosec/chain-scout-web.git
cd chain-scout-web

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your editor
```

**Critical environment variables to set**:
```bash
# Supabase (create project at https://supabase.com)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XxXxXxXx...
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_XxXxXxXx...

# Etherscan API (free at https://etherscan.io/apis)
ETHERSCAN_API_KEY=your_api_key_here

# API Configuration
API_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:5173,http://localhost:80

# Database (auto-created by Docker)
DATABASE_URL=postgres://postgres:postgres@postgres:5432/chainscout
```

### Step 2: Generate SSL Certificates

**For Development** (self-signed):
```bash
# Linux/macOS
chmod +x generate-certs.sh
./generate-certs.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File generate-certs.ps1
```

**For Production** (Let's Encrypt via Certbot):
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d app.chainscout.com -d api.chainscout.com

# Copy to nginx/certs/
sudo cp /etc/letsencrypt/live/app.chainscout.com/fullchain.pem nginx/certs/chainscout.crt
sudo cp /etc/letsencrypt/live/app.chainscout.com/privkey.pem nginx/certs/chainscout.key
sudo chmod 644 nginx/certs/chainscout.*

# Auto-renewal cron job
sudo crontab -e
# Add: 0 0 1 * * certbot renew && cp /etc/letsencrypt/live/app.chainscout.com/* /path/to/nginx/certs/
```

### Step 3: Start Services

```bash
# Start all services in background
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                COMMAND                  SERVICE      STATUS      PORTS
# chainscout-api      "node index.js"          api          Up (healthy) 4000/tcp
# chainscout-nginx    "nginx -g daemon off"    nginx        Up (healthy) 0.0.0.0:80->80, 0.0.0.0:443->443
# chainscout-postgres "postgres"               postgres     Up (healthy) 5432/tcp
# chainscout-frontend "serve dist"             frontend     Up (healthy) 5173/tcp
```

### Step 4: Test the Deployment

```bash
# Check frontend
curl -k https://localhost/

# Check API health
curl http://localhost:4000/health

# Register test user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}' \
  | jq -r '.session.access_token')

# Submit scan
curl -X POST http://localhost:4000/api/scans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType":"contract_address",
    "targetUrl":"0x06012c8cf97BEaD5deae237070F9587f8E7A266d",
    "level":"comprehensive"
  }'
```

### Step 5: Run E2E Test Suite

```bash
# Test complete user journey
node server/test-e2e-mvp.mjs

# Expected output:
# ✅ User created: test-XXXXX@chainscout.test
# ✅ User authenticated
# ✅ Scan initiated
# ✅ Findings retrieved (N vulnerabilities)
# ✅ Risk Score: XX/100
# ✅ ALL TESTS COMPLETED SUCCESSFULLY
```

## Cloud Deployment

### AWS ECS Deployment

```yaml
# docker-compose.aws.yml
version: '3.8'
services:
  api:
    image: your-registry/chainscout-api:latest
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    ports:
      - "4000:4000"
    healthCheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: your-registry/chainscout-frontend:latest
    ports:
      - "5173:5173"
    healthCheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5173/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Deploy to ECS**:
```bash
# Build images
docker build -f Dockerfile.frontend -t your-registry/chainscout-frontend:latest .
docker build -f server/Dockerfile -t your-registry/chainscout-api:latest server/

# Push to registry
docker push your-registry/chainscout-frontend:latest
docker push your-registry/chainscout-api:latest

# Update CloudFormation or ECS task definition
# Scale to desired number of replicas
```

### Google Cloud Run Deployment

```bash
# Build and push to Cloud Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/chainscout-api

# Deploy
gcloud run deploy chainscout-api \
  --image gcr.io/PROJECT_ID/chainscout-api:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL \
  --memory 2Gi \
  --cpu 2 \
  --timeout 120
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chainscout-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chainscout-api
  template:
    metadata:
      labels:
        app: chainscout-api
    spec:
      containers:
      - name: api
        image: your-registry/chainscout-api:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: chainscout-secrets
              key: supabase-url
        - name: SUPABASE_SERVICE_KEY
          valueFrom:
            secretKeyRef:
              name: chainscout-secrets
              key: supabase-service-key
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"

---
apiVersion: v1
kind: Service
metadata:
  name: chainscout-api-service
spec:
  selector:
    app: chainscout-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
  type: LoadBalancer
```

**Deploy to Kubernetes**:
```bash
# Create secrets
kubectl create secret generic chainscout-secrets \
  --from-literal=supabase-url=$SUPABASE_URL \
  --from-literal=supabase-service-key=$SUPABASE_SERVICE_KEY

# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Check pods
kubectl get pods
kubectl logs -f deployment/chainscout-api
```

## SSL/TLS Setup

### Development (Self-Signed)

```bash
# Already generated by generate-certs.sh
# Located in: nginx/certs/chainscout.crt and chainscout.key
# Valid for: 365 days
```

### Production (Let's Encrypt)

```bash
# Method 1: Automatic with Certbot
sudo certbot certonly \
  --standalone \
  -d app.chainscout.com \
  -d api.chainscout.com \
  --email admin@chainscout.com \
  --agree-tos

# Method 2: Manual with DNS
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d app.chainscout.com

# Verify certificate
sudo certbot certificates

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Update Nginx Configuration

```nginx
# nginx/chainscout.conf (production)
ssl_certificate /etc/letsencrypt/live/app.chainscout.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/app.chainscout.com/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

## Environment Configuration

### Required Variables

```bash
# Frontend (browser sees these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_URL=http://localhost:4000  # or production API URL
VITE_ENV=development  # or production

# Backend (server only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...
DATABASE_URL=postgres://user:pass@localhost:5432/chainscout

# External APIs
ETHERSCAN_API_KEY=your_etherscan_key
BSCSCAN_API_KEY=your_bscscan_key (optional)
POLYGONSCAN_API_KEY=your_polygonscan_key (optional)

# Server Configuration
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://app.chainscout.com,https://api.chainscout.com
API_REQUIRE_AUTH=true

# Rate Limiting
RATE_LIMIT_SCANS_PER_DAY=3
RATE_LIMIT_AUTH_PER_MIN=10
RATE_LIMIT_GENERAL_PER_MIN=30

# Security
DEBUG=false
```

### Production Secrets Management

```bash
# Option 1: Environment Variables (Docker Secrets)
docker run \
  -e SUPABASE_SERVICE_KEY=$(cat /run/secrets/supabase_key) \
  chainscout-api

# Option 2: .env file (Secure)
chmod 600 .env
# Use deployment secrets, not committed to Git

# Option 3: Cloud Provider Secrets (Recommended)
# AWS Secrets Manager
# Google Secret Manager
# Azure Key Vault
# HashiCorp Vault
```

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:4000/health

# Expected response:
# {"status":"ok","uptime":"12345","memory":{"used":"123MB","total":"512MB"}}

# Database connection
curl http://localhost:4000/health/db

# Cache status
curl http://localhost:4000/health/cache
```

### Logging

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f nginx

# Structured logging (JSON)
docker-compose logs --timestamps api | jq .

# Filter by level
docker-compose logs api | grep ERROR
```

### Metrics & Alerting

```bash
# Option 1: Prometheus + Grafana
# Add to API:
# GET /metrics - Prometheus metrics

# Option 2: CloudWatch (AWS)
# Automatically collects logs and metrics

# Option 3: Datadog/New Relic
# APM monitoring with traces

# Alert on:
# - Error rate > 1%
# - Response time > 5s
# - CPU > 80%
# - Memory > 85%
# - Scan failures > 10/min
```

## Troubleshooting

### "Connection refused" on localhost:4000

```bash
# Check if service is running
docker-compose ps

# If not, start it
docker-compose up -d api

# Check logs
docker-compose logs api

# Try health check
docker exec chainscout-api wget -O- http://localhost:4000/health
```

### "No ETHERSCAN_API_KEY" - Scans fail

```bash
# Set the key
export ETHERSCAN_API_KEY=your_key_here

# Or in .env
ETHERSCAN_API_KEY=your_key_here

# Restart container
docker-compose restart api
```

### "CORS error" - Frontend can't reach API

```bash
# Check CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:5173,http://localhost:80

# Restart API
docker-compose restart api

# Test CORS headers
curl -i -X OPTIONS http://localhost:4000/api/scans \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

### "Scan stuck" - Analyzer not responding

```bash
# Check if Security Engine is working
docker exec chainscout-api node -e "require('./security-engine').analyzeSolidityCode('contract A {}')"

# Check Etherscan connection
curl https://api.etherscan.io/api?module=account&action=balance&address=0x1234

# Increase timeout
# In .env: SCAN_TIMEOUT=120000 (milliseconds)
```

### "Certificate mismatch" - SSL issues

**Development**:
```bash
# Accept self-signed cert in browser
# OR curl with -k flag
curl -k https://localhost/

# Regenerate certs
rm nginx/certs/chainscout.*
./generate-certs.sh
docker-compose restart nginx
```

**Production**:
```bash
# Verify certificate
openssl x509 -in nginx/certs/chainscout.crt -text -noout

# Check renewal date
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### "Rate limit hit" - Getting 429 errors

```bash
# This is normal - the user hit their 3-scan/day limit
# Limits reset at UTC midnight

# To test rate limiting
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/scans \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetType":"contract_address","targetUrl":"0x1234"}'
done

# Fourth request should return 429
```

---

**Deployment Readiness**: ✅ Ready for production  
**Last Updated**: 2026-04-27  
**Support**: [GitHub Issues](https://github.com/BarmaleiDB-infosec/chain-scout-web/issues)
