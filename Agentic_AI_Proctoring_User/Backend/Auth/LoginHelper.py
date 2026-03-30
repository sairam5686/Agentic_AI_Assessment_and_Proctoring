from datetime import datetime
from fastapi import HTTPException
from Backend.Connection.Assessment_Connection_DB import Admin_Assessments_DB, Candidate_Data_DB, Enrollment_DB


async def LoginMaker(email: str, assessment_id: str):
    try:
        if not email or not assessment_id:
            raise HTTPException(status_code=400, detail="Email and Assessment ID are required")
        
        # Verify candidate enrollment for THIS specific assessment
        
        # Find the enrollment record for this assessment
        record = Enrollment_DB.find_one({
            "assessment_id": assessment_id,
            "candidates.email": email
        })
        
        if not record:
            raise HTTPException(status_code=401, detail="Invalid email or assessment ID")
        
        # NEW: Check if assessment is terminated
        assessment_meta = Admin_Assessments_DB.find_one({
            "$or": [
                {"test_id": assessment_id},
                {"assessment_id": assessment_id},
                {"id": assessment_id}
            ]
        })
        if assessment_meta and assessment_meta.get("status") == "terminated":
            raise HTTPException(status_code=403, detail="This assessment has been terminated by the admin.")
        
        # Extract the specific candidate's details from the list
        candidate = next((c for c in record.get("candidates", []) if c.get("email") == email), None)
        
        if not candidate:
            raise HTTPException(status_code=401, detail="Candidate not found in this assessment")
        
        # Return all necessary candidate details
        candidate_data = {
            "user_name": candidate.get("name"),
            "roll_number": candidate.get("reg_no"),  
            "candidate_id": candidate.get("candidate_id"),
            "college": candidate.get("college"),
            "department": candidate.get("Department") or candidate.get("department"),
            "email": email,
            "assessment_id": assessment_id,
            "status": "success"
        }

        # Store/Update in Candidate_Data_DB (CandidateDB Database)
        Candidate_Data_DB.update_one(
            {"email": email, "assessment_id": assessment_id},
            {
                "$set": {
                    "user_name": candidate.get("name"),
                    "password": assessment_id, 
                    "last_login": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "details": {
                        "roll_number": candidate.get("reg_no"),
                        "candidate_id": candidate.get("candidate_id"),
                        "college": candidate.get("college"),
                        "department": candidate.get("Department") or candidate.get("department")
                    }
                },
                "$unset": {
                    "name": "",
                    "pipe_puzzle_results": ""
                }
            },
            upsert=True
        )

        # Update status in Enrollment_DB (Main Database) for proctor to see
        Enrollment_DB.update_one(
            {"assessment_id": assessment_id, "candidates.email": email},
            {"$set": {"candidates.$.status": "Joined"}}
        )

        return candidate_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))