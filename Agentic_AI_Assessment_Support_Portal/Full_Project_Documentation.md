# Agentic AI Assessment Support Portal - Technical Documentation

---

## 1. TITLE PAGE
- **Project Name:** Agentic AI Assessment Support Portal
- **Subtitle:** AI-Driven Candidate Inquiry & Proctoring Review System
- **System Type:** AI-Based Assessment & Proctoring Support Platform
- **Generated Date:** March 30, 2026
- **Developed By:** Virtusa Team Titans

---

## 2. TABLE OF CONTENTS
1. Introduction  
2. System Overview  
3. Requirements  
4. System Architecture  
5. Backend Core (main.py)  
6. Database Layer (database.py)  
7. AI Intelligence (ai_engine.py)  
8. Automated Reporting (Services)  
9. Frontend Architecture (React)  
10. Source Code: Backend Components  
11. Source Code: Frontend Components  
12. Security & Design Notes  
13. Conclusion  

---

## 3. INTRODUCTION
The **Agentic AI Assessment Support Portal** is a specialized extension of the Virtusa AI Proctoring ecosystem. Its primary function is to handle candidate queries regarding assessment results and proctoring violations. By leveraging **Generative AI (Gemini 2.5 Flash)** and **LangChain**, the system automatically analyzes candidate concerns against historical proctoring data to generate empathetic yet firm responses, significantly reducing the manual overhead for HR and academic administrators.

---

## 4. SYSTEM OVERVIEW
The portal implements a seamless workflow for post-assessment integrity reviews:
1.  **Candidate Verification:** Candidates login with their email and Assessment ID. The system verifies their enrollment and confirms that they have completed the required assessment.
2.  **Inquiry Submission:** Candidates provide a detailed query regarding specific logs or general results.
3.  **Cross-Database Data Retrieval:** The system fetches violation logs from the webcam, mobile, and plagiarism detection databases.
4.  **AI Analysis:** The AI Analyst persona reviews the candidate's query and the proctoring evidence to generate a structured narrative.
5.  **Automated Reporting:** A PDF report is generated with embedded proof links and sent directly to the candidate via email.

---

## 5. REQUIREMENTS
### Backend Dependencies (`backend/requirements.txt`)
- `fastapi`
- `uvicorn`
- `motor`
- `pydantic`
- `python-dotenv`
- `google-generativeai`
- `langchain-google-genai`
- `langchain-core`
- `fpdf2`
- `fastapi-mail`
- `cloudinary`

### Frontend Dependencies
- `react`, `react-dom`
- `react-router-dom`
- `axios`
- `vite` (Build Tool)

---

## 6. SYSTEM ARCHITECTURE
### Folder Structure
```text
Agentic_AI_Assessment_Support_Portal/
├── backend/
│   ├── Connection/
│   │   └── database.py          # Data persistence & cross-DB logic
│   ├── Engine/
│   │   └── ai_engine.py         # LangChain & Gemini AI core
│   ├── services/
│   │   ├── email_service.py     # SMTP notification module
│   │   └── pdf_service.py       # Report generation engine
│   ├── main.py                  # API routes & middleware
│   └── requirements.txt         # Backend dependencies
└── frontend/
    ├── src/
    │   ├── components/          # UI Components (Login, Form, etc.)
    │   ├── App.tsx              # Main routing
    │   └── main.tsx             # Entry point
```

---

## 7. BACKEND CORE (main.py)
The `main.py` serves as the central hub, managing candidate authentication and orchestrating the AI-driven support flow.

### API Endpoints Table
| Endpoint | Method | Description |
| :------- | :----- | :---------- |
| `/login` | `POST` | Verifies candidate enrollment and test completion status. |
| `/submit-query` | `POST` | Triggers the AI analysis and background email reporting. |
| `/health` | `GET` | System health check. |

---

## 8. DATABASE LAYER
The system utilizes a **multi-tenant MongoDB architecture** to bridge proctoring data and support requests.
- **`AssessmentDB.Enrollment_DB`**: Primary source for verifying candidate identities.
- **`proctoring.violation_logs`**: Stores webcam-based proctoring flags.
- **`proctoring.Mobile_violation_logs`**: Stores secondary camera (mobile) violations.
- **`proctoring.Code_Detection_DB`**: Stores plagiarism and coding pattern violations.
- **`SupportPortalDB.candidate_queries`**: Persists all support tickets and their statuses.

---

## 9. MODULES / SERVICES
### AI Engine (`ai_engine.py`)
Uses **Gemini 2.5 Flash** with randomized system prompts (HR Manager vs. Senior Analyst) to provide unique, professional, and empathetic responses to candidates.

### Reporting Service (`pdf_service.py`)
A custom PDF engine that converts markdown-style AI responses into formatted legal-standard reports, complete with evidence tables and clickable proof links.

---

## 10. SOURCE CODE: BACKEND COMPONENTS

### [backend/main.py]
```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from Connection import database
from Engine import ai_engine
from services import pdf_service
from services import email_service
import os

app = FastAPI(title="Assessment Support Portal API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    assessment_id: str

class QueryRequest(BaseModel):
    email: str
    assessment_id: str
    query: str

@app.post("/login")
async def login(req: LoginRequest):
    is_valid, message = await database.verify_candidate(req.email, req.assessment_id)
    if not is_valid:
        raise HTTPException(status_code=401, detail=message)
    return {"status": "success", "message": "Verified"}

@app.post("/submit-query")
async def submit_query(req: QueryRequest, background_tasks: BackgroundTasks):
    # 1. Save query to DB
    await database.save_query_data(req.email, req.assessment_id, req.query)
    
    # 2. Get Candidate Info (name + assessment name)
    candidate_info = await database.get_candidate_info(req.email, req.assessment_id)
    candidate_name = candidate_info["candidate_name"]
    assessment_name = candidate_info["assessment_name"]
    
    # 3. Get Violation Data
    violation_data = await database.get_violation_summary(req.email, req.assessment_id)
    
    # 4. Analyze with AI
    analysis = await ai_engine.analyze_query(req.query, violation_data)
    
    # 5. Generate PDF Report
    pdf_path = pdf_service.generate_pdf_report(candidate_name, req.email, assessment_name, req.assessment_id, analysis, violation_data)
    
    # 6. Send Email in Background
    background_tasks.add_task(email_service.send_report_email, req.email, req.assessment_id, pdf_path)
    
    return {"status": "success", "message": "Query submitted successfully. A report will be sent to your email."}

@app.get("/health")
async def health():
    return {"status": "up"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8003))
    print(f"Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
```

### [backend/Connection/database.py]
```python
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI_ASSESSMENT = os.getenv("MONGO_URI_ASSESSMENT", "...")
MONGO_URI_PROCTORING = os.getenv("MONGO_URI_PROCTORING", "...")
MONGO_URI_CANDIDATE = os.getenv("MONGO_URI_CANDIDATE", "...")

client_assessment = AsyncIOMotorClient(MONGO_URI_ASSESSMENT)
client_proctoring = AsyncIOMotorClient(MONGO_URI_PROCTORING)
client_candidate = AsyncIOMotorClient(MONGO_URI_CANDIDATE)

db_assessment = client_assessment["AssessmentDB"]
enrollment_col = db_assessment["Enrollment_DB"]

db_proctoring = client_proctoring["proctoring"]
violation_logs_col = db_proctoring["violation_logs"]
mobile_violation_logs_col = db_proctoring["Mobile_violation_logs"]
code_detection_col = db_proctoring["Code_Detection_DB"]

db_candidate = client_candidate["CandidateDB"]
mcq_results_col = db_candidate["MCQ_Results"]
coding_results_col = db_candidate["Coding_Results"]
sql_results_col = db_candidate["SQL_Results"]
pipe_puzzle_results_col = db_candidate["Pipe_Puzzle_Results"]

support_db = client_proctoring["SupportPortalDB"]
queries_col = support_db["candidate_queries"]

async def verify_candidate(email: str, assessment_id: str):
    email_clean = email.strip().lower()
    id_clean = assessment_id.strip().lower()
    query_id = {"assessment_id": {"$regex": f".*{re.escape(id_clean)}.*", "$options": "i"}}
    
    enrolled_record = None
    async for r in enrollment_col.find(query_id):
        if str(r.get('assessment_id', '')).strip().lower() != id_clean:
            continue
        if str(r.get('email', '')).strip().lower() == email_clean:
            enrolled_record = r
            break
        candidates = r.get('candidates')
        if isinstance(candidates, list):
            found_in_list = any(str(cand.get('email', '')).strip().lower() == email_clean for cand in candidates)
            if found_in_list:
                enrolled_record = r
                break
    
    if not enrolled_record:
        return False, "Candidate is not enrolled in this assessment."

    res_query = {"email": {"$regex": f"^{re.escape(email_clean)}$", "$options": "i"}, "assessment_id": {"$regex": f"^{re.escape(id_clean)}$", "$options": "i"}}
    if not await any_results(res_query):
        return False, "Assessment results not found. Candidate must finish before raising a query."
    return True, "Verified"

async def get_violation_summary(email: str, assessment_id: str):
    query = {"email": email.strip().lower(), "assessment_id": assessment_id.strip().lower()}
    return {
        "webcam": await violation_logs_col.find(query).to_list(100),
        "mobile": await mobile_violation_logs_col.find(query).to_list(100),
        "plagiarism": await code_detection_col.find(query).to_list(100)
    }

async def save_query_data(email, assessment_id, query):
    await queries_col.insert_one({"email": email, "assessment_id": assessment_id, "query": query, "status": "pending"})
```

### [backend/Engine/ai_engine.py]
```python
import os
import random
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=os.getenv("GEMINI_API_KEY"), temperature=0.7)

SYSTEM_PROMPT_1 = """You are an HR Manager for Virtusa Team Titans. Analyze the query and violations. Be professional and firm but empathetic..."""
SYSTEM_PROMPT_2 = """You are a Senior Assessment Review Analyst at Virtusa Team Titans. Use data-driven analysis..."""

async def analyze_query(candidate_query: str, violation_data: dict):
    prompt = f"Candidate Query: {candidate_query}\n\nViolation Logs:\n"
    for vtype, logs in violation_data.items():
        if logs:
            prompt += f"Type: {vtype}\n"
            for log in logs:
                prompt += f"- Log: at {log.get('time')}, Detail: {log.get('detail')}\n"
    
    messages = [SystemMessage(content=random.choice([SYSTEM_PROMPT_1, SYSTEM_PROMPT_2])), HumanMessage(content=prompt)]
    response = await model.ainvoke(messages)
    return response.content
```

### [backend/services/pdf_service.py]
```python
from fpdf import FPDF
import os, re

class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 14)
        self.cell(0, 10, 'Assessment Support Report', 0, 1, 'C')
        self.set_font('Arial', 'I', 9)
        self.cell(0, 6, 'From: Virtusa Team Titans', 0, 1, 'C')
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

def generate_pdf_report(candidate_name, email, assessment_name, assessment_id, analysis_text, violation_data):
    pdf = PDFReport()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "Analysis & Response:", ln=True)
    # ... logic for rendering analysis and violation tables ...
    output_path = os.path.join("temp_reports", f"report_{assessment_id}.pdf")
    pdf.output(output_path)
    return output_path
```

---

## 11. SOURCE CODE: FRONTEND COMPONENTS

### [frontend/src/App.tsx]
```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import QueryForm from './components/QueryForm';
import ThankYou from './components/ThankYou';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/query" element={<QueryForm />} />
          <Route path="/thank-you" element={<ThankYou />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

### [frontend/src/components/Login.tsx]
```tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await axios.post('http://localhost:8003/login', { email, assessment_id: assessmentId });
      if (resp.data.status === 'success') {
        localStorage.setItem('user_email', email);
        localStorage.setItem('assessment_id', assessmentId);
        navigate('/query');
      }
    } catch (err) { alert('Unauthorized candidate or incomplete assessment.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <img src="Virtusa_Logo.jpg" />
      <h2>Candidate Login</h2>
      <form onSubmit={handleLogin}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="text" value={assessmentId} onChange={e => setAssessmentId(e.target.value)} required />
        <button type="submit">{loading ? 'Verifying...' : 'Proceed'}</button>
      </form>
    </div>
  );
};

export default Login;
```

---

## 12. SECURITY & DESIGN NOTES
- **Persona Diversity:** AI responses are randomized between roles to ensure authenticity.
- **Robust Searching:** MongoDB layer uses context-aware regex logic for resilient record matching.
- **Background Orchestration:** Report generation and dispatch are offloaded to BackgroundTasks to minimize UI latency.
- **Branding:** Consistent "Virtusa Team Titans" markers throughout UI, AI responses, and PDF exports.

---

## 13. CONCLUSION
The **Agentic AI Assessment Support Portal** serves as an essential bridge between proctoring integrity and candidate support. By automating the evidence review and response process, it ensures a high-quality, transparent support experience for all evaluation stakeholders.
