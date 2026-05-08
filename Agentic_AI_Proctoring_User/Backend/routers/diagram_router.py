import os
import json
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader
import google.generativeai as genai
from Backend.Connection.Assessment_Connection_DB import CandidateData_DB, Admin_Assessments_DB
from Backend.Connection.RateLimiter import check_rate_limit

router = APIRouter()

# --- Cloudinary Config ---
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_LAPTOP_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_LAPTOP_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_LAPTOP_API_SECRET")
)

# --- Gemini Config ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# --- DB Collections ---
Diagram_Questions = Admin_Assessments_DB["diagram_questions"] if Admin_Assessments_DB is not None else None
Diagram_Submissions = CandidateData_DB["diagram_submissions"] if CandidateData_DB is not None else None

# --- Schemas ---
class DiagramQuestionCreate(BaseModel):
    assessment_id: str
    question_text: str
    master_json: dict  # React Flow nodes/edges
    max_marks: int = 10

class DiagramSubmission(BaseModel):
    assessment_id: str
    email: str
    user_name: str
    student_json: dict
    image_base64: str  # Base64 string of the canvas

# --- Routes ---

@router.post("/create")
async def create_diagram_question(data: DiagramQuestionCreate, request: Request):
    """Admin creates a diagram question with a master solution."""
    # Rate limit for admin (standard execution tier)
    check_rate_limit(request, "execution")
    
    if Diagram_Questions is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        Diagram_Questions.update_one(
            {"assessment_id": data.assessment_id},
            {"$set": data.model_dump()},
            upsert=True
        )
        return {"status": "success", "message": "Diagram question created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit")
async def submit_diagram(data: DiagramSubmission, request: Request):
    """User submits their diagram work."""
    # Strict rate limit for submission
    check_rate_limit(request, "submission")

    if Diagram_Submissions is None or Diagram_Questions is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        # 1. Upload image to Cloudinary
        upload_result = cloudinary.uploader.upload(
            data.image_base64,
            folder=f"assessments/{data.assessment_id}/diagrams",
            public_id=f"{data.email.replace('@', '_').replace('.', '_')}_{datetime.now().timestamp()}"
        )
        image_url = upload_result.get("secure_url")

        # 2. Fetch Master Question for AI comparison
        question = Diagram_Questions.find_one({"assessment_id": data.assessment_id})
        if not question:
             raise HTTPException(status_code=404, detail="Question not found")
        
        master_json = question.get("master_json")
        max_marks = question.get("max_marks", 10)

        # 3. AI Evaluation using Gemini (Multi-modal: JSON + Vision)
        # We pass the JSON as text and the image URL (or base64) to Gemini
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        You are an expert examiner. Evaluate the student's diagram against the master solution.
        
        QUESTION: {question.get('question_text')}
        MASTER JSON (Correct Logic): {json.dumps(master_json)}
        STUDENT JSON (Attempted Logic): {json.dumps(data.student_json)}
        MAX MARKS: {max_marks}
        
        Compare the structural logic and visual labels. 
        - Nodes must match semantically.
        - Relationships/Edges must match logically.
        - Penalize for missing components or incorrect flow.
        
        Return ONLY a JSON object:
        {{
            "score": <float>,
            "feedback": "<string>",
            "originality": "<string>"
        }}
        """
        
        # In a real scenario, you'd send the image too. For now, we evaluate JSON + context.
        # To send image: response = model.generate_content([prompt, image_part])
        response = model.generate_content(prompt)
        ai_eval = json.loads(response.text.replace("```json", "").replace("```", "").strip())

        # 4. Save result
        submission_doc = {
            "assessment_id": data.assessment_id,
            "email": data.email,
            "user_name": data.user_name,
            "student_json": data.student_json,
            "image_url": image_url,
            "ai_evaluation": ai_eval,
            "submitted_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        Diagram_Submissions.update_one(
            {"assessment_id": data.assessment_id, "email": data.email},
            {"$set": submission_doc},
            upsert=True
        )

        return {
            "status": "success",
            "score": ai_eval.get("score"),
            "feedback": ai_eval.get("feedback"),
            "image_url": image_url
        }

    except Exception as e:
        print(f"Diagram Submission Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{assessment_id}")
async def get_diagram_results(assessment_id: str, request: Request):
    """Fetch all diagram submissions for an assessment (Real-time dashboard use)."""
    check_rate_limit(request, "execution")
    
    if Diagram_Submissions is None:
        return []

    results = list(Diagram_Submissions.find({"assessment_id": assessment_id}, {"_id": 0}))
    return results
