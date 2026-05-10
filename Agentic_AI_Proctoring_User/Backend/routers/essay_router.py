import os
import json
import re
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from Backend.Connection.Assessment_Connection_DB import CandidateData_DB, Admin_Assessments_DB
from Backend.Connection.RateLimiter import check_rate_limit

load_dotenv()

# ── Gemini setup ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

router = APIRouter()

# ── MongoDB collections ───────────────────────────────────────────────────────
Essay_Results = CandidateData_DB["essay_results"] if CandidateData_DB is not None else None


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class EssaySubmission(BaseModel):
    essay_text: str
    topic: str
    email: str
    assessment_id: str
    user_name: str


# ── Default rubric (fallback when admin has not defined one) ──────────────────
DEFAULT_RUBRIC = {
    "sections": {
        "introduction": {
            "name": "Introduction",
            "max_marks": 10,
            "criteria": [
                "Clearly introduces the topic",
                "States purpose of essay",
                "Mentions specific industry or context",
            ],
        },
        "industry_overview": {
            "name": "Industry Overview",
            "max_marks": 10,
            "criteria": [
                "Explains the industry clearly",
                "Covers key characteristics",
                "Mentions current challenges",
            ],
        },
        "impact_analysis": {
            "name": "Impact Analysis",
            "max_marks": 10,
            "criteria": [
                "Covers positive impacts",
                "Covers risks and challenges",
                "Provides concrete examples",
            ],
        },
        "future_predictions": {
            "name": "Future Predictions",
            "max_marks": 10,
            "criteria": [
                "Predicts future trends",
                "Provides justification for predictions",
            ],
        },
        "conclusion": {
            "name": "Conclusion",
            "max_marks": 10,
            "criteria": [
                "Summarizes key points effectively",
                "Ends with a clear, forward-looking insight",
            ],
        },
    }
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_rubric(exam_id: str) -> dict:
    """
    Fetch the admin-defined rubric from Admin_Assessments_DB.
    Returns the rubric dict (with 'sections' key) or DEFAULT_RUBRIC as fallback.
    """
    if Admin_Assessments_DB is None:
        return DEFAULT_RUBRIC
    try:
        record = Admin_Assessments_DB.find_one(
            {"test_id": exam_id},
            {"essay_rubric": 1, "_id": 0}
        )
        if record and record.get("essay_rubric") and "sections" in record["essay_rubric"]:
            return record["essay_rubric"]
    except Exception as e:
        print(f"[ESSAY ROUTER] Failed to fetch rubric: {e}")
    return DEFAULT_RUBRIC


def build_essay_prompt(essay_text: str, topic: str, rubric: dict) -> str:
    """
    Builds a fully dynamic, rubric-enforcing evaluation prompt for Gemini.

    Rubric shape: { sections: { key: { name, max_marks, criteria[] } } }

    3 Extra Features (better than Accenture):
      Feature 1 - Specific, actionable improvement suggestions per section
      Feature 2 - Originality check: flags generic / AI-template writing
      Feature 3 - Strength highlights per section (what the student did WELL)
    """
    sections = rubric.get("sections", {})
    total_marks = sum(s.get("max_marks", 0) for s in sections.values())

    # Build the rubric block dynamically
    rubric_lines = []
    section_keys = list(sections.keys())
    for i, (key, sec) in enumerate(sections.items(), start=1):
        rubric_lines.append(
            f"{i}. {sec.get('name', key).upper()} -- max {sec.get('max_marks', 10)} marks"
        )
        rubric_lines.append("   Award marks if the essay:")
        for criterion in sec.get("criteria", []):
            rubric_lines.append(f"   - {criterion}")
        rubric_lines.append(
            "   Deduct marks for vague, off-topic, or missing content in this section."
        )
        rubric_lines.append("")

    rubric_block = "\n".join(rubric_lines)

    # Build the expected JSON structure dynamically
    example_sections = {}
    for key, sec in sections.items():
        m = sec.get("max_marks", 10)
        example_sections[key] = {
            "score": round(m * 0.75),
            "max": m,
            "feedback": f"Detailed assessment of the {sec.get('name', key)} section...",
            "strengths": "Specific sentence or idea that earned marks here.",
            "improvement": "Specific actionable suggestion -- what is missing and how to fix it.",
        }

    grade_threshold_a  = round(total_marks * 0.90)
    grade_threshold_bp = round(total_marks * 0.76)
    grade_threshold_b  = round(total_marks * 0.60)
    grade_threshold_c  = round(total_marks * 0.40)

    example_json = json.dumps(
        {
            "total_score": round(total_marks * 0.75),
            "grade": "B+",
            "overall_feedback": "Well structured essay with good analysis...",
            "originality_note": "Essay shows personal analysis and specific examples...",
            "sections": example_sections,
        },
        indent=2,
    )

    return f"""You are an expert academic essay examiner with decades of experience evaluating university-level essays.
Your task is to evaluate the student essay below on the topic: "{topic}".

EVALUATION RUBRIC (total {total_marks} marks)

{rubric_block}

THREE EVALUATION FEATURES -- apply all three strictly for EVERY section:

FEATURE 1 -- SPECIFIC IMPROVEMENT SUGGESTIONS (not generic):
  For EACH section, provide ONE specific, actionable improvement sentence.
  BAD example: "The essay lacks depth."
  GOOD example: "The Impact Analysis covers benefits only -- add 2-3 sentences on data privacy \
risks with a named real-world example such as the 2021 NHS AI data breach."

FEATURE 2 -- ORIGINALITY CHECK:
  After reading the full essay, decide: does it sound like a generic template, a copy of common \
knowledge, or an AI-generated response without personal analysis?
  - If yes, say so clearly in originality_note: e.g. "Essay appears template-like -- lacks \
personal insight. Reads as generated from generic points without specific named examples."
  - If no, note what makes it original: e.g. "The IBM Watson Health example is accurate and \
contextually integrated, showing genuine understanding beyond surface knowledge."

FEATURE 3 -- STRENGTH HIGHLIGHTS (for every section):
  Name one specific strength per section -- paraphrase or quote the actual sentence or idea that \
earned marks. Never write generic praise like "Good introduction."
  GOOD: "The opening sentence naming the NHS diagnostic AI tool immediately grounds the essay in \
real-world context."

GRADING (based on total_score out of {total_marks}):
  {grade_threshold_a}-{total_marks} -> "A"
  {grade_threshold_bp}-{grade_threshold_a - 1} -> "B+"
  {grade_threshold_b}-{grade_threshold_bp - 1} -> "B"
  {grade_threshold_c}-{grade_threshold_b - 1} -> "C"
  below {grade_threshold_c} -> "F"

STUDENT ESSAY:
{essay_text}

OUTPUT INSTRUCTIONS:
Return ONLY a valid JSON object. No markdown, no backticks, no preamble, no explanation outside JSON.
The JSON MUST use these exact section keys: {json.dumps(section_keys)}

Example structure (evaluate honestly, do NOT copy the example scores):
{example_json}
"""


def _clean_and_parse(raw: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    return json.loads(cleaned)


def _call_gemini(prompt: str) -> dict:
    """Call Gemini and attempt to parse the JSON response. Returns parsed dict."""
    if client is None:
        raise ValueError("Gemini Client not initialized.")
        
    # Using gemini-2.5-flash for best performance and availability
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Part.from_text(text=prompt)]
        )
        raw_text = response.text.strip()
        if not raw_text:
            raise Exception("Gemini returned an empty response.")
        return _clean_and_parse(raw_text)
    except Exception as e:
        err_detail = str(e)
        print(f"Gemini API Error (Essay): {err_detail}")
        if "429" in err_detail:
            msg = "Gemini API Rate Limit Exceeded."
        elif "404" in err_detail:
            msg = "Gemini Model Not Found for this API Key."
        else:
            msg = f"Gemini Evaluation Failed: {err_detail}"
        raise HTTPException(status_code=500, detail=msg)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/evaluate")
async def evaluate_essay(submission: EssaySubmission, request: Request):
    """
    Receives an essay submission, fetches the admin-defined rubric from MongoDB,
    builds a dynamic Gemini prompt, evaluates the essay, saves to MongoDB, and
    returns the structured result with all 3 extra features.
    """
    check_rate_limit(request, "execution")
    print(f"[ESSAY ROUTER] Received submission for candidate: {submission.email}, assessment: {submission.assessment_id}")
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server."
        )

    # ── Fetch the admin-defined rubric (or default) ───────────────────────────
    rubric = fetch_rubric(submission.assessment_id)

    # ── Build dynamic prompt ──────────────────────────────────────────────────
    prompt = build_essay_prompt(
        essay_text=submission.essay_text,
        topic=submission.topic,
        rubric=rubric,
    )

    # ── Evaluation with retry ─────────────────────────────────────────────────
    result: dict | None = None
    try:
        try:
            result = _call_gemini(prompt)
        except (json.JSONDecodeError, ValueError):
            # Retry once on parse failure
            result = _call_gemini(prompt)
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON after 2 attempts. Please try again."
        )
    except Exception as exc:
        err_msg = str(exc)
        if "429" in err_msg or "quota" in err_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Gemini API Quota Exceeded. Please check your API key limits or try again in a minute."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {err_msg}"
        )

    # ── Persist to MongoDB ────────────────────────────────────────────────────
    document = {
        "email": submission.email,
        "assessment_id": submission.assessment_id,
        "user_name": submission.user_name,
        "topic": submission.topic,
        "essay_text": submission.essay_text,
        "rubric_used": rubric,
        "evaluation": result,
        "submitted_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }

    if Essay_Results is not None:
        try:
            Essay_Results.update_one(
                {"email": submission.email, "assessment_id": submission.assessment_id},
                {"$set": document},
                upsert=True,
            )
        except Exception as db_exc:
            # Non-fatal — still return the result even if DB write fails
            print(f"[ESSAY ROUTER] MongoDB write error: {db_exc}")
    else:
        print("[ESSAY ROUTER] MongoDB collection unavailable -- skipping persistence.")

    return {
        "status": "success",
        "email": submission.email,
        "assessment_id": submission.assessment_id,
        "user_name": submission.user_name,
        "topic": submission.topic,
        "rubric_used": rubric,
        "result": result,
    }


@router.get("/result/{email}/{assessment_id}")
async def get_essay_result(email: str, assessment_id: str):
    """
    Fetches the essay evaluation result for a specific candidate and exam
    from MongoDB, including the rubric that was used at evaluation time.
    """
    if Essay_Results is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection is unavailable."
        )

    record = Essay_Results.find_one(
        {"email": email, "assessment_id": assessment_id},
        {"_id": 0}
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"No essay result found for candidate '{email}' in assessment '{assessment_id}'."
        )

    return {
        "status": "success",
        "email": email,
        "assessment_id": assessment_id,
        "user_name": record.get("user_name"),
        "topic": record.get("topic"),
        "rubric_used": record.get("rubric_used"),
        "submitted_at": record.get("submitted_at"),
        "result": record.get("evaluation"),
    }
