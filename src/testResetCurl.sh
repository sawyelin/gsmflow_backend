#!/bin/bash

# Test reset password endpoint directly
echo "Testing reset password endpoint..."

# Replace the token below with the actual token from your database
TOKEN="zcjz31kdfithg7fnuc4vgc"
NEW_PASSWORD="password123"

curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"password\": \"$NEW_PASSWORD\"}"

echo -e "\nTest completed."
