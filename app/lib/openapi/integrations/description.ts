export const integrationApiDescription = `
# OpenSenseMap Integration Service Contract

This specification describes the HTTP endpoints an external integration service must implement so openSenseMap can manage integration configuration.

An integration service is responsible for connecting external platforms or protocols, such as MQTT or TTN, to openSenseMap.

## Architecture

\`\`\`
openSenseMap Main App
    ↓ manages configuration via HTTP
Integration Service
    ↓ receives data from
External Platform / Protocol
    ↓ forwards measurements to
openSenseMap Measurement API
\`\`\`

## Required Endpoints

An integration service should implement:

1. \`GET /integrations/{deviceId}\` — get integration configuration for a device
2. \`PUT /integrations/{deviceId}\` — create or update integration configuration
3. \`DELETE /integrations/{deviceId}\` — delete integration configuration
4. \`GET /integrations/schema/{integrationName}\` — return JSON Schema for configuration forms
5. \`GET /health\` — health check

## Authentication

All endpoints except \`/health\` require the \`x-service-key\` header.

## Forwarding Measurements

After receiving and decoding data from the external platform, the integration service should forward measurements to the openSenseMap API.

Recommended endpoint:

\`POST /api/boxes/{deviceId}/data\`

Headers:

- \`Content-Type: application/json\`
- \`x-service-key: <service-key>\`

Example body:

\`\`\`json
{
  "sensorId": [23.5, "2026-02-06T10:00:00Z", { "lng": 7.628, "lat": 51.963, "height": 100 }]
}
\`\`\`

## Registration

To register an integration, openSenseMap administrators need:

- Service name and description
- Service URL
- Service authentication key
- Icon name
- JSON Schema endpoint path
`
