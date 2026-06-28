# ⏳ CrunchTime — Agentic Task Management Dashboard

CrunchTime is an advanced, production-ready task management environment built for the **Vibe2Ship Hackathon**. It features secure individual user state tracking, instant client-side rendering, and a custom direct network pipeline to a **Gemini 2.5 Flash** AI assistant that acts as an active workspace agent—breaking down complex goals, predicting workloads, and dynamically modifying core dashboard states.

---

## 🚀 Interactive Feature Walkthrough

<details open>
<summary><b>🔐 Authentication & Database Layer</b></summary>
<br>

* **Secure OAuth Pipeline:** Integrated with Firebase Auth to provide seamless single-click Google Sign-In popups.
* **Live State Persistence:** Connected directly to a Google Cloud Firestore backend. Changes automatically push to a dedicated user collection using atomic `writeBatch` transactions.
* **Offline Resiliency:** Implemented localized fail-safes that dynamically switch back to local storage structures if the cloud synchronization layer experiences structural network drops.
</details>

<details>
<summary><b>🤖 Agentic AI Assistant Drawer</b></summary>
<br>

* **Native Network Bridge:** Bypasses bloated client libraries by leveraging an optimized, secure asynchronous HTTP `fetch` routine directly targeting the Google AI Studio Gateway.
* **Contextual Awareness:** The application automatically serializes your current active task matrices and injects them alongside live system clock markers directly into the execution context.
* **Automated Action Interceptor:** The AI doesn't just talk; it thinks in raw execution objects. It analyzes casual user messages, determines complex goals, and executes automated dashboard operations (`ADD_TASK`, `COMPLETE_TASK`, `DELETE_TASK`, `SUGGEST_FOCUS`, `BREAKDOWN_TASK`).
</details>

<details>
<summary><b>📊 Production Analytics & UI Architecture</b></summary>
<br>

* **Dynamic Ticker Loops:** JavaScript background engines calculate exact rolling deadlines, triggering dynamic styling re-assignments (`is-urgent`, `is-overdue`) in real-time.
* **Analytical Metrics:** Features real-time priority distribution breakdowns, continuous productivity metric trackers, and a custom canvas-rendered 7-day completion velocity chart.
</details>

---

## 🛠️ System Architecture & Tech Stack

| Layer | Technology Implemented | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, CSS3 Variables, ES6 JavaScript Modules | Delivers a clean, modular, zero-dependency environment. |
| **Cloud Engine** | Firebase App Core, Auth Module, Cloud Firestore | Manages state sync and authentication layers. |
| **Cognitive AI** | Google AI Studio (Gemini 2.5 Flash API) | Drives agentic decision pipelines and automation trees. |

---

## 🔧 Local Workspace Setup Instructions

Follow these manual steps to evaluate or execute the project locally on your machine:

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/CrunchTime.git](https://github.com/YOUR_USERNAME/CrunchTime.git)
   cd CrunchTime
