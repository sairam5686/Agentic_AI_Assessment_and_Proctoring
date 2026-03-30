import pandas as pd
from fastapi import UploadFile
from datetime import datetime
from Backend.Connection.Assessment_Connection import Enrollment_DB

async def enrollment_parser(file: UploadFile, assessment_id: str):
    # Read Excel
    df = pd.read_excel(file.file)
    df.columns = df.columns.str.strip()

    candidates = []

    for _, row in df.iterrows():
        candidate = {
            "candidate_id": str(row["Candidate ID"]),
            "reg_no": str(row["Registration Number"]),
            "name": row["Name"],
            "email": row["Email"],
            "college": row["College Name"],
            "department": str(row["Department"]) if "Department" in row else "N/A",
            "valid_from": str(row["Valid_From"]),
            "valid_to": str(row["Valid_To"]),
            "start_date": None,
            "end_date": None,
            "is_started": False,
            "status": "not_started"
        }
        candidates.append(candidate)

    # Fetch test title for the record
    from Backend.Connection.Assessment_Connection import Admin_Assessments_DB
    test_info = Admin_Assessments_DB.find_one({"test_id": assessment_id})
    test_title = test_info["test_title"] if test_info else "New Assessment"

    # Final document structure
    enrollment_document = {
        "assessment_id": assessment_id,
        "test_title": test_title,
        "candidates": candidates,
        "total_enrolled": len(candidates),
        "status": "pending", # Overall enrollment status
        "created_at": datetime.now()
    }

    # Insert or Update in MongoDB (using upsert to avoid duplicates for same assessment)
    Enrollment_DB.update_one(
        {"assessment_id": assessment_id},
        {"$set": enrollment_document},
        upsert=True
    )

    return enrollment_document
