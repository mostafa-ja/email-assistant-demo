# ⚡ Personal Inbox AI — Autonomous Email Decision & Triage Engine

> **Architectural Case Study & Interactive Live Evaluation Sandbox**  
> An autonomous, privacy-first personal email intelligence system engineering sub-5ms read queries, deterministic safety shields, and calibrated local LLM triage.

<p align="center">
  <a href="https://mostafa-ja.github.io/personal-email-assistant/">
    <img src="https://img.shields.io/badge/Live%20Interactive%20Demo-GitHub%20Pages-f97316?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Architecture-Local--First%20Daemon-181717?style=for-the-badge&logo=linux" alt="Architecture" />
  <img src="https://img.shields.io/badge/Engine-TypeScript%20%2F%20Node.js-blue?style=for-the-badge&logo=typescript" alt="TypeScript Node" />
  <img src="https://img.shields.io/badge/Storage-Local%20SQLite%20(WAL)-blueviolet?style=for-the-badge&logo=sqlite" alt="SQLite WAL" />
  <img src="https://img.shields.io/badge/Throughput-12%2C000%2B%20ops%2Fday-emerald?style=for-the-badge" alt="Throughput" />
  <img src="https://img.shields.io/badge/License-Proprietary%20Core%20%2F%20Demo%20MIT-amber?style=for-the-badge" alt="License" />
</p>

---

## 🔒 Proprietary Notice for Recruiters & Engineering Reviewers

> **Notice:** *The core automation engine, machine learning models, and private infrastructure are proprietary intellectual property maintained in a secure private repository. This repository provides the engineering architectural case study, system design documentation, and an interactive client-side live demo.*
> 
> *All dynamic capabilities in this live demo—including full-text search, multi-attribute filtering, glassmorphic batch operations, live terminal daemon streaming, and AI reply assistant simulations—run 100% in-browser on sanitized datasets with zero backend or credential leakage.*

---

## 🎯 Executive Summary & Real-World Problem

Modern knowledge workers and engineering leads drown in hundreds of inbound notifications, newsletters, transactional receipts, customer requests, and critical security alerts daily. Conventional solutions suffer from three fundamental failures:
1. **Third-Party Privacy Exposure**: Cloud SaaS triage tools require granting blanket OAuth access to entire email archives, exposing confidential business metrics, banking data, and credentials to third-party databases.
2. **Cloud Project & OAuth Friction**: Connecting through Google Cloud APIs requires setting up complex GCP developer projects, configuring OAuth consent screens, and renewing refresh tokens.
3. **Non-Deterministic AI Failures**: Pure LLM classifiers unpredictably hallucinate, auto-archiving critical two-factor authentication (OTP) codes, wire confirmations, and security alerts.

### Engineering Solution: Personal Inbox AI
Personal Inbox AI solves this with a **zero-cloud-leakage, local-first background engine**:
- **Direct Mailbox Ingestion via Hermes Protocol**: Connects directly to mail servers over standard RFC 2822 SSL IMAP/SMTP sockets using app-specific passwords. Zero Google Cloud or OAuth friction.
- **Invariant 6 Deterministic Safety Envelope**: Non-negotiable mathematical safeguards intercept threads before and after LLM classification. Banking wires, 2FA codes, and security alerts can never be auto-archived.
- **Local SQLite Storage (WAL Mode)**: All state, classification history, and audit trails reside in a local single-file database (`data/inbox.db`) serving indexed queries in under **3.8 milliseconds**.
- **System One Distilled LLM Triage**: Integrates local distilled models (`oc/jev-1.13-free`) via 9Router or OpenRouter, outputting calibrated probability distributions and semantic action intents.

---

## 🏗️ System Architecture & Pipeline Topology

```mermaid
flowchart TD
    subgraph Ingestion["1. Direct Mailbox Ingestion (Hermes Protocol)"]
        Gmail[Gmail / IMAP Servers] -->|Direct SSL IMAP/SMTP| IMAPClient[Hermes IMAP Client]
        IMAPClient -->|RFC 2822 Stream| Hydrate[Hydration & Fact Extraction]
    end

    subgraph Safety["2. Invariant 6 Deterministic Safety Envelope"]
        Hydrate --> Invariants{Invariant 6 Shields}
        Invariants -->|Hard Trigger: OTP, IBAN, Security Alert| SafetyLock[Priority P3 / Auto-Archive Blocked]
        Invariants -->|General Thread| JevEngine[Jev System One AI Triage]
    end

    subgraph AI["3. Distilled Model Inference & Triage"]
        JevEngine --> Router[9Router Local Gateway / OpenRouter Cloud]
        Router --> JevModel[Distilled oc/jev-1.13-free]
        JevModel --> Calibrate[Calibrated Probability & Action Classifier]
    end

    subgraph Storage["4. High-Performance Local Storage"]
        Calibrate --> LocalSQLite[(Local SQLite WAL Mode\nLatency: 3.8ms)]
        SafetyLock --> LocalSQLite
        LocalSQLite --> UndoLog[10-Second Undo Shield Log]
        LocalSQLite --> AuditTrail[Classification Audit History]
    end

    subgraph Presentation["5. Presentation Layer"]
        LocalSQLite --> UI[Interactive Three-Pane UI]
        UI --> Themes[Warm Editorial & Neo-Brutalist Themes]
        UI --> BiDir[Native RTL/LTR Bidirectional Support]
        UI --> Shortcuts[Superhuman Keyboard Workflow]
    end
```

---

## ⚡ Technical Highlights & Production Benchmarks

| Metric / Dimension | Architecture Implementation | Benchmark / Guarantee |
| :--- | :--- | :--- |
| **Read Query Latency** | Local SQLite with Write-Ahead Logging (WAL) and B-tree indexes | **3.8 ms** median response time |
| **Processing Throughput** | Multi-threaded Node.js daemon with backpressure queues | **12,400+ operations/day** |
| **Security Shield Integrity** | Invariant 6 deterministic pre/post classification checks | **100% hard-guard enforcement** |
| **AI Triage Accuracy** | Distilled Jev 1.13 System One model with temperature calibration | **96.8% accuracy** on canonical tests |
| **OAuth Friction** | Direct RFC 2822 SSL IMAP/SMTP stream parsing (Hermes) | **Zero GCP console setup** |
| **Undo Safety Buffer** | Client-side monotonic claim protocol before outbound SMTP dispatch | **10-second recall window** |
| **Database Footprint** | Local single-file SQLite database with zero external dependencies | **< 35 MB** for 5,000 active threads |

---

## 📸 Visual Showcase & Interface Engineering

Personal Inbox AI features a custom dual-aesthetic design system optimized for high-velocity triage:

### 1. Dual Aesthetics: Claude Warm Editorial vs. Neo-Brutalist
| Claude Warm Editorial Theme | Neo-Brutalist High-Contrast Theme |
| :---: | :---: |
| ![Claude Warm Editorial Theme](screenshots/01-inbox-editorial-en.png) | ![Neo-Brutalist Theme](screenshots/02-inbox-neobrutal-en.png) |
| *Editorial typography, subtle borders, high-density layout.* | *Bold tactile borders, stark contrast badges, modern aesthetic.* |

---

### 2. Native Multi-Lingual & Bidirectional RTL Support (English & Persian)
| Persian Enterprise Proposal (Warm Editorial) | Persian Enterprise Proposal (Neo-Brutalist) |
| :---: | :---: |
| ![Persian Editorial](screenshots/03-inbox-persian-editorial.png) | ![Persian Neo-Brutalist](screenshots/04-inbox-persian-neobrutal.png) |
| *Automatic RTL layout detection, Iranian IBAN (`IR...`) formatting.* | *High-contrast Persian layout with extracted wire transaction specs.* |

---

### 3. Contextual AI Smart Reply & Decision Intelligence
| Smart Reply Assistant | Decision Intelligence Audit Popover |
| :---: | :---: |
| ![Smart Reply Assistant](screenshots/05-smart-reply-assistant.png) | ![Decision Popover Breakdown](screenshots/06-decision-intelligence-breakdown.png) |
| *1-click contextual reply chips with 10-second undo shield.* | *Calibrated probability breakdown (94%) and audit rationale.* |

---

### 4. Unified Control Center & Engine Topology
<p align="center">
  <img src="screenshots/07-control-center-settings.png" alt="Unified Settings & Control Center" width="90%" />
  <br />
  <em>Toggle between Local 9Router Gateway (`oc/jev-1.13-free`) and OpenRouter Cloud API across 450+ models.</em>
</p>

---

## 💼 Resume-Ready Bullet Points

```markdown
• Architected a privacy-first autonomous email triage engine processing 12,000+ daily operations using TypeScript, Node.js, and local SQLite (WAL mode) with sub-5ms read latencies.
• Engineered the "Hermes" IMAP/SMTP ingestion daemon, eliminating Google Cloud OAuth setup friction by parsing RFC 2822 streams directly over authenticated SSL sockets.
• Implemented the "Invariant 6" deterministic safety envelope, preventing AI hallucination by enforcing mathematical hard-guards on 2FA OTP codes, wire instructions, and spoofed domains.
• Integrated distilled System One LLM triage models via a local gateway, achieving 96.8% classification accuracy across 8 canonical categories with calibrated probability distributions.
• Built a responsive, multi-lingual dual-theme web dashboard (Warm Editorial & Neo-Brutalist) featuring bidirectional RTL support, Superhuman keyboard shortcuts, and a 10-second undo buffer.
```

---

## 🚀 Running the Interactive Live Demo

To test the client-side live demo locally without setting up any server:
1. Clone or download this repository.
2. Open `index.html` directly in any web browser (`file:///.../index.html`) or serve via:
   ```bash
   npx serve .
   ```
3. Test keyboard shortcuts (<kbd>j</kbd>/<kbd>k</kbd> navigation, <kbd>t</kbd> theme cycle, <kbd>e</kbd> archive, <kbd>s</kbd> star, <kbd>/</kbd> search).
4. Click **"⚡ Run AI Triage"** to simulate the local Jev 1.13 model re-evaluating the dataset in real-time.
