# 🚀 Zero-Leakage Deployment Guide: Publishing to GitHub Pages

This guide provides step-by-step instructions for hosting the **Personal Inbox AI Interactive Live Demo & Case Study** on GitHub Pages as a public repository while keeping your core backend architecture, models, database, and private credentials **100% private and protected**.

---

## 🛡️ Security & Intellectual Property Guarantee

By following these instructions:
- **Zero Core Code Exfiltration**: Your private Next.js app, IMAP/SMTP Hermes daemon, SQLite database, and API keys are never pushed to the public repository.
- **Zero Commit History Leakage**: Using an isolated repository ensures that private commit histories and diffs from the core project are completely omitted.
- **Zero CORS / Serverless Dependency**: The demo runs 100% client-side in the browser using static HTML/JS and pre-sanitized datasets.

---

## 📦 Directory Contents of `demo/`

Verify your `demo/` folder contains only these public-safe static assets:
```
demo/
├── .nojekyll                # Bypasses Jekyll processing on GitHub Pages
├── index.html               # High-fidelity dashboard & case study UI
├── app.js                   # Client-side reactivity, search, batch dock, and simulators
├── demo-data.js             # Global window.INITIAL_DATA for file:// local preview
├── demo-data.json           # Sanitized JSON dataset (36 records)
├── README.md                # Recruiter-ready technical case study
├── DEPLOYMENT_GUIDE.md      # This deployment manual
└── screenshots/             # UI screenshots for README and portfolio showcase
    ├── 01-inbox-editorial-en.png
    ├── 02-inbox-neobrutal-en.png
    ├── 03-inbox-persian-editorial.png
    ├── 04-inbox-persian-neobrutal.png
    ├── 05-smart-reply-assistant.png
    ├── 06-decision-intelligence-breakdown.png
    └── 07-control-center-settings.png
```

---

## 🛠️ Deployment Method 1: Clean Standalone Repository (Recommended)

This is the safest and cleanest method. It initializes a brand-new Git repository containing **only** the `demo/` directory files.

### Step 1: Create a New Public Repository on GitHub
1. Log into your GitHub account.
2. Go to [https://github.com/new](https://github.com/new).
3. Name your repository (e.g., `personal-email-assistant` or `personal-inbox-demo`).
4. Set the visibility to **Public**.
5. Do **NOT** initialize with a README, .gitignore, or license (we already have them).
6. Click **Create repository**.
7. Copy the repository URL (e.g., `https://github.com/<your-username>/personal-email-assistant.git`).

### Step 2: Initialize and Push the `demo/` Folder
Run the following commands in your terminal (PowerShell or Bash):

```bash
# 1. Navigate into the demo folder
cd "demo"

# 2. Initialize a fresh, independent git repository
git init -b main

# 3. Stage all sanitized demo assets
git add .

# 4. Create the initial commit
git commit -m "feat: initial release of live demo and system architecture case study"

# 5. Link your new public GitHub repository
git remote add origin https://github.com/<your-username>/personal-email-assistant.git

# 6. Push to GitHub
git push -u origin main
```

*(Replace `<your-username>` with your actual GitHub username).*

---

## 🛠️ Deployment Method 2: Git Subtree from Monorepo (Advanced)

If you prefer to keep the `demo/` directory inside your private repository and selectively push only the subtree to your public repository:

```bash
# 1. From the root of your private project, add the public remote
git remote add public-demo https://github.com/<your-username>/personal-email-assistant.git

# 2. Push ONLY the demo/ folder to the public repository's main branch
git subtree push --prefix demo public-demo main
```

---

## 🌐 Enabling GitHub Pages

Once your code is pushed to your public repository:

1. On GitHub, navigate to your public repository.
2. Click **Settings** (top right tab).
3. In the left navigation sidebar, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` from the dropdown and leave the folder as `/ (root)`.
   - Click **Save**.
5. Wait ~60 seconds for GitHub Actions to complete the build.
6. Your live demo will be accessible at:
   ```
   https://<your-username>.github.io/personal-email-assistant/
   ```

---

## 🧪 Local Preview & Quality Verification

You can test the demo immediately on your local machine before pushing:

### Option A: Direct File Preview (Zero Server Required)
Simply double-click `demo/index.html` or open in your browser:
```
file:///C:/Users/A/Documents/Personal%20Inbox%20AI/demo/index.html
```
*Note: Because `demo-data.js` exposes `window.INITIAL_DATA`, all search, filtering, drawer views, and simulations function immediately without CORS errors on `file://` URLs.*

### Option B: Local HTTP Server
Run any lightweight static server:
```bash
# Node.js npx serve
npx serve demo

# Or Python 3
python -m http.server 8080 --directory demo
```
Open `http://localhost:3000` or `http://localhost:8080` in your browser.

---

## ✅ Pre-Flight Checklist

Before sharing on your resume or portfolio:
- [x] `.nojekyll` file exists in the repository root.
- [x] No private `.env`, database connection strings, or IMAP/SMTP passwords are present.
- [x] All 36 sanitized records load cleanly and search operates instantaneously.
- [x] Both themes (**Warm Editorial** & **Neo-Brutalist**) render crisply.
- [x] Architecture modal displays high-contrast system flow diagrams.
- [x] Live Terminal simulator streams background logs smoothly.
- [x] Batch dock emerges on selecting rows and exports UTF-8 BOM CSVs.
