import os
import json
import re
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

from Backend.Connection.Assessment_Connection_DB import CandidateData_DB

load_dotenv()

# ── Gemini setup ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

router = APIRouter()

# ── MongoDB collection ────────────────────────────────────────────────────────
Essay_Results = CandidateData_DB["essay_results"] if CandidateData_DB is not None else None


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class EssaySubmission(BaseModel):
    essay_text: str
    topic: str
    candidate_id: str
    exam_id: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def build_essay_prompt(essay_text: str, topic: str) -> str:
    """
    Builds a comprehensive, rubric-enforcing evaluation prompt for Google Gemini.

    The prompt instructs Gemini to:
    - Act as an expert essay examiner (not a lenient assistant)
    - Evaluate strictly against each rubric criterion
    - Give specific, actionable improvement suggestions per section
    - Highlight at least one genuine strength per section
    - Check for generic / template-like writing and note it
    - Assign a letter grade using the exact score bands:
        45-50 → A | 38-44 → B+ | 30-37 → B | 20-29 → C | below 20 → F
    - Return ONLY the raw JSON object — no markdown, no explanation
    """
    return f"""You are an expert academic essay examiner with decades of experience evaluating university-level essays.
Your task is to evaluate the student essay below on the topic: "{topic}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION RUBRIC (total 50 marks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. INTRODUCTION — max 10 marks
   Award marks if the essay:
   - Clearly and explicitly introduces the topic (not just restates the title)
   - States a clear purpose or thesis for what the essay will argue or discuss
   - Mentions specific real-world context, industry, or domain relevant to the topic
   Deduct marks if the introduction is vague, too brief, or could belong to any generic essay.

2. CONTENT & ANALYSIS — max 20 marks
   Award marks if the essay:
   - Covers the key aspects of the topic in sufficient depth (not just surface-level mention)
   - Addresses BOTH positive aspects AND challenges / limitations
   - Demonstrates genuine understanding, not just repetition of common knowledge
   - Uses domain-relevant vocabulary and concepts correctly
   Deduct marks if the analysis is one-sided, shallow, or uses filler sentences without substance.

3. EXAMPLES & EVIDENCE — max 10 marks
   Award marks if the essay:
   - Provides specific, named real-world examples (companies, technologies, events, studies)
   - Uses evidence that directly supports the argument being made in that paragraph
   Deduct marks heavily for vague references like "many companies" or "studies show" without names.

4. CONCLUSION — max 10 marks
   Award marks if the essay:
   - Clearly summarizes the key arguments made in the body
   - Ends with a strong, forward-looking closing thought (recommendation, call-to-action, or insight)
   Deduct marks if the conclusion merely repeats the introduction or ends abruptly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION RULES — follow strictly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Be STRICT. Do not be generous. Award marks only for what is genuinely present.
- For each section, provide ONE specific strength — name the actual sentence or idea that earns it.
- For each section, provide ONE specific, actionable improvement suggestion.
  BAD example: "The essay lacks depth."
  GOOD example: "The content section discusses automation but never addresses job displacement — add 2 sentences on workforce impact with a named industry example."
- Read the entire essay and check: does it sound like a template or a generic AI-generated response?
  If yes, note this explicitly in originality_note.
  If the essay contains personal insight, specific examples, or unique framing, note that instead.
- Assign a letter grade based ONLY on total_score using these exact bands:
    45 to 50 → "A"
    38 to 44 → "B+"
    30 to 37 → "B"
    20 to 29 → "C"
    below 20 → "F"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT ESSAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{essay_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a valid JSON object.
Do NOT include any markdown formatting, backticks, code fences, preamble, or explanation text outside the JSON.
The JSON must exactly match this structure:

{{
  "total_score": 38,
  "grade": "B+",
  "overall_feedback": "Well structured essay with good analysis...",
  "originality_note": "Essay shows personal analysis and specific examples...",
  "sections": {{
    "introduction": {{
      "score": 8,
      "max": 10,
      "feedback": "Clear introduction that states purpose well...",
      "strengths": "The opening sentence naming the healthcare industry immediately grounds the topic.",
      "improvement": "Add an explicit thesis sentence stating what the essay will argue or demonstrate."
    }},
    "content_analysis": {{
      "score": 16,
      "max": 20,
      "feedback": "Good depth of analysis...",
      "strengths": "The paragraph on data privacy correctly identifies both regulatory and technical challenges.",
      "improvement": "The automation section covers benefits only — add a paragraph on job displacement with a named industry statistic."
    }},
    "examples_evidence": {{
      "score": 7,
      "max": 10,
      "feedback": "Some examples provided...",
      "strengths": "The AlphaFold drug discovery example is relevant and accurately described.",
      "improvement": "Replace \u2018many companies have adopted AI\u2019 with two named companies and their specific AI applications."
    }},
    "conclusion": {{
      "score": 7,
      "max": 10,
      "feedback": "Conclusion summarizes well...",
      "strengths": "The final paragraph revisits all three main themes from the body.",
      "improvement": "Replace the final sentence with a forward-looking recommendation, such as a policy suggestion or a research direction."
    }}
  }}
}}
"""


def _clean_and_parse(raw: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    # Remove ```json ... ``` or ``` ... ``` wrappers if Gemini ignores the instruction
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    return json.loads(cleaned)


def _call_gemini(prompt: str) -> dict:
    """Call Gemini and attempt to parse the JSON response. Returns parsed dict."""
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    raw_text = response.text.strip()
    return _clean_and_parse(raw_text)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/evaluate")
async def evaluate_essay(submission: EssaySubmission):
    """
    Receives an essay, evaluates it via Google Gemini using a rubric-based
    prompt, saves the result to MongoDB, and returns the structured result.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server."
        )

    prompt = build_essay_prompt(essay_text=submission.essay_text, topic=submission.topic)

    # ── First attempt ─────────────────────────────────────────────────────────
    result: dict | None = None
    try:
        result = _call_gemini(prompt)
    except (json.JSONDecodeError, ValueError):
        pass  # fall through to retry

    # ── Retry once on parse failure ───────────────────────────────────────────
    if result is None:
        try:
            result = _call_gemini(prompt)
        except (json.JSONDecodeError, ValueError) as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Gemini returned an invalid JSON response after 2 attempts. "
                    f"Parse error: {str(exc)}"
                )
            )
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Gemini API error on retry: {str(exc)}"
            )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API error: {str(exc)}"
        )

    # ── Persist to MongoDB ────────────────────────────────────────────────────
    document = {
        "candidate_id": submission.candidate_id,
        "exam_id": submission.exam_id,
        "topic": submission.topic,
        "essay_text": submission.essay_text,
        "evaluation": result,
        "submitted_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }

    if Essay_Results is not None:
        try:
            Essay_Results.update_one(
                {"candidate_id": submission.candidate_id, "exam_id": submission.exam_id},
                {"$set": document},
                upsert=True,
            )
        except Exception as db_exc:
            # Non-fatal — still return the result even if DB write fails
            print(f"[ESSAY ROUTER] MongoDB write error: {db_exc}")
    else:
        print("[ESSAY ROUTER] MongoDB collection unavailable — skipping persistence.")

    return {
        "status": "success",
        "candidate_id": submission.candidate_id,
        "exam_id": submission.exam_id,
        "topic": submission.topic,
        "result": result,
    }


@router.get("/result/{candidate_id}/{exam_id}")
async def get_essay_result(candidate_id: str, exam_id: str):
    """
    Fetches the essay evaluation result for a specific candidate and exam
    from MongoDB.
    """
    if Essay_Results is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection is unavailable."
        )

    record = Essay_Results.find_one(
        {"candidate_id": candidate_id, "exam_id": exam_id},
        {"_id": 0}  # exclude internal MongoDB _id
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"No essay result found for candidate '{candidate_id}' in exam '{exam_id}'."
        )

    return {
        "status": "success",
        "candidate_id": candidate_id,
        "exam_id": exam_id,
        "topic": record.get("topic"),
        "submitted_at": record.get("submitted_at"),
        "result": record.get("evaluation"),
    }
