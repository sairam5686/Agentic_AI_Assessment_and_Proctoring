import sys
import asyncio

# CRITICAL for Windows: Use ProactorEventLoop to avoid the 64-socket 'select()' limit
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor
import base64
import cv2
import numpy as np
from pydantic import BaseModel
import time
import os
import signal
import state
from Connectivity import ProctoringSession, analyze_frame
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

from Connection.ViolationLogs import Risk_Score_Mobile_collection

# ── Module-level thread pool for offloading CPU-bound frame analysis ──────────
executor = ThreadPoolExecutor(max_workers=4)


app = FastAPI()

# Add CORS middleware to allow cross-origin requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev; narrow this in production
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (POST, OPTIONS, etc.)
    allow_headers=["*"],
)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        print(f"[DEBUG] Incoming Request: {request.method} {request.url}")
        response = await call_next(request)
        return response

app.add_middleware(RequestLoggingMiddleware)

# Signal handling for debugging
def signal_handler(sig, frame):
    print(f"[DEBUG] Signal {sig} received. Shutting down...")
    # Trigger the default behavior
    os._exit(0)

@app.on_event("startup")
async def startup_event():
    print("[DEBUG] Server is UP and listening for requests.")
    # For Windows, SIGINT is enough to catch Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start periodic session cleanup (every 2 minutes)
    asyncio.create_task(cleanup_inactive_sessions())

async def cleanup_inactive_sessions():
    """
    Background task to remove sessions that haven't received a frame recently.
    Prevents resource/file descriptor leaks.
    """
    while True:
        try:
            await asyncio.sleep(120)  # Check every 2 minutes
            now = time.time()
            to_delete = []
            
            # Using list(sessions.items()) to avoid "dictionary changed size during iteration"
            for key, session in list(sessions.items()):
                # If no frame for 10 minutes, close it
                if now - getattr(session, "last_activity", session.session_start) > 600:
                    to_delete.append(key)
            
            for key in to_delete:
                if key in sessions:
                    print(f"[MobileAgent] Auto-cleaning inactive session: {key}")
                    sessions[key].close()
                    del sessions[key]
        except Exception as e:
            print(f"[ERROR] Session cleanup failed: {e}")

sessions = {}  # In-memory session store for FastAPI
accepting_new_sessions = True  # Track if we are active

class FrameRequest(BaseModel):
    image: str
    assessment_id: str
    email_id: str
    device_type: str


@app.post("/video/frame/mobile")
async def receive_frame(data: FrameRequest, background_tasks: BackgroundTasks):

    try:
        # Create session key (normalized)
        a_id = data.assessment_id.strip().lower()
        email = data.email_id.strip().lower()
        session_key = f"{a_id}_{email}"
        
        # Create session only if allowed or exists
        if session_key not in sessions:
            if not accepting_new_sessions:
                print(f"[Mobile] Rejecting session {session_key}: Proctoring not active")
                return {"status": "error", "message": "Proctoring session not active"}
            print(f"[Mobile] Initializing new session for {session_key}")
            sessions[session_key] = ProctoringSession()
        
        session = sessions[session_key]
        session.last_activity = time.time()  # Update activity time

        # ── Frame-drop guard: skip if the previous frame is still being analysed
        if session.processing:
            return {"status": "skipped", "message": "Previous frame still processing"}

        # Throttled session log (every 30 frames instead of every frame)
        if session.frame_count % 30 == 0:
            print(f"[Mobile] Session {session_key} — frame {session.frame_count}")

        # Handle both "data:image/jpeg;base64,<data>" and raw base64 strings
        if "," in data.image:
            image_data = data.image.split(",", 1)[1]
        else:
            image_data = data.image

        # Decode base64
        image_bytes = base64.b64decode(image_data)

        # Convert to numpy array
        np_arr = np.frombuffer(image_bytes, np.uint8)

        # Convert to OpenCV frame
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # ── Offload CPU-bound frame analysis to the thread pool ──────────────────
        session.processing = True
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                executor,
                analyze_frame,
                frame, data.assessment_id, data.email_id, session
            )
        finally:
            session.processing = False

        # ── Schedule report generation in the background (non-blocking) ─────────
        # Only generate on violations or every 30 frames to avoid I/O thrash
        if session.frame_count % 30 == 0 or result["violations_this_frame"]:
            duration_snap = time.time() - session.session_start
            background_tasks.add_task(
                session.report_agent.generate_reports, duration_snap, include_pdf=False
            )

        return {
            "status": "success",
            "analysis": result
        }

    except Exception as e:
        import traceback
        print(f"[ERROR] Frame analysis failed: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }


@app.post("/mobile/score")
async def get_score(request: Request):
    try:
        print("[DEBUG] Score request received")
        data = await request.json()
        a_id = data.get("assessment_id", "").strip().lower()
        email = data.get("email", "").strip().lower()
        session_key = f"{a_id}_{email}"

        if session_key not in sessions:
            print(f"[ERROR] No active session found for {session_key}")
            return {"Status": False, "Message": "Session not found"}

        session = sessions[session_key]
        
        scores = {
            "assessment_id": a_id,
            "email": email,
            "suspicion_score": session.risk_agent.suspicion_score,
            "trust_score": session.risk_agent.get_trust_score(),
            "violation_count": len(session.violation_agent.violations),
            "timestamp": time.time()
        }
        
        
        print("Score : ", scores)
        if Risk_Score_Mobile_collection is not None:
            Risk_Score_Mobile_collection.insert_one(scores)
            return {"Status": True}
        else:
            print("[ERROR] MongoDB collection not initialized")
            return {"Status": False, "Message": "Database error"}

    except Exception as e:
        import traceback
        print(f"[ERROR] Score retrieval failed: {e}")
        traceback.print_exc()
        return {"Status": False}
      

@app.post("/stop")
async def stop_proctoring(data: dict = None):
    """
    Finalize all active sessions or a specific one, and generate reports.
    """
    try:
        global accepting_new_sessions
        accepting_new_sessions = False  # STOP accepting new frames for AI

        # If specific assessment/email provided, clean only that
        if data and "assessment_id" in data and "email_id" in data:
            a_id = str(data["assessment_id"]).strip().lower()
            email = str(data["email_id"]).strip().lower()
            session_key = f"{a_id}_{email}"
            if session_key in sessions:
                session = sessions[session_key]
                print(f"[MobileAgent] Finalizing session: {session_key}")
                duration = time.time() - session.session_start
                session.report_agent.generate_reports(duration, label=session_key)
                session.close()  # Clean up agents (MediaPipe/YOLO)
                
                # Final Summary
                score = session.risk_agent.suspicion_score
                trust = session.risk_agent.get_trust_score()
                count = len(session.violation_agent.violations)
                
                print(f"\n" + "="*50)
                print(f" FINAL PROCTORING SUMMARY: {session_key}")
                print(f"="*50)
                print(f" MOBILE CAM RISK SCORE:    {score} / 30 {'(No Risk)' if score == 0 else ''}")
                print(f" TRUST SCORE:   {trust} / 30 {'(Maximum Trust)' if score == 0 else ''}")
                print(f" VIOLATIONS:    {count}")
                print(f" RESULT:        {'[NO RISK]' if score == 0 else '[ANOMALY DETECTED]'}")
                print(f"="*50 + "\n")
                
                # Score saving logic integrated into /stop
                scores = {
                    "assessment_id": a_id,
                    "email": email,
                    "suspicion_score": session.risk_agent.suspicion_score,
                    "trust_score": session.risk_agent.get_trust_score(),
                    "violation_count": len(session.violation_agent.violations),
                    "timestamp": time.time(),
                    "finalized_via": "stop_endpoint"
                }
                print(f"[MobileAgent] Auto-saving final score for {session_key}: {scores}")
                if Risk_Score_Mobile_collection is not None:
                    Risk_Score_Mobile_collection.insert_one(scores)
                
                del sessions[session_key]
                print(f"[MobileAgent] Session {session_key} finalized via /stop")
            else:
                print(f"[DEBUG] Session {session_key} already closed or not found.")
        else:
            # Otherwise clean everything
            keys = list(sessions.keys())
            for key in keys:
                session = sessions[key]
                duration = time.time() - session.session_start
                session.report_agent.generate_reports(duration, label=key)
                session.close()  # Clean up agents (MediaPipe/YOLO)
                
                # Final Summary
                score = session.risk_agent.suspicion_score
                trust = session.risk_agent.get_trust_score()
                count = len(session.violation_agent.violations)
                
                # Auto-save for global stop too
                a_id_from_key, email_from_key = key.split("_", 1)
                scores = {
                    "assessment_id": a_id_from_key,
                    "email": email_from_key,
                    "suspicion_score": score,
                    "trust_score": trust,
                    "violation_count": count,
                    "timestamp": time.time(),
                    "finalized_via": "global_stop"
                }
                if Risk_Score_Mobile_collection is not None:
                    Risk_Score_Mobile_collection.insert_one(scores)
                else:
                    print("[ERROR] MongoDB collection not initialized during global stop")

                print(f"\n" + "="*50)
                print(f" FINAL PROCTORING SUMMARY: {key}")
                print(f"="*50)
                print(f" MOBILE CAM RISK SCORE:    {score} / 30")
                print(f" TRUST SCORE:   {trust} / 30")
                print(f" VIOLATIONS:    {count}")
                print(f" RESULT:        {'[NO RISK]' if score == 0 else '[ANOMALY DETECTED]'}")
                print(f"="*50 + "\n")

                del sessions[key]
                print(f"[MobileAgent] Session {key} finalized via global /stop")
        
        # Trigger graceful shutdown of the process with a small delay for response
        # print(f"[MobileAgent] Assessment complete. Triggering server shutdown in 0.5s...")
        # async def delayed_shutdown():
        #     await asyncio.sleep(0.5)
        #     os.kill(os.getpid(), signal.SIGINT)
        # 
        # asyncio.create_task(delayed_shutdown())

        return {"status": "success", "message": "Proctoring finalized and score saved."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[MobileAgent] Error in /stop: {str(e)}")
        return {"status": "error", "message": str(e)}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("shutdown")
def shutdown_event():
    """
    Ensure all sessions are closed on server shutdown (including Control-C).
    """
    print("[MobileAgent] Shutdown signal received. Cleaning up sessions...")
    for key, session in list(sessions.items()):
        session.close()
    print("[MobileAgent] All sessions closed.")
