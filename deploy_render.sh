#!/bin/bash

RENDER_API_KEY="rnd_qDpbevpSatUQfUtbVGH70C6mnoGA"
GITHUB_REPO="https://github.com/koersenm70/TAM"
SERVICE_NAME="leadgen"
SECRET_KEY="supersecretkey123"

echo "🚀 Deploying to Render..."

# Get owner ID
OWNER_ID=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/owners?limit=1" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['owner']['id'])")

echo "Owner ID: $OWNER_ID"

# Create the web service
RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"$SERVICE_NAME\",
    \"ownerId\": \"$OWNER_ID\",
    \"repo\": \"$GITHUB_REPO\",
    \"branch\": \"main\",
    \"serviceDetails\": {
      \"runtime\": \"docker\",
      \"dockerfilePath\": \"./Dockerfile\",
      \"healthCheckPath\": \"/health\",
      \"envSpecificDetails\": {
        \"buildCommand\": \"\",
        \"startCommand\": \"\"
      }
    },
    \"envVars\": [
      { \"key\": \"PORT\", \"value\": \"8000\" },
      { \"key\": \"SECRET_KEY\", \"value\": \"$SECRET_KEY\" }
    ]
  }")

echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'service' in data:
    svc = data['service']
    print('✅ Service created!')
    print('   Name:', svc.get('name'))
    print('   ID:  ', svc.get('id'))
    print('   URL: https://' + svc.get('serviceDetails', {}).get('url', '(deploying...)'))
    print()
    print('⏳ Build is starting. Check progress at:')
    print('   https://dashboard.render.com/web/' + svc.get('id'))
else:
    print('❌ Error:', json.dumps(data, indent=2))
"
