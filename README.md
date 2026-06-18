# 🚀 HiringAI Platform

## Problem Statement

The traditional hiring process is largely manual, time-consuming, and inefficient. Recruiters must individually screen resumes, conduct assessments, schedule interviews, and evaluate candidates, which demands significant effort and resources. This often results in delays, inconsistent decision-making, human bias, and missed opportunities to identify the most suitable talent. As the number of applicants increases, managing the process effectively becomes even more challenging, reducing overall hiring efficiency and quality.

## Solution

To address these challenges, we propose a full-stack, AI-powered hiring platform that automates and streamlines the entire recruitment workflow. The system intelligently screens resumes, conducts coding and aptitude assessments, and supports structured technical interviews.

It provides dedicated dashboards for both recruiters and candidates, integrates proctoring and evaluation tools, and delivers real-time analytics for better decision-making. By leveraging AI and modern web technologies, the platform ensures a faster, fairer, and more efficient hiring process while improving candidate experience and helping organizations select the best talent with confidence.


**HiringAI** is an AI-powered end-to-end recruitment platform that automates the entire hiring pipeline—from resume screening to AI-led voice interviews.

Developed by **Gopal Muri**, this project eliminates recruitment bottlenecks using advanced AI, vector search, and real-time voice technology.

---

## 🌟 Key Features

### 🔍 1. Intelligent Resume Screening (RAG-Driven)
*   **Vector Search:** Uses **ChromaDB** and **Sentence-Transformers** for semantic resume analysis
*   **AI Ranking:** Employs **Groq (Llama 3.1)** to score and rank candidates against job descriptions

### 🧠 2. Dynamic Aptitude Assessments
*   **AI Question Generation:** Automatically generates unique aptitude tests tailored to job roles
*   **Real-time Grading:** Instant scoring and performance analytics
*   **Anti-Malpractice:** Built-in proctoring system with violation tracking

### 💻 3. AI-Powered Coding Round
*   **Monaco Editor:** Full-featured code editor supporting multiple languages (Python, Java, JavaScript, C)
*   **Secure Execution:** Code executed via **Piston API** in isolated environments
*   **AI Evaluation:** Groq LLM validates logic, performance, and edge cases
*   **Test Case Management:** Dynamic test case generation and validation

### 🎙️ 4. Autonomous AI Voice Interview
*   **Real-time Interaction:** Integration with **Vapi AI** for seamless voice interviews
*   **Adaptive Questioning:** AI dynamically adjusts questions based on candidate responses
*   **Full Transcripts:** Complete audio transcripts with AI-generated analysis

### 📊 5. Admin Dashboard
*   **Candidate Management:** Track candidates through all hiring stages
*   **Performance Analytics:** Detailed reports for every assessment
*   **Bulk Operations:** Promote/reject multiple candidates simultaneously
*   **Email Automation:** Automated notifications for assessments and offers

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js, Vite, TailwindCSS, Framer Motion, Monaco Editor, GSAP, Three.js, Recharts |
| **Backend** | FastAPI (Python), SQLAlchemy, MySQL, Pydantic |
| **AI / LLM** | Groq (Llama 3.1-8b-instant), Vapi AI (Voice Interviews), Piston API (Code Execution) |
| **Vector DB** | ChromaDB with Sentence-Transformers |
| **Auth** | Clerk (Admin), JWT + Bcrypt (Candidates) |
| **Email** | SMTP (Gmail) |

---

## ⚙️ Installation & Setup

### Prerequisites
*   **Node.js** (v18+)
*   **Python** (3.9+)
*   **MySQL** (8.0+)
*   **API Keys**: 
    - Groq API Key
    - Vapi AI API Key
    - Clerk Publishable Key (for admin auth)

### Backend Setup

1. **Create MySQL Database:**
   ```sql
   CREATE DATABASE hiringai;
   ```

2. **Navigate to backend:**
   ```bash
   cd backend/
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure `.env` file:**
   ```env
   # Database
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=hiringai
   DB_PORT=3306

   # AI APIs
   GROQ_API_KEY=your_groq_api_key
   VAPI_API_KEY=your_vapi_api_key

   # Email (Gmail SMTP)
   EMAIL_HOST_USER=your_email@gmail.com
   EMAIL_HOST_PASSWORD=your_app_password

   # Frontend URL
   FRONTEND_URL=http://localhost:5173

   # Optional
   REDIS_URL=redis://localhost:6379/0
   DEBUG=True
   ```

5. **Run database migration:**
   ```bash
   python add_started_at_column.py
   ```

6. **Start the server:**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd frontend/
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure `.env` file:**
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs

---

## � Project Structure

```
HiringAI/
├── backend/
│   ├── routers/          # API endpoints
│   ├── services/         # AI services (RAG, generators, evaluation)
│   ├── models.py         # Database models
│   ├── database.py       # DB configuration
│   └── main.py           # FastAPI app
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   └── hooks/        # Custom React hooks (proctoring)
│   └── public/
└── README.md
```

---

## 🔐 Authentication

- **Admin**: Clerk-based authentication for dashboard access
- **Candidates**: JWT-based authentication for assessment portal
- **Session Management**: Secure token handling with auto-expiry

---

## 📊 Key Workflows

1. **Resume Upload** → AI Screening → Candidate Ranking
2. **Assessment Assignment** → Aptitude/Coding Tests → AI Evaluation
3. **Interview Scheduling** → Vapi AI Voice Interview → Transcript Analysis
4. **Offer Management** → Automated Email Notifications

---

## 🎯 Anti-Malpractice Features

- Tab switch detection
- Window focus monitoring
- Copy-paste prevention
- Fullscreen enforcement
- Auto-submission on violations (3-strike system)

---

## 👨‍💻 Developed By

**Gopal Muri**  
*Junior AI Intern @ Third Eye Data*

---

## 📝 License


*Built with ❤️ for autonomous hiring systems*

---
