# GuardPay: Policy-Bound Autonomous Agent Wallets & Anomaly-Gated PayPal Payments

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deployed on Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg)](https://render.com)
[![PayPal Developer Platform](https://img.shields.io/badge/PayPal-Orders_v2_%7C_Payouts_%7C_Subscriptions-003087.svg)](https://developer.paypal.com)
[![AG Grid Enterprise Ready](https://img.shields.io/badge/Telemetry-AG_Grid-0080FF.svg)](https://www.ag-grid.com)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP-orange.svg)](https://modelcontextprotocol.io)

> **Build What's Next with PayPal & AI Global Hackathon Submission**  
> Built for: **Best Use of Agentic Commerce ($5k)** | **Best Use of PayPal + AI ($5k)** | **Best Use of AG Grid ($5k)** | **Best Use of Render ($1k)** | **1st Place Overall ($12k)**

---

## 🌟 The Problem
As autonomous AI agents (Claude Computer Use, AutoGPT, coding bots, research agents) become capable of completing end-to-end work, they inevitably hit the **payment wall**. Giving an autonomous LLM unconstrained access to a credit card or bank account is terrifying due to hallucination loops, indirect prompt injections, and rogue spending.

## 🛡️ The Solution: GuardPay
**GuardPay** is the policy-bound financial firewall and telemetry bridge sitting between autonomous AI agents and the **PayPal Developer Platform**.
1. **Model Context Protocol (MCP) Server**: Any agent (Claude Desktop, Cursor, Gemini CLI) connects natively to PayPal via standard tools (`request_spend_authorization`, `check_budget_status`, `execute_order`).
2. **Dual-Key Cryptographic Agent Token**: Issues 120-second scoped tokens bound strictly to merchant domain, category, and HMAC-verified rationale. Tamper attempts fail closed.
3. **PayPal Sandbox Core Engine**:
   - **Orders v2 (Authorize & Capture)**: 2-step spend execution with autonomous hold and policy clearance.
   - **Subscriptions API**: Automated budget replenishment intervals for approved agent identities.
   - **Payouts API**: Agent-to-Agent (A2A) micro-settlements between autonomous service providers.
   - **Webhook Verification**: Cryptographic HMAC-SHA256 signature verification preventing replay attacks.
4. **AG Grid Real-Time Telemetry Bridge**: High-density command console with live transaction streaming, agent reasoning audit (Chain of Thought), dynamic risk badges, and 1-click token freeze triggers.

---

## 🏗️ Monorepo Architecture
```
PAYPAL/
├── packages/
│   ├── backend/        # Fastify / Node.js API with PayPal SDK & Policy Engine
│   ├── dashboard/      # Next.js 15 + AG Grid Real-time Telemetry Dashboard
│   └── mcp-server/     # Official Model Context Protocol (MCP) server for PayPal
├── render.yaml         # Blueprint specification for Render deployment
└── package.json        # Workspace configuration
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js >= 20.x
- PayPal Developer Sandbox credentials (Client ID + Secret)

### 1. Environment Setup
Copy `.env.example` in `packages/backend` and insert your sandbox keys:
```bash
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_MODE=sandbox
PORT=4000
```

### 2. Run Locally
```bash
npm install
npm run dev
```
- Dashboard: `http://localhost:3000`
- API & Webhook Service: `http://localhost:4000`
- MCP Server: Stdio endpoint ready for Claude Desktop / Cursor configuration.
