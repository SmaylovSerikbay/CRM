#!/bin/bash
TOKEN=$(curl -s -X POST "http://localhost:8222/api/tokens" -H "Content-Type: application/json" -d '{"identity":"djek9007@gmail.com","secret":"Nginx&9007"}' | jq -r '.token')
echo "Token: $TOKEN"
echo ""
echo "NPM Configuration:"
curl -s -X GET "http://localhost:8222/api/nginx/proxy-hosts/1" -H "Authorization: Bearer $TOKEN" | jq '{id, domain_names, forward_host, forward_port, locations: [.locations[] | {path, forward_host, forward_port}]}'
