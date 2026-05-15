import os
import json
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader
from google import genai
from google.genai import types
from Backend.Connection.Assessment_Connection_DB import CandidateData_DB, Admin_Assessments_DB, Diagram_Results
from Backend.Connection.RateLimiter import check_rate_limit
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# --- Cloudinary Config ---
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_LAPTOP_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_LAPTOP_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_LAPTOP_API_SECRET")
)

# --- Gemini Config ---
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# --- DB Collections ---
Diagram_Questions = Admin_Assessments_DB # Uses the main assessment collection
Diagram_Submissions = Diagram_Results

# --- Schemas ---
class DiagramQuestionCreate(BaseModel):
    assessment_id: str
    question_text: str
    master_json: dict  # React Flow nodes/edges
    master_image_base64: str | None = None # Master snapshot
    max_marks: int = 10

class DiagramSubmission(BaseModel):
    assessment_id: str
    email: str
    user_name: str
    student_json: dict
    image_base64: str  # Base64 string of the canvas

class DiagramProgress(BaseModel):
    assessment_id: str
    email: str
    student_json: dict

# --- Routes ---

@router.post("/create")
async def create_diagram_question(data: DiagramQuestionCreate, request: Request):
    """Admin creates a diagram question with a master solution."""
    check_rate_limit(request, "execution")
    
    if Diagram_Questions is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        master_image_url = None
        if data.master_image_base64:
            image_data = data.master_image_base64
            if "," in image_data:
                image_data = image_data.split(",")[1]
            
            upload_result = cloudinary.uploader.upload(
                f"data:image/png;base64,{image_data}",
                folder=f"assessments/{data.assessment_id}/master",
                public_id=f"master_{datetime.now().timestamp()}"
            )
            master_image_url = upload_result.get("secure_url")

        update_doc = {
            "diagram_enabled": True,
            "diagram_prompt": data.question_text,
            "diagram_master_json": data.master_json
        }
        if master_image_url:
            update_doc["diagram_master_image"] = master_image_url

        Diagram_Questions.update_one(
            {"test_id": data.assessment_id}, # Admin uses test_id
            {"$set": update_doc},
            upsert=True
        )
        return {"status": "success", "message": "Diagram question created successfully", "master_image_url": master_image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-progress")
async def save_diagram_progress(data: DiagramProgress, request: Request):
    """Real-time storage of candidate's diagram progress (autosave)."""
    check_rate_limit(request, "execution")
    
    if Diagram_Submissions is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        Diagram_Submissions.update_one(
            {"assessment_id": data.assessment_id, "email": data.email},
            {
                "$set": {
                    "student_json": data.student_json,
                    "last_updated": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                }
            },
            upsert=True
        )
        return {"status": "success", "message": "Progress saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit")
async def submit_diagram(data: DiagramSubmission, request: Request):
    """User submits their diagram work with AI evaluation."""
    check_rate_limit(request, "submission")

    if Diagram_Submissions is None or Diagram_Questions is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        print(f"Starting Diagram Submission for {data.email}...")
        
        # 1. Upload image to Cloudinary
        print("Uploading diagram to Cloudinary...")
        image_data = data.image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]
            
        upload_result = cloudinary.uploader.upload(
            f"data:image/png;base64,{image_data}",
            folder=f"assessments/{data.assessment_id}/diagrams",
            public_id=f"{data.email.replace('@', '_').replace('.', '_')}_{datetime.now().timestamp()}"
        )
        image_url = upload_result.get("secure_url")
        print(f"Cloudinary Upload Complete: {image_url}")

        # 2. Fetch Master Question from Admin_Assessments_DB
        print("Fetching master question data...")
        question = Diagram_Questions.find_one({"test_id": data.assessment_id})
        if not question:
             raise HTTPException(status_code=404, detail="Question not found")
        
        master_json = question.get("diagram_master_json")
        max_marks = 10 # Default for diagram

        # 3. AI Evaluation using Gemini 2.5 Flash (Multi-modal)
        print("Invoking Gemini 2.5 Flash for evaluation...")
        
        # Prepare image part for Gemini
        image_bytes = base64.b64decode(image_data)
        image_part = {
            "mime_type": "image/png",
            "data": image_bytes
        }

        print("Waiting for Gemini response...")

        prompt = f"""
        You are an expert technical examiner. Evaluate the student's diagram (provided as an image and JSON) against the master solution logic.
        
        QUESTION: {question.get('question_text')}
        MASTER SOLUTION LOGIC (JSON): {json.dumps(master_json)}
        STUDENT ATTEMPT LOGIC (JSON): {json.dumps(data.student_json)}
        MAX MARKS: {max_marks}
        
        TASK:
        1. Compare the structural logic in the student's JSON with the master JSON.
        2. Verify the visual layout and labels in the student's image match the intended flow.
        3. Check for correct node types (rectangles for steps, diamonds for decisions, etc.).
        4. Check for correct edge directions and flow logic.
        
        GRADING CRITERIA:
        - Logic & Flow: 60%
        - Completeness (all nodes present): 30%
        - Visual Clarity & Naming: 10%
        
        Return ONLY a JSON object:
        {{
            "score": <float out of {max_marks}>,
            "feedback": "<detailed constructive feedback>",
            "originality": "<high/medium/low>",
            "areas_of_improvement": ["<point 1>", "<point 2>"]
        }}
        """
        
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(text=prompt),
                            types.Part.from_bytes(data=image_bytes, mime_type="image/png")
                        ]
                    )
                ]
            )
            
            # Clean response text
            response_text = response.text
            if not response_text:
                raise Exception("Gemini returned an empty response.")
                
            clean_json = response_text.replace("```json", "").replace("```", "").strip()
            ai_eval = json.loads(clean_json)
            
        except Exception as gem_e:
            err_detail = str(gem_e)
            print(f"Gemini API Error: {err_detail}")
            # Identify common issues
            if "429" in err_detail:
                msg = "Gemini API Rate Limit Exceeded. Please try again in 1 minute."
            elif "404" in err_detail:
                msg = f"Gemini Model Not Found. The requested model is not available for this API key."
            elif "quota" in err_detail.lower():
                msg = "Gemini API Quota reached."
            else:
                msg = f"Gemini Evaluation Failed: {err_detail}"
            raise HTTPException(status_code=500, detail=msg)

        # 4. Save final result
        submission_doc = {
            "assessment_id": data.assessment_id,
            "email": data.email,
            "user_name": data.user_name,
            "student_json": data.student_json,
            "image_url": image_url,
            "ai_evaluation": ai_eval,
            "master_info": {
                "master_image_url": question.get("diagram_master_image"),
                "master_json": master_json
            },
            "submitted_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "completed"
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
        raise HTTPException(status_code=500, detail=f"AI Evaluation failed: {str(e)}")

@router.get("/metadata/{assessment_id}")
async def get_diagram_metadata(assessment_id: str, request: Request):
    """Fetch diagram question prompt and config from shared Admin DB."""
    check_rate_limit(request, "execution")
    if Diagram_Questions is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    question = Diagram_Questions.find_one({"test_id": assessment_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return {
        "diagram_enabled": question.get("diagram_enabled", False),
        "diagram_prompt": question.get("diagram_prompt", ""),
        "diagram_master_image": question.get("diagram_master_image")
    }

@router.get("/results/{assessment_id}")
async def get_diagram_results(assessment_id: str, request: Request):
    """Fetch all diagram submissions for an assessment along with master info."""
    check_rate_limit(request, "execution")
    
    if Diagram_Submissions is None or Diagram_Questions is None:
        return []

    # Get master question to show the "proof" image
    question = Diagram_Questions.find_one({"test_id": assessment_id}, {"_id": 0})
    master_info = {
        "master_image_url": question.get("diagram_master_image") if question else None,
        "question_text": question.get("diagram_prompt") if question else "Diagram Question"
    }

    submissions = list(Diagram_Submissions.find({"assessment_id": assessment_id}, {"_id": 0}))
    
    # Enrich submissions with master info
    for sub in submissions:
        sub["master_info"] = master_info
        
    return submissions
