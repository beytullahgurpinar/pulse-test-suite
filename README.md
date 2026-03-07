<div align="center">
  <img src="screens/1.png" alt="Pulse Test Suite Logo" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />
  <h1>🚀 Pulse Test Suite</h1>
  <p><b>The Professional-Grade API Monitoring & Workflow Orchestration Platform.</b></p>
  <p>
    <a href="#-key-features">Features</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-community--support">Community</a>
  </p>
</div>

**Pulse Test Suite** is a powerful, developer-centric platform designed for teams that need to go beyond simple manual API calls. It combines automated testing, multi-step workflow orchestration, and 24/7 monitoring into a sleek, premium experience. Whether you're debugging a single endpoint or monitoring a complex microservices architecture, Pulse has you covered.

---

## ✨ Overview

<div align="center">
  <img src="screens/2.png" alt="Dashboard" width="48%" style="border-radius: 8px; margin-right: 2%;" />
  <img src="screens/3.png" alt="Test Management" width="48%" style="border-radius: 8px;" />
</div>
<br>
<div align="center">
  <img src="screens/4.png" alt="Workflows & Flows" width="48%" style="border-radius: 8px; margin-right: 2%;" />
  <img src="screens/5.png" alt="Environment Variables" width="48%" style="border-radius: 8px;" />
</div>
<br>
<div align="center">
  <img src="screens/6.png" alt="Reporting & History" width="48%" style="border-radius: 8px; margin-right: 2%;" />
  <img src="screens/7.png" alt="Scheduling" width="48%" style="border-radius: 8px;" />
</div>

---

## 🔥 Key Features

### 🧪 1. Intelligent Test Creation
Define your API requests with precision. **Pulse** supports:
- **Dynamic Payloads**: Use JSON for body and headers with full support for environment variables `{{variable}}`.
- **Mock Data Injection**: Automatically generate random values (UUIDs, names, emails, credit cards, dates) at runtime using built-in placeholders (e.g. `{{$guid}}`, `{{$timestamp}}`).
- **Multi-Method Support**: Full CRUD (GET, POST, PUT, DELETE, PATCH, etc.) support.
- **Advanced Assertions**: Validate your API results with a variety of built-in operators (`eq`, `ne`, `contains`, `exists`, JSONPath `$.data.id`).

### ⛓️ 2. Advanced Workflow Orchestration (Flows)
Don't just test endpoints; test **Business Scenarios**. Our "Flow" engine allows you to:
- **Chain Requests**: Execute multiple API calls in a strict sequence.
- **Data Extraction & Pipelining**: Capture values from one response (e.g., an `access_token` or `transaction_id` via JSONPath) and inject them into subsequent steps.
- **Conditional Execution**: Stop the flow immediately if any step fails to meet expectations.
- **Drag & Drop Ordering**: Easily reorder your steps to build complex test cases playfully.

### ⏱️ 3. Industrial-Grade Scheduling
Turn your tests into a pro-active monitoring system.
- **Periodic Runs**: Schedule individual tests, all project tests, or entire multi-step flows to run at regular intervals (every 5 mins, hourly, daily, etc.).
- **Environment Targeting**: Run your schedules explicitly against `Staging`, `Production`, or any custom environment.

### 🔒 4. The Security Vault (Environment Management)
Security is not an afterthought in **Pulse**.
- **AES-256 Encryption**: All sensitive keys, tokens, and secrets are encrypted at rest in the database.
- **UI Masking**: Secured variables are never shown in plain text; they appear as `secret:***` in history logs, UI panels, and reports.
- **Environments**: Keep your `Development`, `Staging`, and `Production` variables strictly separated and quickly switch between them.

### 🔔 5. Instant Notifications & Webhooks
Stay ahead of the game with real-time feedback.
- **Success & Failure Alerts**: Get notified via Slack, Teams, or any custom Webhook when a scheduled job completes.
- **Comprehensive Payloads**: Every notification includes a summary of tests passed, failed, and context.

### 📊 6. Premium Dashboard & Analytics
High-fidelity data visualization for technical leads.
- **Success Rates**: Monitor the health of all projects at a glance.
- **Performance Trends**: Track average response times and duration trends.
- **Live History**: A detailed, searchable log of every manual and scheduled run with full request/response snapshots.

---

## 🚀 Getting Started

**Pulse** is designed to be self-hostable, lightweight, and incredibly easy to launch. We use Docker to make the deployment entirely frictionless.

### 🐳 Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/beytullahgurpinar/pulse-test-suite.git
cd pulse-test-suite

# Configure your environment (optional but recommended for production)
# cp .env.example .env

# Launch the entire stack (Frontend, Backend, and Database)
docker-compose up -d --build
```
Your monitoring suite is now live at **[http://localhost:8181](http://localhost:8181)**.

*(Default credentials for first setup are managed via your very first registration which claims the Admin Space).*

---

## 🛠️ Tech Stack

**Pulse** is built on a modern stack designed for raw performance, reliability, and enterprise aesthetics:

- **Backend Architecture**: Go (Golang) — High-concurrency, memory-safe, and blazing fast execution.
- **Frontend Layer**: React 18 + TypeScript + Vite — Type-safe, blazingly fast HMR, and responsive.
- **Design System**: MUI Joy UI — Premium, modern, heavily customized aesthetic out of the box.
- **Data Persistence**: MySQL 8.0 — Structured, relational, and highly reliable data storage via GORM.

---

## 🤝 Community & Contributions

**Pulse** is a source-available initiative built to solve real engineering bottlenecks. We strongly welcome pull requests!

Looking to contribute?
- Add new **assertion operators** (e.g., regex matching).
- Expand **mock data generation** types.
- Enhance performance optimizations or add external integrations (Jira, PagerDuty).

Just fork the repo, create your feature branch, and submit a PR.

---

## ⚖️ License

This project is licensed under the **MIT License + Commons Clause 1.0**.

**Pulse** is completely free for individuals, students, and open-source development. You can host it internally for your company without restrictions. However, the **Commons Clause** prevents the sale of this software or providing it as a commercial hosted service (SaaS) where the primary value derived is the software itself.

*See the [LICENSE](LICENSE) file for the full text.*

---
<div align="center">
  <i>Developed with ❤️ by <b>Beytullah Gürpınar</b></i>
</div>
