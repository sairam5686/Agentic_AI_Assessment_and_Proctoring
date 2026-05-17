"""
server.py
─────────────────────────────────────────────────────────────────────────────
FastAPI server combining video proctoring and code analysis.
Side camera removed. One endpoint for code analysis via supervisor.
"""

import base64
import json
import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import time
import threading

import cv2
import numpy as np
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import state
from main import run_proctoring
from code_agents.code_supervisor_agent import CodeSupervisorAgent
from code_agents.plagiarism_agent import PlagiarismAgent
from code_agents.ai_detection_agent import AIDetectionAgent
from Connections.ViolationLogsDB import CodeEvaluation_collection
from Connections.ViolationLogsDB import Risk_Score_DB


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Video Proctor",
    description="AI-powered exam proctoring + code analysis API",
    version="2.0.0",
)

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

os.makedirs("outputs/evidence", exist_ok=True)
app.mount("/evidence", StaticFiles(directory="outputs/evidence"), name="evidence")
templates = Jinja2Templates(directory="templates")

plagiarism_agent = PlagiarismAgent()
ai_agent = AIDetectionAgent()

_supervisor = CodeSupervisorAgent(plagiarism_agent, ai_agent)
# Supervisor instance for code analysis


@app.on_event("shutdown")
def shutdown_event():
    print("[Server] Shutdown signal received. Cleaning up...")
    # Terminate all active sessions
    for session in state.sessions.values():
        session.proctoring_active = False
    
    # Wait for all threads to finish
    for key, t in proctor_threads.items():
        if t.is_alive():
            t.join(timeout=2.0)
    print("[Server] Shutdown complete.")


# ---------------------------------------------------------------------------
# Proctoring thread management
# ---------------------------------------------------------------------------

proctor_threads: dict[str, threading.Thread] = {}

def start_proctoring(session) -> None:
    key = f"{session.assessment_id}_{session.email_id}"
    existing = proctor_threads.get(key)
    if existing is None or not existing.is_alive():
        print(f"[Server] Starting proctoring thread for {key}")
        t = threading.Thread(target=run_proctoring, args=(session,), daemon=True)
        proctor_threads[key] = t
        t.start()


# ---------------------------------------------------------------------------
# MJPEG stream helper
# ---------------------------------------------------------------------------

def _generate_frames(session=None):
    """MJPEG generator — reads front-cam frames from state/session."""
    while True:
        s = session or state.get_latest_session()
        frame = s.latest_frame if s else None
        if frame is None:
            time.sleep(0.03)
            continue
        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            time.sleep(0.03)
            continue
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )


# ---------------------------------------------------------------------------
# VIDEO PROCTOR ROUTES
# ---------------------------------------------------------------------------

@app.get("/", summary="Live dashboard")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/video", summary="MJPEG front-cam stream")
def video_feed(assessment_id: str = None, email_id: str = None):
    session = None
    if assessment_id and email_id:
        key = f"{assessment_id}_{email_id}"
        session = state.sessions.get(key)
    return StreamingResponse(
        _generate_frames(session),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/analytics", summary="Live analytics snapshot")
def get_analytics(assessment_id: str = None, email_id: str = None):
    if assessment_id and email_id:
        key = f"{assessment_id}_{email_id}"
        session = state.sessions.get(key)
    else:
        session = state.get_latest_session()

    if session is None:
        return JSONResponse({
            "suspicion_score": 0, "max_score": 30, "trust_score": 30,
            "risk_level": "NORMAL", "flagged": False, "violation_count": 0,
            "violations": [], "timeline": [], "proctoring_active": False,
            "assessment_id": None, "email_id": None,
        })

    suspicion_score = 0
    risk_level      = "NORMAL"
    trust_score     = 30
    flagged         = False
    timeline        = []
    violations      = []

    if session.risk_agent is not None:
        suspicion_score = session.risk_agent.suspicion_score
        risk_level      = session.risk_agent.get_risk_level()
        trust_score     = session.risk_agent.get_trust_score()
        flagged         = session.risk_agent.is_flagged()
        timeline        = session.risk_agent.timeline

    if session.violation_agent is not None:
        violations = session.violation_agent.violations

    return JSONResponse({
        "suspicion_score":   suspicion_score,
        "max_score":         30,
        "trust_score":       trust_score,
        "risk_level":        risk_level,
        "flagged":           flagged,
        "violation_count":   len(violations),
        "violations":        violations,
        "timeline":          timeline,
        "proctoring_active": session.proctoring_active,
        "assessment_id":     session.assessment_id,
        "email_id":          session.email_id,
    })


@app.post("/video/frame", summary="Receive a base64-encoded frame from browser")
async def receive_frame(request: Request):
    data = await request.json()

    assessment_id = data.get("assessment_id", "")
    email_id      = data.get("email_id", "")

    if not assessment_id or not email_id:
        return JSONResponse(
            {"status": "error", "detail": "assessment_id and email_id are required"},
            status_code=400,
        )

    session = state.get_or_create_session(assessment_id, email_id)
    session.proctoring_active = True

    image_b64 = data.get("image", "")
    try:
        header, encoded = image_b64.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        np_arr    = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return JSONResponse(
                {"status": "error", "detail": "Failed to decode image"},
                status_code=400,
            )

        session.latest_frame      = frame
        session.latest_frame_time = time.time()

    except Exception as exc:
        return JSONResponse({"status": "error", "detail": str(exc)}, status_code=400)

    start_proctoring(session)

    return {
        "status":        "frame received",
        "assessment_id": assessment_id,
        "email_id":      email_id,
    }


@app.post("/stop", summary="Stop the proctoring session")
async def stop_proctoring(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    
    assessment_id = data.get("assessment_id")
    email_id      = data.get("email_id")
    
    if assessment_id and email_id:
        key = f"{assessment_id}_{email_id}"
        session = state.sessions.get(key)
        if session:
            print(f"[VideoProctor] STOP signal received for {key}. Finalizing session...")
            session.proctoring_active = False
            return {"status": f"proctoring stopped for {key}"}
    
    # Fallback: stop all
    print("[VideoProctor] STOP signal received. Finalizing all sessions...")
    for session in state.sessions.values():
        session.proctoring_active = False
    return {"status": "all proctoring stopped"}


@app.get("/report", summary="Download the latest exam report (JSON)")
def get_report(assessment_id: str = None, email_id: str = None):
    if assessment_id and email_id:
        session_key = f"{assessment_id}_{email_id}"
        report_path = f"outputs/analytics_{session_key}.json"
    else:
        report_path = "outputs/analytics.json"
        
    if not os.path.exists(report_path):
        return JSONResponse(
            {"status": "no_report", "detail": f"No report generated yet at {report_path}."},
            status_code=404,
        )
    with open(report_path, "r") as f:
        data = json.load(f)
    return JSONResponse(data)


@app.get("/health", summary="Health check")
def health_check():
    session = state.get_latest_session()
    return {
        "status":            "ok",
        "proctoring_active": session.proctoring_active if session else False,
        "has_frame":         (session.latest_frame is not None) if session else False,
    }


@app.post("/Code/Checker", summary="Analyse candidate code for anomalies")
async def code_checker(request: Request):
    data = await request.json()

    code          = data.get("code")
    email         = data.get("email")
    language      = data.get("language")
    question_id   = data.get("question_id")
    assessment_id = data.get("assessment_id")

    result = _supervisor.analyze(code, language)

    # Update the correct candidate's session, not global state
    key     = f"{assessment_id}_{email}"
    session = state.sessions.get(key)
    if session:
        summary = result.get("risk", {})
        session.code_risk_score      = summary.get("suspicion_score", 0)
        session.code_trust_score     = 20 - session.code_risk_score
        session.code_violation_score = sum(summary.get("violations", {}).values())
        session.save_state()

    val = {
        "code": code, "language": language, "email": email,
        "question_id": question_id, "assessment_id": assessment_id,
        "result": result,
    }
    CodeEvaluation_collection.insert_one(val)
    return {"status": "success", "result": result}


@app.post("/webcam/score/store")
async def store_scores(request: Request):
    print("\n" + "="*50)
    print("[Server] FINAL SCORE STORAGE TRIGGERED")
    print("="*50)

    try:
        data_json = await request.json()
    except Exception as e:
        return JSONResponse({"Status": False, "error": "Invalid JSON"}, status_code=400)

    email         = data_json.get("email", "unknown")
    assessment_id = data_json.get("assessment_id", "unknown")

    key     = f"{assessment_id}_{email}"
    session = state.sessions.get(key)

    if session is None:
        print(f"[Server] WARNING: No active session found for {key}. Using zeros.")
        video_risk = video_trust = video_viol = 0
        code_risk  = code_viol  = 0
        code_trust = 20
    else:
        video_risk  = session.risk_score
        video_trust = session.trust_score
        video_viol  = session.violation_score
        code_risk   = session.code_risk_score
        code_trust  = session.code_trust_score
        code_viol   = session.code_violation_score

    data = {
        "assessment_id": assessment_id,
        "email":         email,
        "video_proctoring": {
            "risk_score":      video_risk,
            "trust_score":     video_trust,
            "violation_score": video_viol,
        },
        "code_analysis": {
            "risk_score":      code_risk,
            "trust_score":     code_trust,
            "violation_score": code_viol,
        },
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    try:
        res = Risk_Score_DB.insert_one(data)
        return {"Status": True, "id": str(res.inserted_id)}
    except Exception as e:
        return JSONResponse({"Status": False, "error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8001)))
