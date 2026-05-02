from datetime import datetime
from fastapi import HTTPException
from Backend.Connection.Assessment_Connection_DB import Admin_Assessments_DB, Candidate_Data_DB, Enrollment_DB


async def LoginMaker(identifier: str = None, assessment_id: str = None):
    try:
        if not assessment_id:
            raise HTTPException(status_code=400, detail="Assessment ID is required")
        
        if not identifier:
            raise HTTPException(status_code=400, detail="Email address is required")
        
        # 1. Check if assessment is terminated
        assessment_meta = Admin_Assessments_DB.find_one({
            "$or": [
                {"test_id": assessment_id},
                {"assessment_id": assessment_id},
                {"id": assessment_id}
            ]
        })
        if not assessment_meta:
            raise HTTPException(status_code=404, detail="Assessment not found")
            
        if assessment_meta.get("status") == "terminated":
            raise HTTPException(status_code=403, detail="This assessment has been terminated by the admin.")
        
        # 2. Verify candidate enrollment by EMAIL only
        query = {
            "assessment_id": assessment_id,
            "candidates.email": identifier
        }

        # Find the enrollment record
        record = Enrollment_DB.find_one(query)
        
        if not record:
            raise HTTPException(status_code=401, detail="Invalid Email Address or Assessment ID")
        
        # 3. Extract the specific candidate's details
        candidate = next((c for c in record.get("candidates", []) if c.get("email") == identifier), None)
        
        if not candidate:
            raise HTTPException(status_code=401, detail="Candidate not found in this assessment")
        
        is_university = "university" in str(assessment_meta.get("category", "")).lower()
        
        # Return all necessary candidate details
        candidate_data = {
            "user_name": candidate.get("name"),
            "roll_number": candidate.get("reg_no"),  
            "candidate_id": candidate.get("candidate_id"),
            "college": candidate.get("college"),
            "department": candidate.get("Department") or candidate.get("department"),
            "email": identifier,
            "assessment_id": assessment_id,
            "status": "success",
            "login_mode": "University" if is_university else "Hiring"
        }

        # Store/Update in Candidate_Data_DB
        Candidate_Data_DB.update_one(
            {"email": identifier, "assessment_id": assessment_id},
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
                }
            },
            upsert=True
        )

        # Update status in Enrollment_DB
        Enrollment_DB.update_one(
            {"assessment_id": assessment_id, "candidates.email": identifier},
            {"$set": {"candidates.$.status": "Joined"}}
        )

        return candidate_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in LoginMaker: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))