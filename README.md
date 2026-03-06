# Zotlo API Test Suite

A tool to test your APIs, define expected responses, and report results.

## Features

- **Request Form**: Define API requests with URL, HTTP method, headers, and JSON body
- **Dynamic Assertions**: Define expected responses via HTTP status (e.g. 200) and JSON path (e.g. `response.success = true`, `response.provider = stripe`)
- **MySQL Storage**: All test definitions and run history stored in MySQL
- **React + Vite Panel**: Modern Joy UI design

## Tech Stack

- **Backend**: Go + Gin + GORM
- **Frontend**: React + TypeScript + Vite
- **Database**: MySQL 8

## Setup

### Docker (Production)

```bash
docker-compose up -d
```

**Single URL**: http://localhost:8181 — Frontend + API served together.

### Local Development

```bash
# MySQL
docker-compose up -d mysql

# Full build (frontend + backend)
make build && ./bin/server
# or frontend dev only:
make dev  # http://localhost:5173
```

## Random Data Placeholders

Use `{{placeholder}}` in request body or headers. Values are generated at runtime:

| Placeholder | Description |
|-------------|-------------|
| `{{guid}}` / `{{uuid}}` | UUID v4 |
| `{{firstName}}` | First name |
| `{{lastName}}` | Last name |
| `{{fullName}}` | First + Last name |
| `{{email}}` | Email address |
| `{{phone}}` | Phone number |
| `{{creditCard}}` | Credit card number |
| `{{amount}}` | Random amount (10-1000) |
| `{{currency}}` | Currency code (USD, EUR, etc.) |
| `{{timestamp}}` | Unix timestamp |
| `{{date}}` | Current date (YYYY-MM-DD) |
| `{{datetime}}` | ISO 8601 datetime |

Example body: `{"userId": "{{guid}}", "customer": {"name": "{{fullName}}", "email": "{{email}}"}}`

## Environment Variables

Use `{{variable_name}}` in URL, headers and body to reference project env vars.

**Secured variables**: Mark as "Secured" when adding API keys, tokens, etc. The value is encrypted (AES-256) in the database and masked (`secret:***`) in lists and run history. Set `ENCRYPTION_KEY` in `.env` (or `SECRET_KEY`) — use a strong random string in production.

## Usage

1. **New Test**: Click "New Test" button
2. **Request Info**: Enter URL, method, headers (JSON), and body (JSON)
3. **Assertions**: Add expected responses:
   - **HTTP Status**: e.g. `200`
   - **JSON Path**: e.g. `response.success` = `true`, `response.provider` = `stripe`
4. **Run**: Run a single test or all tests
5. **Report**: Results are displayed and stored in MySQL

## JSON Path Examples

- `response.success` → success field in response object
- `data.provider` → data.provider
- `items.0.name` → name of first element in items array

## Operators

- **eq**: Equals
- **ne**: Not equals
- **contains**: Contains
- **exists**: Field exists
- **not_exists**: Field does not exist
