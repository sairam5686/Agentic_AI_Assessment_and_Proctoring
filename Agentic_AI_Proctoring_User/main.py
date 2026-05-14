from Backend.Auth.LoginHelper import LoginMaker
from Backend.Connection.Assessment_Connection_DB import (
    MCQ_DB, Coding_Questions_DB, Coding_TestCases_DB, 
    SQL_Questions_DB, SQL_TestCases_DB, Admin_Assessments_DB,
    Pipe_Puzzle_Sessions_DB, Gaming_DB, Enrollment_DB , 
    Candidate_Data_DB, Pipe_Puzzle_Results_DB,
    Coding_Results, SQL_Results, MCQ_Results, FITB_Results,
    Mobile_Sessions_DB
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Request

                  
import os
import socket
import time
import requests
import socketio
import random
import uuid
from datetime import datetime, timezone
from agora_token_builder import RtcTokenBuilder, RtmTokenBuilder
from dotenv import load_dotenv

load_dotenv()




from Backend.ExecutionEngine.CodeExcutionEngine import Code_Runner
from Backend.ExecutionEngine.SQLExcutionEngine import SQL_Runner
from Backend.LogicGamifier.PipePuzzle.PipePuzzleLogic import _get_pp_session, _grid_response, _require_pp_playing, _save_pp_session, _validate_pp_tile_bounds, flip_tile, generate_solvable_grid, generate_start_end, rotate_tile, validate_path
from Backend.LogicGamifier.PipePuzzle.PipePuzzleModelSchema import GameSession, PPSaveResultsRequest, Position, StartGameRequest, TileActionRequest
from Backend.QuestionFetcher.AssessmentFetcher import getQuestion
from Backend.ResultStorer.CodingResultStorer import Coding_store
from Backend.ResultStorer.ResultModelSchema import CodingSaveResultsRequest, MCQSaveResultsRequest, SQLSaveResultsRequest
from Backend.ResultStorer.SQLResultStorer import SQL_Storer
from Backend.Auth.OCRHelper import decode_base64_image, extract_id_info, verify_candidate_name
from Backend.routers.essay_router import router as essay_router
from Backend.routers.diagram_router import router as diagram_router
from Backend.Connection.RateLimiter import check_rate_limit
from pydantic import BaseModel

app = FastAPI()

# Socket.io setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)

# In-memory fallback removed — now using Mobile_Sessions_DB (MongoDB) for shared state

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Feature routers ───────────────────────────────────────────────────────────
app.include_router(essay_router, prefix="/api/essay", tags=["Essay Analyser"])
app.include_router(diagram_router, prefix="/api/diagram", tags=["Diagram"])

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.on("join_room")
async def handle_join(sid, data):
    a_id = str(data.get('assessment_id', '')).strip().lower()
    email = str(data.get('email', '')).strip().lower()
    room = f"{a_id}_{email}"
    await sio.enter_room(sid, room)
    print(f"Client {sid} joined room: {room}")
    
    
    # Check if mobile is already active in this room via MongoDB (shared state)
    session = Mobile_Sessions_DB.find_one({"room_id": room})
    if session and session.get("status") == "active":
        print(f"Notifying joining client {sid} that mobile is already active in room: {room}")
        await sio.emit("mobile_connected", {"status": "active"}, room=sid)

@sio.on("mobile_ready")
async def handle_mobile_ready(sid, data):
    a_id = str(data.get('assessment_id', '')).strip().lower()
    email = str(data.get('email', '')).strip().lower()
    room = f"{a_id}_{email}"
    
    # Store global state in MongoDB so all Railway instances can see it
    Mobile_Sessions_DB.update_one(
        {"room_id": room},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    # Notify all clients in the room (including the laptop)
    await sio.emit("mobile_connected", {"status": "active"}, room=room)
    print(f"Mobile ready signal stored and emitted to room: {room}")

@sio.on("start_assessment")
async def handle_start_assessment(sid, data):
    a_id = str(data.get('assessment_id', '')).strip().lower()
    email = str(data.get('email', '')).strip().lower()
    room = f"{a_id}_{email}"
    
    # Notify the mobile app to start its Agora stream
    await sio.emit("start_mobile_stream", {"message": "START AGORA STREAMING NOW"}, room=room)
    print(f"Start assessment signal emitted to room: {room}")

@sio.on("test_ended")
async def handle_test_ended(sid, data):
    a_id = str(data.get('assessment_id', '')).strip().lower()
    email = str(data.get('email', '')).strip().lower()
    room = f"{a_id}_{email}"
    
    # Clear state in MongoDB
    Mobile_Sessions_DB.delete_one({"room_id": room})
        
    # Notify the mobile app to cleanup
    await sio.emit("cleanup_mobile", {"message": "CANDIDATE TO EXIT FROM THE DASHBOARD"}, room=room)
    print(f"Test ended signal emitted and session cleared for room: {room}")

    # Explicitly stop the backend proctoring agents
    try:
        # Stop Laptop Proctor (8001)
        requests.post("http://localhost:8001/stop", timeout=1)
    except Exception as e:
        print(f"Failed to stop laptop proctor: {e}")

    try:
        # Stop Mobile Proctor (8002)
        requests.post("http://localhost:8002/stop", json={"assessment_id": a_id, "email_id": email}, timeout=1)
    except Exception as e:
        print(f"Failed to stop mobile proctor: {e}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@app.get("/api/get-server-ip")
async def get_server_ip(request: Request):
    # Dynamically detect the host from the incoming request
    # This works for both Railway (public URL) and Localhost
    host = request.headers.get("host")
    
    if host:
        # Remove any port if present (though usually fine to keep)
        return {"ip": host}
    
    # Fallback to local IP if host header is missing
    return {"ip": get_local_ip()}

@app.get("/api/mobile/status/{room_id}")
async def get_mobile_status(room_id: str):
    # room_id is assessment_id_email
    session = Mobile_Sessions_DB.find_one({"room_id": room_id})
    status = session.get("status", "inactive") if session else "inactive"
    return {"status": status}




@app.get("/agora/token")
async def get_agora_token(channelName: str, uid: int = 0):
    app_id = os.getenv("AGORA_APP_ID")
    app_certificate = os.getenv("AGORA_APP_CERTIFICATE")
    
    if not app_id or not app_certificate:
        raise HTTPException(status_code=500, detail="Agora configuration missing on server")

    expiration_time_in_seconds = 3600
    current_timestamp = int(time.time())
    privilege_expired_timestamp = current_timestamp + expiration_time_in_seconds
    role = 1  # 1 for Publisher

    token = RtcTokenBuilder.buildTokenWithUid(
        app_id, app_certificate, channelName, uid, role, privilege_expired_timestamp
    )
    
    return {"token": token}
    
@app.get("/agora/rtm-token")
async def get_agora_rtm_token(userAccount: str):
    app_id = os.getenv("AGORA_APP_ID")
    app_certificate = os.getenv("AGORA_APP_CERTIFICATE")
    
    if not app_id or not app_certificate:
        raise HTTPException(status_code=500, detail="Agora configuration missing on server")

    expiration_time_in_seconds = 3600
    current_timestamp = int(time.time())
    privilege_expired_timestamp = current_timestamp + expiration_time_in_seconds
    role = 1  # 1 for RtmRole.Rtm_User

    token = RtmTokenBuilder.buildToken(
        app_id, app_certificate, userAccount, role, privilege_expired_timestamp
    )
    
    return {"token": token}

@app.get("/assessment/{assessment_id}/questions")
async def get_assessment_questions(assessment_id: str):
    result = await getQuestion(assessment_id=assessment_id)
    return result

@app.post("/candidate/login")
async def candidate_login(request: Request):
    check_rate_limit(request, "auth")
    body = await request.json()
    identifier = body.get("identifier")
    assessment_id = body.get("assessment_id")
    result = await LoginMaker(identifier=identifier, assessment_id=assessment_id)
    return result

class IDVerifyRequest(BaseModel):
    image: str
    enrolled_name: str

@app.post("/api/verify-id")
async def verify_id(req: IDVerifyRequest):
    try:
        # 1. Decode image
        image = decode_base64_image(req.image)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        # 2. Extract info using EasyOCR
        info = extract_id_info(image, enrolled_name=req.enrolled_name)
        extracted_name = info.get("name")
        raw_text = info.get("raw_text", "")
        
        # 3. Verify name match
        is_verified = verify_candidate_name(extracted_name, req.enrolled_name, raw_text)
        
        if is_verified:
            return {
                "status": "success",
                "message": "ID CARD VERIFICATION IS DONE SUCCESSFULLY",
                "extracted_name": extracted_name
            }
        else:
            return {
                "status": "failed",
                "message": f"Name verification failed. Expected: {req.enrolled_name}",
                "extracted_name": extracted_name
            }
            
    except Exception as e:
        print(f"[OCR ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification internal error: {str(e)}")


@app.post("/api/pipe-puzzle/game/start")
async def pp_start_game(req: StartGameRequest) -> dict:
    start, end = generate_start_end(req.rows, req.cols)
    grid = generate_solvable_grid(req.rows, req.cols, start, end)
    session_id = str(uuid.uuid4())[:8]
    session = GameSession(
        session_id=session_id, grid=grid, start=start, end=end,
        rows=req.rows, cols=req.cols
    )
    await _save_pp_session(session)
    return {
        "session_id": session_id,
        "grid": _grid_response(grid),
        "start": start.model_dump(),
        "end": end.model_dump(),
        "status": session.status,
    }


@app.get("/api/pipe-puzzle/game/{session_id}")
async def pp_get_game(session_id: str) -> dict:
    session = await _get_pp_session(session_id)
    return {
        "session_id": session.session_id,
        "grid": _grid_response(session.grid),
        "start": session.start.model_dump(),
        "end": session.end.model_dump(),
        "status": session.status,
        "moves": session.moves,
        "rotations": session.rotations,
        "flips": session.flips,
    }


@app.post("/api/pipe-puzzle/game/{session_id}/rotate")
async def pp_rotate(session_id: str, req: TileActionRequest) -> dict:
    session = await _get_pp_session(session_id)
    _require_pp_playing(session)
    _validate_pp_tile_bounds(session, req.row, req.col)
    session.grid = rotate_tile(session.grid, Position(row=req.row, col=req.col))
    session.rotations += 1
    await _save_pp_session(session)
    return {"grid": _grid_response(session.grid), "rotations": session.rotations}


@app.post("/api/pipe-puzzle/game/{session_id}/flip")
async def pp_flip(session_id: str, req: TileActionRequest) -> dict:
    session = await _get_pp_session(session_id)
    _require_pp_playing(session)
    _validate_pp_tile_bounds(session, req.row, req.col)
    session.grid = flip_tile(session.grid, Position(row=req.row, col=req.col))
    session.flips += 1
    await _save_pp_session(session)
    return {"grid": _grid_response(session.grid), "flips": session.flips}


@app.post("/api/pipe-puzzle/game/{session_id}/submit")
async def pp_submit(session_id: str) -> dict:
    session = await _get_pp_session(session_id)
    _require_pp_playing(session)
    session.attempts += 1
    path = validate_path(session.grid, session.start, session.end)
    is_valid = len(path) > 0
    if is_valid:
        session.status = "WON"
    await _save_pp_session(session)
    return {"valid": is_valid, "status": session.status, "path": path if is_valid else []}


@app.post("/api/pipe-puzzle/game/{session_id}/select")
async def pp_select_tile(session_id: str, req: TileActionRequest) -> dict:
    session = await _get_pp_session(session_id)
    _validate_pp_tile_bounds(session, req.row, req.col)
    session.moves += 1
    await _save_pp_session(session)
    return {"moves": session.moves}


@app.post("/api/pipe-puzzle/results")
async def pp_save_results(req: PPSaveResultsRequest) -> dict:
    scores = [s.model_dump() for s in req.scores]
    
    # Store results in Pipe_Puzzle_Results_DB (CandidateDB Database)
    Pipe_Puzzle_Results_DB.insert_one({
        "email": req.email,
        "user_name": req.user_name,
        "assessment_id": req.assessment_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "scores": scores
    })
    
    return {"message": "Results saved to Pipe_Puzzle_Results collection"}


@app.get("/api/pipe-puzzle/results")
async def pp_get_results() -> list[dict]:
    cursor = Pipe_Puzzle_Results_DB.find().sort("_id", -1)
    rows = list(cursor)
    return [
        {"id": str(r["_id"]), "timestamp": r["timestamp"], "scores": r["scores"]}
        for r in rows
    ]



class FITBAnswer(BaseModel):
    blank_index: int
    user_answer: str
    is_correct: bool

class FITBQuestionResult(BaseModel):
    question_id: int
    user_answers: list[str]
    results: list[FITBAnswer]
    marks_earned: float

class FITBSaveResultsRequest(BaseModel):
    assessment_id: str
    user_name: str
    email: str
    FITB_Result: list[FITBQuestionResult]
    user_total_marks: float
    total_marks: float

@app.post("/api/fitb/results")
async def fitb_save_results(req: FITBSaveResultsRequest, request: Request):
    check_rate_limit(request, "submission")
    try:
        FITB_Results.insert_one({
            "assessment_id": req.assessment_id,
            "user_name": req.user_name,
            "email": req.email,
            "FITB_Result": [r.model_dump() for r in req.FITB_Result],
            "user_total_marks": req.user_total_marks,
            "total_marks": req.total_marks,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        return {"status": "success", "message": "FITB results saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mcq/results")
async def mcq_save_results(req: MCQSaveResultsRequest, request: Request):
    check_rate_limit(request, "submission")
    try:
        MCQ_Results.insert_one({
            "assessment_id": req.assessment_id,
            "user_name": req.user_name,
            "email": req.email,
            "MCQ_Result": [r.model_dump() for r in req.MCQ_Result],
            "user_total_marks": req.user_total_marks,
            "total_marks": req.total_marks,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        return {"status": "success", "message": "MCQ results saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/coding/results")
async def save_coding_results(req: CodingSaveResultsRequest, request: Request):
    check_rate_limit(request, "submission")
    result = await Coding_store(req=req)
    return result

@app.post("/api/sql/results")
async def save_sql_results(req: SQLSaveResultsRequest, request: Request):
    check_rate_limit(request, "submission")
    result = await SQL_Storer(req=req)
    return result


@app.post("/run-code")
async def run_code(request: Request):
    check_rate_limit(request, "execution")
    body = await request.json()

    assessment_id = body.get("assessment_id")
    question_id = body.get("question_id")
    language = body.get("language")
    code = body.get("code")
    result =  await Code_Runner(assessment_id=assessment_id, question_id=question_id, language=language, code=code)
    return result


@app.post("/run-sql")
async def run_sql(request: Request):
    check_rate_limit(request, "execution")
    body = await request.json()
    assessment_id = body.get("assessment_id")
    question_id = body.get("question_id")
    code = body.get("code")
    result  = await SQL_Runner(assessment_id=assessment_id, question_id=question_id, code=code)
    return result


# Wrap the FastAPI app with technical middleware if needed
# app = ...
