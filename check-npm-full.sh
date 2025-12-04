#!/bin/bash
TOKEN=$(curl -s -X POST "http://localhost:8222/api/tokens" -H "Content-Type: application/json" -d '{"identity":"djek9007@gmail.com","secret":"Nginx&9007"}' | jq -r '.token')
echo "=== Full NPM Configuration ==="
curl -s -X GET "http://localhost:8222/api/nginx/proxy-hosts/1" -H "Authorization: Bearer $TOKEN" | jq '.'
