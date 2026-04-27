#!/bin/bash
# Generate self-signed certificates for development

CERT_DIR="nginx/certs"
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/chainscout.key" 2048

# Generate self-signed certificate (valid for 365 days)
openssl req -new -x509 -key "$CERT_DIR/chainscout.key" -out "$CERT_DIR/chainscout.crt" \
    -days 365 \
    -subj "/C=US/ST=State/L=City/O=ChainScout/CN=chainscout.com/CN=app.chainscout.com/CN=api.chainscout.com"

echo "✅ SSL certificates generated in $CERT_DIR"
echo "ℹ️  These are self-signed certificates for development only."
echo "ℹ️  For production, replace with valid certificates from Let's Encrypt or your CA."
