#!/usr/bin/env python3
"""
Quick MongoDB Atlas connection test for WSL/TLS debugging
"""
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
MONGO_URI_RAW = os.getenv("MONGO_URI")

print(f"Testing MongoDB Atlas connection from WSL...")
print(f"Original URI: {MONGO_URI_RAW[:50]}...")

# Test 1: Original URI
print("\n[Test 1] Original URI with ssl_cert_reqs=CERT_NONE in connection string...")
uri1 = f"{MONGO_URI_RAW}&ssl=true&ssl_cert_reqs=CERT_NONE" if "?" in MONGO_URI_RAW else f"{MONGO_URI_RAW}?ssl=true&ssl_cert_reqs=CERT_NONE"
try:
    client1 = MongoClient(uri1, serverSelectionTimeoutMS=5000)
    client1.admin.command('ping')
    print("✅ SUCCESS with ssl_cert_reqs=CERT_NONE in URI")
    client1.close()
except Exception as e:
    print(f"❌ FAILED: {type(e).__name__}: {str(e)[:200]}")

# Test 2: Using python parameters
print("\n[Test 2] Using tlsAllowInvalidCertificates in client kwargs...")
try:
    client2 = MongoClient(
        MONGO_URI_RAW,
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=5000
    )
    client2.admin.command('ping')
    print("✅ SUCCESS with tlsAllowInvalidCertificates kwarg")
    client2.close()
except Exception as e:
    print(f"❌ FAILED: {type(e).__name__}: {str(e)[:200]}")

# Test 3: Using ssl kwargs (legacy)
print("\n[Test 3] Using ssl=True, ssl_cert_reqs=ssl.CERT_NONE kwargs...")
try:
    import ssl as ssl_module
    client3 = MongoClient(
        MONGO_URI_RAW,
        ssl=True,
        ssl_cert_reqs=ssl_module.CERT_NONE,
        serverSelectionTimeoutMS=5000
    )
    client3.admin.command('ping')
    print("✅ SUCCESS with ssl.CERT_NONE kwarg")
    client3.close()
except Exception as e:
    print(f"❌ FAILED: {type(e).__name__}: {str(e)[:200]}")

print("\n" + "="*60)
print("If all tests failed, this is a WSL+Python 3.12+OpenSSL issue.")
print("Solutions:")
print("1. Run backend on Windows (not WSL)")
print("2. Use Python 3.11 instead of 3.12 in WSL")
print("3. Use a local MongoDB instance instead of Atlas")
