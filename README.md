# 🎬 Pulse Test Suite

### *The Professional-Grade API Monitoring & Workflow Orchestration Platform.*

**Pulse Test Suite** is a powerful, developer-centric platform designed for teams that need to go beyond simple manual API calls. It combines automated testing, multi-step workflow orchestration, and 24/7 monitoring into a sleek, premium experience. Whether you're debugging a single endpoint or monitoring a complex microservices architecture, Pulse has you covered.

---

## 🔥 Key Pillars

### 🧪 1. Intelligent Test Creation
Define your API requests with precision. **Pulse** supports:
-   **Dynamic Payloads**: Use JSON for body and headers with full support for environment variables `{{variable}}`.
-   **Mock Data Injection**: Automatically generate random values (UUIDs, names, emails, credit cards, dates) at runtime using built-in placeholders.
-   **Multi-Method Support**: Full CRUD (GET, POST, PUT, DELETE, PATCH, etc.) support.

### ⛓️ 2. Advanced Workflow Orchestration (Flows)
Don't just test endpoints; test **Business Scenarios**. Our "Flow" engine allows you to:
-   **Chain Requests**: Execute multiple API calls in a strict sequence.
-   **Data Extraction & Pipelining**: Capture values from one response (e.g., an `access_token` or `transaction_id`) and inject them into subsequent steps.
-   **Conditional Execution**: Stop the flow immediately if any step fails to meet expectations.

### ⏱️ 3. Industrial-Grade Scheduling
Turn your tests into a pro-active monitoring system.
-   **Periodic Runs**: Schedule individual tests or entire multi-step flows to run at regular intervals (every 5 mins, hourly, daily, etc.).
-   **Project-Scoped Schedulers**: Manage different schedules for each of your microservices or environments.

### 🔒 4. The Security Vault (Environment Management)
Security is not an afterthought in **Pulse**.
-   **AES-256 Encryption**: All sensitive keys, tokens, and secrets are encrypted at rest in the database.
-   **UI Masking**: Secured variables are never shown in plain text; they appear as `secret:***` in history logs and reports.
-   **Project Isolation**: Keep your `Development`, `Staging`, and `Production` variables strictly separated.

### 🔔 5. Instant Notifications (Slack & Webhooks)
Stay ahead of the game with real-time feedback.
-   **Success & Failure Alerts**: Get notified via Slack or any custom Webhook when a scheduled job completes.
-   **Comprehensive Reports**: Every notification includes a summary of tests passed, failed, and the direct link to the full report.

### 📊 6. Premium Dashboard & Analytics
High-fidelity data visualization for technical leads.
-   **Success Rates**: Monitor the health of all projects at a glance.
-   **Performance Trends**: Track average response times and duration trends.
-   **Live History**: A detailed, searchable log of every manual and scheduled run with full request/response snapshots.

---

## 🚀 Getting Started

**Pulse** is designed to be self-hostable and lightweight.

### 🐳 Quick Start with Docker
```bash
# Clone the vision
git clone https://github.com/beytullahgurpinar/pulse-test-suite.git
cd pulse-test-suite

# Launch everything
docker-compose up -d --build
```
Your monitoring suite is now live at **[http://localhost:8181](http://localhost:8181)**.

---

## 🛠️ Technical Foundation

**Pulse** is built on a stack designed for performance and reliability:
-   **Backend**: Go (High-concurrency and blazing fast execution).
-   **Frontend**: React + TypeScript (Type-safe and interactive UI).
-   **Aesthetics**: Joy UI (Premium, modern design system).
-   **Core**: MySQL (Structured and reliable data persistence).

---

## 🧬 Assertion Operators
Validate your API results with a variety of built-in operators:
-   **eq / ne**: Direct value matching.
-   **contains**: Search for substrings.
-   **exists / not_exists**: Schema validation.
-   **JSON Path Power**: Access any deep field in your response body (e.g., `$.data.orders[0].id`).

---

## 🤝 Community & Support
**Pulse** is a source-available initiative. We welcome pull requests for new assertion operators, dark mode enhancements, or performance optimizations!

---

## ⚖️ License

This project is licensed under the **MIT License + Commons Clause 1.0**.

**Pulse** is free for individuals, students, and open-source development. However, the **Commons Clause** prohibits the sale of the software or providing it as a commercial service (SaaS) where the primary value is derived from this software itself.

*See the [LICENSE](LICENSE) file for the full text.*

Developed with ❤️ by **Beytullah Gürpınar**
