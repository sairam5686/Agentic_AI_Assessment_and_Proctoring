import runpod
import base64
import json
import os
import time
import threading
import cv2
import numpy as np

# Set protocol buffers implementation to avoid issues in some environments
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

# Import project components from the local src directory
import state
from main import run_proctoring
from code_agents.code_supervisor_agent import CodeSupervisorAgent
from code_agents.plagiarism_agent import PlagiarismAgent
from code_agents.ai_detection_agent import AIDetectionAgent
from Connections.ViolationLogsDB import CodeEvaluation_collection, Risk_Score_DB

# Initialize Agents (Global for warm start in serverless environment)
plagiarism_agent = PlagiarismAgent()
ai_agent = AIDetectionAgent()
_supervisor = CodeSupervisorAgent(plagiarism_agent, ai_agent)

proctor_thread = None

def start_proctoring_thread():
    """Starts the proctoring loop in a background thread if not already running."""
    global proctor_thread
    if proctor_thread is None or not proctor_thread.is_alive():
        proctor_thread = threading.Thread(target=run_proctoring, daemon=True)
        proctor_thread.start()

def handler(job):
    """
    RunPod Serverless Handler
    
    Input Job Format:
    {
        "input": {
            "action": "receive_frame" | "stop" | "code_checker" | "get_analytics" | "store_scores",
            "data": { ... parameters for the action ... }
        }
    }
    """
    job_input = job.get("input", {})
    action = job_input.get("action")
    data = job_input.get("data", {})

    if action == "receive_frame":
        state.proctoring_active = True
        image_b64 = data.get("image", "")
        state.Assessment_id = data.get("assessment_id", "")
        state.Email_id = data.get("email_id", "")

        try:
            # Handle base64 with or without header
            if "," in image_b64:
                header, encoded = image_b64.split(",", 1)
            else:
                encoded = image_b64
            
            img_bytes = base64.b64decode(encoded)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                return {"status": "error", "message": "Failed to decode image"}

            state.latest_frame = frame
            state.latest_frame_time = time.time()
            
            # Start the background proctoring loop if it's not active
            start_proctoring_thread()
            
            return {
                "status": "success",
                "message": "frame received",
                "assessment_id": state.Assessment_id,
                "email_id": state.Email_id
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    elif action == "stop":
        state.proctoring_active = False
        return {"status": "success", "message": "proctoring stopped"}

    elif action == "get_analytics":
        suspicion_score = 0
        risk_level = "NORMAL"
        trust_score = 30
        violations = []
        
        if state.risk_agent:
            suspicion_score = state.risk_agent.suspicion_score
            risk_level = state.risk_agent.get_risk_level()
            trust_score = state.risk_agent.get_trust_score()
        
        if state.violation_agent:
            violations = state.violation_agent.violations

        return {
            "status": "success",
            "analytics": {
                "suspicion_score": suspicion_score,
                "trust_score": trust_score,
                "risk_level": risk_level,
                "violation_count": len(violations),
                "violations": violations,
                "proctoring_active": getattr(state, "proctoring_active", False)
            }
        }

    elif action == "code_checker":
        code = data.get("code")
        language = data.get("language")
        email = data.get("email")
        question_id = data.get("question_id")
        assessment_id = data.get("assessment_id")
        
        result = _supervisor.analyze(code, language)
        
        # Update shared state
        summary = result.get("risk", {})
        state.code_risk_score = summary.get("suspicion_score", 0)
        state.code_trust_score = 20 - state.code_risk_score
        state.code_violation_score = sum(summary.get("violations", {}).values())
        state.save_state()

        # Log to MongoDB
        val = {
            "code": code,
            "language": language,
            "email": email,
            "question_id": question_id,
            "assessment_id": assessment_id,
            "result": result,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        try:
            CodeEvaluation_collection.insert_one(val)
        except Exception as e:
            print(f"[Handler] DB Insert Error: {e}")
        
        return {"status": "success", "result": result}

    elif action == "store_scores":
        email = data.get("email", "unknown")
        assessment_id = data.get("assessment_id", "unknown")
        
        score_data = {
            "assessment_id": assessment_id,
            "email": email,
            "video_proctoring": {
                "risk_score": state.risk_score,
                "trust_score": state.trust_score,
                "violation_score": state.violation_score,
            },
            "code_analysis": {
                "risk_score": state.code_risk_score,
                "trust_score": state.code_trust_score,
                "violation_score": state.code_violation_score
            },
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        try:
            res = Risk_Score_DB.insert_one(score_data)
            return {"status": "success", "id": str(res.inserted_id)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    elif action == "health":
        return {
            "status": "success",
            "message": "RunPod worker is healthy",
            "proctoring_active": getattr(state, "proctoring_active", False)
        }

    else:
        return {"status": "error", "message": f"Invalid action: {action}"}

# Start the RunPod Serverless worker
runpod.serverless.start({"handler": handler})
