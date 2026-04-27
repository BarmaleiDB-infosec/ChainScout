# Generate self-signed certificates for development

$CertDir = "nginx/certs"
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

# Generate self-signed certificate
$CertPath = Join-Path $CertDir "chainscout.crt"
$KeyPath = Join-Path $CertDir "chainscout.key"

# Using OpenSSL (must be installed)
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    # Generate private key
    openssl genrsa -out $KeyPath 2048
    
    # Generate self-signed certificate (valid for 365 days)
    openssl req -new -x509 -key $KeyPath -out $CertPath `
        -days 365 `
        -subj "/C=US/ST=State/L=City/O=ChainScout/CN=chainscout.com"
    
    Write-Host "✅ SSL certificates generated in $CertDir" -ForegroundColor Green
    Write-Host "ℹ️  These are self-signed certificates for development only." -ForegroundColor Yellow
    Write-Host "ℹ️  For production, replace with valid certificates from Let's Encrypt or your CA." -ForegroundColor Yellow
}
else {
    Write-Host "❌ OpenSSL not found. Please install OpenSSL or generate certificates manually." -ForegroundColor Red
    Write-Host "Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
}
