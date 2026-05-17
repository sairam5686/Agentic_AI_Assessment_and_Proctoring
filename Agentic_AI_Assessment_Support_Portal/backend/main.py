from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from Connection import database
from Engine import ai_engine
from services import pdf_service
from services import email_service
import os
from RateLimiter import check_rate_limit
from fastapi import Request

app = FastAPI(title="Assessment Support Portal API")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agentic-admin-portal.vercel.app",
        "https://proctor-interface.vercel.app",
        "https://agentic-candidate-portal.vercel.app",
        "https://ai-candidate-support-portal.vercel.app"
    ],
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
async def login(req: LoginRequest, request: Request):
    check_rate_limit(request, "auth")
    is_valid, message = await database.verify_candidate(req.email, req.assessment_id)
    if not is_valid:
        raise HTTPException(status_code=401, detail=message)
    return {"status": "success", "message": "Verified"}

@app.post("/submit-query")
async def submit_query(req: QueryRequest, background_tasks: BackgroundTasks, request: Request):
    check_rate_limit(request, "execution")
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
    # Use string import format to support reload
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
