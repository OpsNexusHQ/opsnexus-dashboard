# OpsNexus Dashboard (`opsnexus-dashboard`)

[![Release](https://img.shields.io/badge/release-v0.5.0-blue.svg)](https://github.com/OpsNexusHQ/opsnexus-dashboard/releases/tag/v0.5.0)
[![React](https://img.shields.io/badge/react-19.0-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-3178C6.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/vite-8.2-646CFF.svg)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Real-time infrastructure observability dashboard for **OpsNexus**. Built with React 19, TypeScript, and Vanilla CSS, featuring a sleek, dark DevOps console interface.

---

## 🎨 UI Aesthetic & Design System

OpsNexus Dashboard utilizes a dark-mode infrastructure aesthetic with high contrast, precise color encoding, and real-time streaming status badges:

- **Background**: `#070b12` (Base) / `#0d1320` (Surface) / `#121a2e` (Cards)
- **Status Encoding**: Emerald (Healthy), Amber (Stale/Acked), Red (Critical/Offline), Electric Blue (Accent)
- **Typography**: Inter (UI text) & JetBrains Mono (Metric values & timestamps)

---

## ✨ Implemented Features (v0.5.0)

- **Fleet Overview Page (`/`)**: Total agents count, healthy/stale/offline breakdown, active incidents overview, and fleet activity log.
- **Agent Listing Page (`/agents`)**: Filterable table of registered servers with CPU/RAM metrics, health status, and quick search.
- **Agent Detail Page (`/agents/:id`)**: Real-time gauge metrics, system metadata, process counters, and interactive SVG time-series analytics charts with range selector (`15m`, `1h`, `6h`, `24h`, `7d`).
- **Alerts & Incident Page (`/alerts`)**: Incident list with status filters (`Firing`, `Acknowledged`, `Resolved`), severity badges (`critical`, `warning`, `info`), and side drawer for timeline & comments.
- **Alert Detail Drawer**: Interactive side panel displaying incident progression (Triggered → Acknowledged → Comments → Resolved) with acknowledgment triggers and discussion notes.
- **Platform Settings Page (`/settings`)**: Tabbed configuration interface for Notification Channels (Webhook & Slack tests), Alert Rules, API Tokens (RBAC), and System Retention.
- **Real-Time SSE Engine**: `EventSource` subscriber with automatic reconnection backoff and header status indicators (`● Live`, `● Reconnecting`, `● Polling`).

---

## 📸 Screenshots & UI Previews

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⬡ OpsNexus  ▦ Overview   ⬡ Agents   🔔 Alerts (2)   ⚙️ Settings   ● Live     │
├─────────────────────────────────────────────────────────────────────────────┤
│ FLEET OVERVIEW                                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ Total Agents │ │ Healthy      │ │ Stale        │ │ Active Alerts│         │
│ │ 12           │ │ 10           │ │ 1            │ │ 2 Firing     │         │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                                             │
│ REAL-TIME METRICS & INCIDENTS                                               │
│ ┌────────────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ CPU Usage Time-Series (1h)             │ │ Firing Incidents             │ │
│ │ 100% ┤                                 │ │ 🔴 High CPU Usage > 85%      │ │
│ │  50% ┤      /\                         │ │    agent-prod-01 (2m ago)   │ │
│ │   0% └──────/──\────────────────────── │ │ 🟡 Memory Warning > 80%      │ │
│ └────────────────────────────────────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | OpsNexus Backend URL |

---

## 🚀 Quickstart & Setup

### Requirements
- Node.js 18+
- npm or pnpm

### Local Development
```bash
# 1. Clone & Install
git clone https://github.com/OpsNexusHQ/opsnexus-dashboard.git
cd opsnexus-dashboard
npm install

# 2. Start Dev Server
npm run dev
```
Open **http://localhost:5173** in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 🗺️ Roadmap (Future Scope)

- [ ] **Dark/Light Theme Switcher**: Toggleable theme preference.
- [ ] **Dashboard Drag-and-Drop Layout**: Customizable dashboard widgets.
- [ ] **Trace Viewer**: APM distributed transaction tracing visualizer.
- [ ] **Kubernetes Pod Topology**: Visual pod dependency graph.

---

## 📄 License

Part of the [OpsNexus](https://github.com/OpsNexusHQ) ecosystem. Licensed under the MIT License.
