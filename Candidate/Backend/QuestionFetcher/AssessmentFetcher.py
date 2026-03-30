from fastapi import HTTPException
from Backend.Connection.Assessment_Connection_DB import MCQ_DB, Admin_Assessments_DB, Coding_Questions_DB, Coding_TestCases_DB, Gaming_DB, SQL_Questions_DB, SQL_TestCases_DB


async def getQuestion(assessment_id: str):
    print(f"DEBUG: Fetching questions for assessment_id: {assessment_id}")
    try:
        # Fetch assessment metadata
        assessment_info = Admin_Assessments_DB.find_one(
            {
                "$or": [
                    {"test_id": assessment_id},
                    {"assessment_id": assessment_id},
                    {"id": assessment_id}
                ]
            },
            {"_id": 0}
        )
        
        # NEW: Block access if terminated
        if assessment_info and assessment_info.get("status") == "terminated":
            raise HTTPException(status_code=403, detail="This assessment has been terminated.")

        MCQ_Questions = list(MCQ_DB.find({"assessment_id": assessment_id}, {"_id": 0}))
        
        Coding_Questions = list(Coding_Questions_DB.find({"assessment_id": assessment_id}, {"_id": 0}))
        for q in Coding_Questions:
            qid = q.get("question_id")
            if qid:
                tc_record = Coding_TestCases_DB.find_one({"assessment_id": assessment_id, "question_id": qid})
                q["test_case_count"] = len(tc_record.get("testcases", [])) if tc_record else 0
            else:
                q["test_case_count"] = 0

        SQL_Questions = list(SQL_Questions_DB.find({"assessment_id": assessment_id}, {"_id": 0}))
        for q in SQL_Questions:
            qid = q.get("question_id")
            if qid:
                tc_record = SQL_TestCases_DB.find_one({"assessment_id": assessment_id, "question_id": qid})
                q["test_case_count"] = len(tc_record.get("testcases", [])) if tc_record else 0
            else:
                q["test_case_count"] = 0
        
        Gaming_Config = Gaming_DB.find_one({"assessment_id": assessment_id}, {"_id": 0})
        
        print(f"DEBUG: Found {len(MCQ_Questions)} MCQs, {len(Coding_Questions)} Coding, {len(SQL_Questions)} SQL")

        return {
            "Assessment_Info": assessment_info,
            "MCQ_Questions": MCQ_Questions,
            "Coding_Questions": Coding_Questions,
            "SQL_Questions": SQL_Questions,
            "Gaming_Config": Gaming_Config
        }
    except Exception as e:
        print(f"ERROR in get_assessment_questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

