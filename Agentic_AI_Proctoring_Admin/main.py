from datetime import datetime
from urllib import request
import uuid
import json
from fastapi import FastAPI ,  HTTPException , Request ,  UploadFile, File, Form
from Backend.Workers.Mail_Service import send_assessment_mail, send_proctor_mail, send_university_assessment_mail, send_certification_mail
from Backend.Connection.Assessment_Connection import MCQ_DB, Admin_Assessments_DB, Coding_Questions_DB, Coding_TestCases_DB, Enrollment_DB, SQL_Questions_DB, SQL_TestCases_DB, Gaming_DB, Game_Sessions_DB, Invigilator_DB
from Backend.Excels_Parsers.MCQ_Parser import mcq_parser
from Backend.Excels_Parsers.FITB_Parser import fitb_parser
from Backend.Connection.Assessment_Connection import FITB_DB
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from Backend.Excels_Parsers.Coding_Parser import coding_parser
from Backend.Excels_Parsers.Enrollment_Parser import enrollment_parser
from Backend.Excels_Parsers.SQL_Parser import sql_parser
import string
import random
from Backend.Workers.Pipe_Puzzle_Logic import PipePuzzleLogic
import time
from agora_token_builder import RtcTokenBuilder, RtmTokenBuilder
from Backend.Connection.Evdiences_log import Coding_collection, violation_logs_collection, Mobile_logs_collection
from Backend.Connection.Assessment_Connection import MCQ_Results_DB, Coding_results_DB, SQL_Results_DB, Piped_Puzzle_DB, FITB_Results_DB, Essay_Results_DB, Diagram_Results_DB
from Backend.Connection.Evdiences_log import Risk_Score_DB , Mobile_Risk_Score

import os
from dotenv import load_dotenv
from Backend.Connection.RateLimiter import check_rate_limit
import cloudinary
import cloudinary.uploader

load_dotenv()

# Agora Credentials
AGORA_APP_ID = os.getenv("AGORA_APP_ID", "").replace('"', '').strip()
# IMPORTANT: Replace with your actual App Certificate from Agora Console
AGORA_APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE", "").replace('"', '').strip() 

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_LAPTOP_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_LAPTOP_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_LAPTOP_API_SECRET")
)



app = FastAPI()

# IMPORTANT FUNCTION 


def serialize_mongo(data):
    if isinstance(data, list):
        return [serialize_mongo(item) for item in data]
    if isinstance(data, dict):
        return {
            key: serialize_mongo(value)
            for key, value in data.items()
        }
    if isinstance(data, ObjectId):
        return str(data)
    return data


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/admin/{admin_id}/tests")
async def get_admin_tests(admin_id: str):
    tests = []
    # Return only tests that are "active" (Running) or "terminated" (Terminated)
    for doc in Admin_Assessments_DB.find({"admin_id": admin_id, "status": {"$in": ["active", "terminated"]}}):
        doc["_id"] = str(doc["_id"])
        
        # Fetch candidate count from Enrollment_DB
        enrollment = Enrollment_DB.find_one({"assessment_id": doc["test_id"]})
        doc["candidate_count"] = len(enrollment.get("candidates", [])) if enrollment else 0
        
        tests.append(doc)
    return tests

@app.post("/update-test-status")
async def update_test_status(assessment_id: str = Form(...), status: str = Form(...)):
    result = Admin_Assessments_DB.update_one(
        {"test_id": assessment_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found or status already set")
    return {"message": f"Assessment status updated to {status}"}
    




@app.post("/create-test")
async def create_test(
    Admin_id: str = Form(...),
    Test_Title: str = Form(...),
    Category: str = Form("Hiring"),
    Department: str = Form(None),
    Semester: str = Form(None),
    Subject_Code: str = Form(None),
    Regulation: str = Form(None),
    Subject_Name: str = Form(None),
    MCQ_duration: str = Form(None),
    Coding_duration: str = Form(None),
    SQL_duration: str = Form(None),
    FITB_duration: str = Form(None),
    MCQ_file: UploadFile = File(None),
    Coding_file: UploadFile = File(None),
    SQL_file: UploadFile = File(None),
    FITB_file: UploadFile = File(None),
    Gaming_enabled: str = Form("false"),
    Gaming_duration_per_round: str = Form(None),
    Gaming_rounds_count: str = Form(None),
    Essay_enabled: str = Form("false"),
    Essay_topic: str = Form(None),
    Essay_instructions: str = Form(None),
    Essay_duration: str = Form(None),
    Essay_rubric: str = Form(None),
    Certification_Track: str = Form(None),
    Certification_Issuer: str = Form(None),
    Certification_Title: str = Form(None),
    Certification_Thresholds: str = Form(None),
    Certification_Global_Threshold: str = Form(None),
    Diagram_enabled: str = Form("false"),
    Diagram_prompt: str = Form(None),
    Diagram_master_json: str = Form(None),
    Diagram_master_image: str = Form(None),
    request: Request = None
):
    if request:
        check_rate_limit(request, "submission")
    TestId = uuid.uuid4()


    mcq_sections = None
    if MCQ_file:
        mcq_sections = await mcq_parser(
            file=MCQ_file,
            assessment_id=str(TestId),
            Test_Title=Test_Title,
            MCQ_duration=MCQ_duration
        )
    
    # Handle Diagram Master Image Upload to Cloudinary
    final_master_image_url = None
    if Diagram_enabled.lower() == "true" and Diagram_master_image:
        try:
            image_data = Diagram_master_image
            if "," in image_data:
                image_data = image_data.split(",")[1]
            
            upload_result = cloudinary.uploader.upload(
                f"data:image/png;base64,{image_data}",
                folder=f"assessments/{str(TestId)}/master",
                public_id=f"master_{datetime.now().timestamp()}"
            )
            final_master_image_url = upload_result.get("secure_url")
            print(f"Diagram Master Image uploaded to Cloudinary: {final_master_image_url}")
        except Exception as e:
            print(f"Cloudinary Upload Error: {e}")
            final_master_image_url = Diagram_master_image # Fallback to base64 if upload fails

    Admin_Assessments_DB.insert_one({
            "admin_id": Admin_id,
            "test_id": str(TestId),
            "test_title": Test_Title,
            "category": Category,
            "department": Department,
            "semester": Semester,
            "subject_code": Subject_Code,
            "regulation": Regulation,
            "subject_name": Subject_Name,
            "essay_enabled": Essay_enabled.lower() == "true",
            "essay_topic": Essay_topic if Essay_enabled.lower() == "true" else None,
            "essay_instructions": Essay_instructions if Essay_enabled.lower() == "true" else None,
            "essay_duration": int(Essay_duration) if Essay_duration and Essay_duration.isdigit() else None,
            "essay_rubric": json.loads(Essay_rubric) if Essay_rubric and Essay_enabled.lower() == "true" else None,
            "certification_config": {
                "track_name": Certification_Track,
                "issuer": Certification_Issuer,
                "title": Certification_Title,
                "thresholds": json.loads(Certification_Thresholds) if Certification_Thresholds else {},
                "global_threshold": int(Certification_Global_Threshold) if Certification_Global_Threshold else 60
            } if Category == "Certification" else None,
            "diagram_enabled": Diagram_enabled.lower() == "true",
            "diagram_prompt": Diagram_prompt if Diagram_enabled.lower() == "true" else None,
            "diagram_master_json": json.loads(Diagram_master_json) if Diagram_master_json and Diagram_enabled.lower() == "true" else None,
            "diagram_master_image": final_master_image_url if Diagram_enabled.lower() == "true" else None,
            "created_at": datetime.now(),
            "status": "active"
        })



    coding_result = None
    if Coding_file:
        print("Coding File:", Coding_file.filename)
        coding_result = await coding_parser(
            file=Coding_file,
            assessment_id=str(TestId),
            Test_Title=Test_Title,
            Coding_duration=Coding_duration
        )

    sql_result = None
    if SQL_file:
        print("SQL File:", SQL_file.filename)
        sql_result = await sql_parser(
            file=SQL_file,
            assessment_id=str(TestId),
            Test_Title=Test_Title,
            SQL_duration=SQL_duration
        )

    fitb_result = None
    if FITB_file:
        print("FITB File:", FITB_file.filename)
        fitb_result = await fitb_parser(
            file=FITB_file,
            assessment_id=str(TestId),
            Test_Title=Test_Title,
            FITB_duration=FITB_duration
        )

    # Always create a gaming configuration entry, but set game enabled state based on input
    rounds = int(Gaming_rounds_count) if Gaming_rounds_count and Gaming_rounds_count.isdigit() else 3
    rounds = min(rounds, 3) # Cap at 3 rounds max
    dur_per_round = 4 # Fixed 4 minutes per round
    total_dur = rounds * dur_per_round
    
    Gaming_DB.insert_one({
        "assessment_id": str(TestId),
        "test_title": Test_Title,
        "games": [{
            "game_id": "pipe-puzzle",
            "enabled": Gaming_enabled.lower() == "true",
            "duration_per_round": dur_per_round,
            "total_duration": total_dur,
            "rounds_count": rounds,
            "rounds_config": [
                { "round": 1, "grid_size": 3 },
                { "round": 2, "grid_size": 5 },
                { "round": 3, "grid_size": 7 }
            ][:rounds]
        }]
    })

    return TestId


@app.get("/admin/test/{assessment_id}/Preview")
async def get_test_preview(assessment_id: str):

    mcq = MCQ_DB.find_one({"assessment_id": assessment_id})
    coding = Coding_Questions_DB.find_one({"assessment_id": assessment_id})
    sql = SQL_Questions_DB.find_one({"assessment_id": assessment_id})
    gaming = Gaming_DB.find_one({"assessment_id": assessment_id})
    fitb = FITB_DB.find_one({"assessment_id": assessment_id})

    testcases_cursor = Coding_TestCases_DB.find(
        {"assessment_id": assessment_id}
    )

    testcases = {}
    for tc in testcases_cursor:
        testcases[tc["question_id"]] = tc["testcases"]

    # Get assessment status and other metadata
    assessment_info = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    status = assessment_info.get("status", "draft") if assessment_info else "draft"

    # Build essay config from assessment metadata
    essay = None
    if assessment_info and assessment_info.get("essay_enabled"):
        essay = {
            "enabled": True,
            "topic": assessment_info.get("essay_topic", ""),
            "duration": assessment_info.get("essay_duration"),
            "rubric": assessment_info.get("essay_rubric"),
        }

    # Build diagram config
    diagram = None
    if assessment_info and assessment_info.get("diagram_enabled"):
        diagram = {
            "enabled": True,
            "prompt": assessment_info.get("diagram_prompt", ""),
            "master_json": assessment_info.get("diagram_master_json"),
            "master_image": assessment_info.get("diagram_master_image"),
        }

    # 🔥 SERIALIZE EVERYTHING
    response = {
        "assessment_id": assessment_id,
        "status": status,
        "metadata": assessment_info,
        "Coding": coding,
        "MCQ": mcq,
        "SQL": sql,
        "Gaming": gaming,
        "FITB": serialize_mongo(fitb),
        "Essay": essay,
        "Diagram": diagram,
        "TestCases": testcases,
        "category": assessment_info.get("category") if assessment_info else "Hiring",
        "certification_config": assessment_info.get("certification_config") if assessment_info else None
    }

    return serialize_mongo(response)


# ─── Pipe Puzzle Game Endpoints ─────────────────────────────────────────────

@app.post("/game/pipe-puzzle/start")
async def start_pipe_puzzle(assessment_id: str = Form(...), round: int = Form(1)):
    # Check assessment status
    assessment_info = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    if not assessment_info or assessment_info.get("status") != "active":
        raise HTTPException(status_code=403, detail="This assessment is not active or has been terminated.")

    # Fixed sizes per round
    size = 3 if round == 1 else (5 if round == 2 else 7)
    logic = PipePuzzleLogic(size)
    
    session_id = str(uuid.uuid4())
    Game_Sessions_DB.insert_one({
        "session_id": session_id,
        "assessment_id": assessment_id,
        "round": round,
        "size": size,
        "grid": logic.grid,
        "created_at": datetime.now()
    })
    
    return {"session_id": session_id, "grid": logic.grid, "size": size}

@app.post("/game/pipe-puzzle/action")
async def pipe_puzzle_action(session_id: str = Form(...), row: int = Form(...), col: int = Form(...), action: str = Form(...)):
    session = Game_Sessions_DB.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    grid = session["grid"]
    tile = grid[row][col]
    
    if action == "rotate":
        tile["rotation"] = (tile["rotation"] + 90) % 360
    elif action == "flip":
        tile["flipped"] = not tile["flipped"]
        
    Game_Sessions_DB.update_one(
        {"session_id": session_id},
        {"$set": {"grid": grid}}
    )
    
    return {"tile": tile}

@app.post("/game/pipe-puzzle/submit")
async def submit_pipe_puzzle(request: Request, session_id: str = Form(...)):
    check_rate_limit(request, "submission")
    session = Game_Sessions_DB.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # In a real scenario, we would run the logic.validate_path(session["grid"])
    # For now, we simulate success for demonstration
    is_valid = True
    path = [(0,0), (0,1), (1,1)] # Dummy path
    
    return {"valid": is_valid, "path": path}


@app.post("/save-test")
async def save_test(assessment_id: str = Form(...), file: UploadFile = File(...)):
    await enrollment_parser(file, assessment_id)
    return {"message": "Candidate list saved successfully"}


@app.post("/initiate-test")
async def initiate_test(request: Request, assessment_id: str = Form(...)):
    check_rate_limit(request, "submission")
    enrollment = Enrollment_DB.find_one({"assessment_id": assessment_id})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment data not found")

    test_info = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    test_title = test_info["test_title"] if test_info else "New Assessment"

    candidates = enrollment.get("candidates", [])
    sent_count = 0
    
    # Robust category check
    raw_category = str(test_info.get("category", "Hiring") if test_info else "Hiring").strip().lower()
    is_university = "university" in raw_category
    
    for candidate in candidates:
        link = "http://localhost:5173/"
        
        if is_university:
            # UNIVERSITY EXAM EMAIL
            success = send_university_assessment_mail(
                candidate["email"],
                candidate["name"],
                candidate.get("reg_no", "N/A"),
                test_title,
                assessment_id,
                link,
                candidate.get("valid_from", "N/A"),
                candidate.get("valid_to", "N/A")
            )
        else:
            # HIRING ASSESSMENT EMAIL
            success = send_assessment_mail(
                candidate["email"], 
                candidate["name"], 
                test_title, 
                assessment_id,
                link,
                candidate.get("valid_from", "N/A"),
                candidate.get("valid_to", "N/A")
            )
        if success:
            status_text = "invitation sent to candidate"
            sent_count += 1
        else:
            status_text = "mail not sent"
            
        # Update status in DB for each candidate
        Enrollment_DB.update_one(
            {"assessment_id": assessment_id, "candidates.email": candidate["email"]},
            {"$set": {
                "candidates.$.status": status_text
            }}
        )
            
    # Update assessment status to active
    Admin_Assessments_DB.update_one(
        {"test_id": assessment_id},
        {"$set": {"status": "active", "initiated_at": datetime.now()}}
    )

    return {"message": f"Mails sent to {sent_count} candidates successfully"}


@app.get("/dashboard-stats")
async def get_dashboard_stats():
    assessments_created = Admin_Assessments_DB.count_documents({})

    candidates_enrolled = 0
    for doc in Enrollment_DB.find({}):
        candidates_enrolled += len(doc.get("candidates", []))

    tests_deployed = Admin_Assessments_DB.count_documents({"status": "active"})

    return {
        "assessments_created": assessments_created,
        "candidates_enrolled": candidates_enrolled,
        "ai_models": 6,
        "tests_deployed": tests_deployed,
    }



@app.get("/admin/test/{assessment_id}/candidates")
async def get_assessment_candidates(assessment_id: str):
    enrollment = Enrollment_DB.find_one({"assessment_id": assessment_id})
    if not enrollment:
        return []
        
    candidates = enrollment.get("candidates", [])
    
    # Check test metadata for rubrics/max marks
    test_info = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    
    for cand in candidates:
        email = cand.get("email")
        query = {"assessment_id": assessment_id, "email": email}
        
        total_score = 0
        
        # MCQ
        mcq_results = list(MCQ_Results_DB.find(query))
        if mcq_results:
            best_mcq = max(mcq_results, key=lambda x: x.get("user_total_marks", 0))
            total_score += best_mcq.get("user_total_marks", 0)
            
        # Coding
        cod_results = list(Coding_results_DB.find(query))
        if cod_results:
            best_cod = max(cod_results, key=lambda x: x.get("total_marks", 0))
            total_score += best_cod.get("total_marks", 0)
            
        # SQL
        sql_results = list(SQL_Results_DB.find(query))
        if sql_results:
            best_sql = max(sql_results, key=lambda x: x.get("total_marks", 0))
            total_score += best_sql.get("total_marks", 0)
            
        # FITB
        fitb_results = list(FITB_Results_DB.find(query))
        if fitb_results:
            best_fitb = max(fitb_results, key=lambda x: x.get("user_total_marks", 0))
            total_score += best_fitb.get("user_total_marks", 0)
            
        # Essay
        if Essay_Results_DB is not None:
            essay_res = Essay_Results_DB.find_one(query)
            if essay_res:
                ev = essay_res.get("result") or essay_res.get("evaluation") or {}
                total_score += float(ev.get("total_score") or ev.get("score") or 0)
                
        # Confidence/Trust Score
        risk_doc = Risk_Score_DB.find_one(query)
        if risk_doc:
            vid_trust = risk_doc.get("video_proctoring", {}).get("trust_score", 0)
            code_trust = risk_doc.get("code_analysis", {}).get("trust_score", 0)
            cand["confidence_score"] = round((vid_trust + code_trust) / 2)
                
        # Attach to candidate if they have any score or if they've started
        if total_score > 0 or cand.get("status") in ["Joined", "Completed"]:
            cand["total_score"] = round(total_score, 2)
            
    return serialize_mongo(candidates)

@app.get("/admin/test/{assessment_id}/candidate/{candidate_id}/analytics")
async def get_candidate_analytics(assessment_id: str, candidate_id: str):
    from Backend.Connection.Assessment_Connection import Results_DB
    
    # Query Results_DB for the candidate's result in this assessment
    result = Results_DB.find_one({"assessment_id": assessment_id, "candidate_id": candidate_id})
    
    if not result:
        raise HTTPException(status_code=404, detail="Candidate analytics not found")
        
    return serialize_mongo(result)
    
@app.get("/agora/token")
async def get_agora_token(channelName: str):
    # Role: 1 for Publisher, 2 for Subscriber.
    role = 1 
    expiration_time_in_seconds = 3600
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time_in_seconds
    
    # Using UID 0 allows any user to join with this token
    token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID, 
        AGORA_APP_CERTIFICATE, 
        channelName, 
        0, 
        role, 
        privilege_expired_ts
    )
    return {"token": token}
    
@app.get("/agora/rtm-token")
async def get_agora_rtm_token(userAccount: str):
    try:
        # Debug: Check if credentials are loaded
        print(f"DEBUG: App ID starts with: {AGORA_APP_ID[:4]}...")
        
        expiration_time_in_seconds = 3600
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expiration_time_in_seconds
        
        # Use the standard RtmTokenBuilder for maximum compatibility
        token = RtmTokenBuilder.buildToken(
            AGORA_APP_ID, 
            AGORA_APP_CERTIFICATE, 
            userAccount, 
            1, # Role Rtm_User
            privilege_expired_ts
        )
        return {"token": token}
    except Exception as e:
        print(f"CRITICAL ERROR in RTM Token Generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Token Generation Failed: {str(e)}")

@app.delete("/delete-test/{assessment_id}")
async def delete_test(request: Request, assessment_id: str):
    check_rate_limit(request, "submission")
    try:
        from bson import ObjectId
        
        # 1. Collect all DBs to clean up
        dbs_to_clean = [
            MCQ_DB, 
            Coding_Questions_DB, 
            Coding_TestCases_DB, 
            Enrollment_DB, 
            SQL_Questions_DB, 
            SQL_TestCases_DB, 
            Gaming_DB, 
            Game_Sessions_DB
        ]
        
        # 2. Try deleting by test_id first (UUID string)
        result = Admin_Assessments_DB.delete_one({"test_id": assessment_id})
        
        # If deleted from main dashboard, clean up all related collections
        if result.deleted_count == 1:
            for db in dbs_to_clean:
                db.delete_many({"assessment_id": assessment_id})
            return {"message": "Assessment deleted successfully from all records"}
            
        # 3. If not found by test_id, try deleting by ObjectId (rare but handled)
        if ObjectId.is_valid(assessment_id):
            # First find the test_id associated with this _id to clean other collections
            doc = Admin_Assessments_DB.find_one({"_id": ObjectId(assessment_id)})
            if doc:
                internal_test_id = doc.get("test_id")
                Admin_Assessments_DB.delete_one({"_id": ObjectId(assessment_id)})
                if internal_test_id:
                    for db in dbs_to_clean:
                        db.delete_many({"assessment_id": internal_test_id})
                return {"message": "Assessment deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Assessment not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@app.get("/EvidencesLogs/{assessment_id}/{candidate_email}/get")
async def get_evidences_logs(assessment_id: str, candidate_email: str):
    # Fetch laptop logs
    laptop_logs = list(violation_logs_collection.find({
        "assessment_id": assessment_id,
        "email": candidate_email
    }))
    for log in laptop_logs:
        log["camera_type"] = "laptop"

    # Fetch mobile logs
    mobile_logs = []
    if Mobile_logs_collection is not None:
        mobile_logs = list(Mobile_logs_collection.find({
            "assessment_id": assessment_id,
            "email": candidate_email
        }))
        for log in mobile_logs:
            log["camera_type"] = "mobile"
            log["cloud_url"] = log.get("link_path")

    # Combine and return
    combined_logs = laptop_logs + mobile_logs
    return serialize_mongo(combined_logs)



@app.get("/EvidencesLogs/{assessment_id}/{candidate_email}/analytics/code")
async def get_coding_analytics(assessment_id: str, candidate_email: str):
    result = list(Coding_collection.find({
            "assessment_id": assessment_id,
            "email": candidate_email
    }))


    return serialize_mongo(result)


@app.get("/candidate/{assessment_id}/{candidate_email}/results")
async def get_candidate_results(assessment_id: str, candidate_email: str):
    query = {"assessment_id": assessment_id, "email": candidate_email}
    
    MCQ_results = list(MCQ_Results_DB.find(query))
    Coding_results = list(Coding_results_DB.find(query))
    SQL_results = list(SQL_Results_DB.find(query))
    FITB_results = list(FITB_Results_DB.find(query))
    Pipe_Puzzle_results = list(Piped_Puzzle_DB.find(query))
    Diagram_results = list(Diagram_Results_DB.find(query))

    # Essay results use email and assessment_id
    essay_result = None
    if Essay_Results_DB is not None:
        essay_result = Essay_Results_DB.find_one(
            {"assessment_id": assessment_id, "email": candidate_email},
            {"_id": 0}
        )
    
    combined_results = {
        "assessment_id": assessment_id,
        "email": candidate_email,
        "MCQ": MCQ_results,
        "Coding": Coding_results,
        "SQL": SQL_results,
        "FITB": serialize_mongo(FITB_results),
        "Gaming": serialize_mongo(Pipe_Puzzle_results),
        "Diagram": serialize_mongo(Diagram_results),
        "Essay": essay_result,
        "summary": {
            "total_MCQ": len(MCQ_results),
            "total_Coding": len(Coding_results),
            "total_SQL": len(SQL_results),
            "total_FITB": len(FITB_results),
            "total_Pipe_Puzzle": len(Pipe_Puzzle_results),
            "total_questions": len(MCQ_results) + len(Coding_results) + len(SQL_results) + len(Pipe_Puzzle_results) + len(FITB_results)
        }
    }
    return serialize_mongo(combined_results)


@app.get("/candidate/{assessment_id}/{candidate_email}/essay-result")
async def get_essay_result(assessment_id: str, candidate_email: str):
    """Dedicated endpoint for fetching a single candidate's essay evaluation."""
    if Essay_Results_DB is None:
        raise HTTPException(status_code=503, detail="Essay results database unavailable.")
    record = Essay_Results_DB.find_one(
        {"assessment_id": assessment_id, "email": candidate_email},
        {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="No essay result found for this candidate.")
    return serialize_mongo(record)

# ─── Proctor Management Endpoints ─────────────────────────────────────────────

@app.post("/admin/assign-proctor")
async def assign_proctor(
    assessment_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    candidate_count: int = Form(...)
):
    # Check if assessment exists
    assessment = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Get all enrolled candidates in their existing order
    enrollment = Enrollment_DB.find_one({"assessment_id": assessment_id})
    all_candidates = enrollment.get("candidates", []) if enrollment else []

    # Get already-assigned candidate emails from all existing proctors
    existing_proctors = list(Invigilator_DB.find({"assessment_id": assessment_id}))
    already_assigned_emails = set()
    for p in existing_proctors:
        already_assigned_emails.update(p.get("assigned_candidates", []))

    # Filter to unassigned candidates (preserve enrollment order)
    unassigned = [c for c in all_candidates if c["email"] not in already_assigned_emails]

    if candidate_count <= 0:
        raise HTTPException(status_code=400, detail="Candidate count must be greater than 0")
    if candidate_count > len(unassigned):
        raise HTTPException(status_code=400, detail=f"Only {len(unassigned)} unassigned candidates remaining")

    # Assign the first N unassigned candidates (enrollment order)
    assigned = unassigned[:candidate_count]
    assigned_emails = [c["email"] for c in assigned]

    # Generate 8-character random passkey
    passkey = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    # Save proctor details with assigned candidates
    Invigilator_DB.insert_one({
        "assessment_id": assessment_id,
        "name": name,
        "email": email,
        "passkey": passkey,
        "candidate_count": candidate_count,
        "assigned_candidates": assigned_emails,
        "assigned_at": datetime.now()
    })

    # Send email to proctor
    success = send_proctor_mail(email, name, assessment["test_title"], assessment_id, passkey)
    
    if not success:
        print(f"Warning: Failed to send proctor email to {email}")

    return serialize_mongo({
        "message": "Proctor assigned successfully",
        "passkey": passkey,
        "email": email,
        "name": name,
        "candidate_count": candidate_count,
        "assigned_candidates": assigned_emails,
        "assigned_candidate_details": assigned,
        "email_sent": success
    })

@app.post("/admin/send-certificate")
async def send_certificate(
    email: str = Form(...),
    name: str = Form(...),
    track_name: str = Form(...),
    certificate_id: str = Form(...),
    score: str = Form(...),
    issuer: str = Form("TEAM_TITANS"),
    Certificate_Image: str = Form(None) # Base64 string of the certificate
):
    # If image is provided, strip the data:image/png;base64, prefix if present
    attachment_content = None
    if Certificate_Image and "," in Certificate_Image:
        attachment_content = Certificate_Image.split(",")[1]
    elif Certificate_Image:
        attachment_content = Certificate_Image

    success = send_certification_mail(email, name, track_name, certificate_id, score, attachment_content, issuer)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send certificate email")
    return {"message": "Certificate sent successfully"}

@app.post("/proctor/login")
async def proctor_login(
    request: Request,
    assessment_id: str = Form(...),
    passkey: str = Form(...)
):
    check_rate_limit(request, "auth")
    assessment_id = assessment_id.strip()
    passkey = passkey.strip().upper()
    print(f"Login attempt: ID={assessment_id}, Passkey={passkey}")
    proctor = Invigilator_DB.find_one({
        "assessment_id": assessment_id,
        "passkey": passkey
    })
    
    if not proctor:
        print("Login failed: Proctor not found in DB")
        raise HTTPException(status_code=401, detail="Invalid Assessment ID or Passkey")
        
    print(f"Login successful for {proctor['email']}")
    return serialize_mongo(proctor)

@app.get("/proctor/assigned-candidates")
async def get_assigned_candidates(
    assessment_id: str,
    proctor_email: str
):
    # Get proctor details to find assigned candidates
    # Get proctor details to find assigned candidates
    proctor = Invigilator_DB.find_one({
        "assessment_id": assessment_id,
        "email": proctor_email
    })
    
    if not proctor:
        raise HTTPException(status_code=404, detail="Proctor assignment not found")
    
    assigned_emails = proctor.get("assigned_candidates", [])
    
    enrollment = Enrollment_DB.find_one({"assessment_id": assessment_id})
    if not enrollment:
        return []
    
    # Only return candidates assigned to this specific proctor
    all_candidates = enrollment.get("candidates", [])
    assigned = [c for c in all_candidates if c["email"] in assigned_emails]
    
    return serialize_mongo(assigned)

@app.delete("/admin/terminate-proctor/{assessment_id}/{email}")
async def terminate_proctor(assessment_id: str, email: str):
    result = Invigilator_DB.delete_one({
        "assessment_id": assessment_id,
        "email": email
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proctor assignment not found")
    return {"message": "Proctor assignment terminated successfully"}

@app.get("/admin/test/{assessment_id}/proctor")
async def get_assessment_proctor(assessment_id: str):
    proctors = list(Invigilator_DB.find({"assessment_id": assessment_id}))
    if not proctors:
        return []
    return serialize_mongo(proctors)

@app.get("/admin/test/{assessment_id}/unassigned-candidates")
async def get_unassigned_candidates(assessment_id: str):
    enrollment = Enrollment_DB.find_one({"assessment_id": assessment_id})
    all_candidates = enrollment.get("candidates", []) if enrollment else []

    # Gather all assigned candidate emails from all proctors
    existing_proctors = list(Invigilator_DB.find({"assessment_id": assessment_id}))
    already_assigned_emails = set()
    for p in existing_proctors:
        already_assigned_emails.update(p.get("assigned_candidates", []))

    # Return unassigned candidates in enrollment order
    unassigned = [c for c in all_candidates if c["email"] not in already_assigned_emails]
    return serialize_mongo(unassigned)

@app.get("/candidate/{assessment_id}/{email}/risk-score")
async def get_risk_score(assessment_id , email):
    data = Risk_Score_DB.find_one({"assessment_id":assessment_id , "email":email }) 
    return serialize_mongo(data)


@app.get("/candidate/{assessment_id}/{email}/risk-score/mobile")
async def get_risk_score_mobile(assessment_id ,email ):
    data   = Mobile_Risk_Score.find_one({"assessment_id":assessment_id , "email":email })
    return serialize_mongo(data)
# --- Candidate Portal Support Endpoints ---

@app.post("/candidate/login")
async def candidate_login(request: Request):
    body = await request.json()
    email = body.get("email")
    assessment_id = body.get("assessment_id")
    
    if not email or not assessment_id:
        raise HTTPException(status_code=400, detail="Email and Assessment ID are required")
    
    # Verify candidate enrollment
    record = Enrollment_DB.find_one({
        "assessment_id": assessment_id,
        "candidates.email": email
    })
    
    if not record:
        raise HTTPException(status_code=401, detail="Invalid email or assessment ID")
    
    # Check if assessment is terminated
    assessment_meta = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    if assessment_meta and assessment_meta.get("status") == "terminated":
        raise HTTPException(status_code=403, detail="This assessment has been terminated.")
    
    candidate = next((c for c in record.get("candidates", []) if c.get("email") == email), None)
    if not candidate:
        raise HTTPException(status_code=401, detail="Candidate not found")
    
    # Get assigned proctor info
    proctor_email = assessment_meta.get("proctor_email") if assessment_meta else None
    
    candidate_data = {
        "user_name": candidate.get("name"),
        "roll_number": candidate.get("reg_no"),  
        "candidate_id": candidate.get("candidate_id"),
        "college": candidate.get("college"),
        "department": candidate.get("Department") or candidate.get("department"),
        "email": email,
        "assessment_id": assessment_id,
        "proctor_email": proctor_email,
        "status": "success"
    }
    
    # Update status to Joined
    Enrollment_DB.update_one(
        {"assessment_id": assessment_id, "candidates.email": email},
        {"": {"candidates.$.status": "Joined"}}
    )
    
    return serialize_mongo(candidate_data)
