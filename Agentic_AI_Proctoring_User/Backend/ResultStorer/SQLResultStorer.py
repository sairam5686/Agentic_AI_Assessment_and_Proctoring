from datetime import datetime

from fastapi import HTTPException
from Backend.Connection.Assessment_Connection_DB import SQL_Results, SQL_TestCases_DB
from Backend.ResultStorer.ResultModelSchema import SQLSaveResultsRequest


async def  SQL_Storer(req: SQLSaveResultsRequest):
    print(f"DEBUG: Received SQL results for {req.email}, assessment {req.assessment_id}")
    try:
        final_results = []
        overall_total_user_marks = 0.0
        
        for r in req.results:
            tc_record = SQL_TestCases_DB.find_one({
                "assessment_id": req.assessment_id, 
                "question_id": r.question_id
            })
            db_testcases = tc_record.get("testcases", []) if tc_record else []
            
            user_tc_map = {str(tc.test_case_id): tc for tc in r.test_cases}
            
            merged_test_cases = []
            passed_count = 0
            question_user_marks = 0.0
            question_total_marks = 0.0
            
            for db_tc in db_testcases:
                tc_id = str(db_tc.get("test_case_id"))
                user_tc = user_tc_map.get(tc_id)
                
                your_output = user_tc.test_case_output_value if user_tc else None
                expected = db_tc.get("expected_output", [])
                
                # In SQL, output is usually a list of lists or similar
                is_passed = (your_output == expected) if your_output is not None else False
                if is_passed:
                    passed_count += 1
                    question_user_marks += db_tc.get("marks", 0)
                
                question_total_marks += db_tc.get("marks", 0)
                
                merged_test_cases.append({
                    "test_case_id": tc_id,
                    "test_case_output_value": your_output,
                    "marks": db_tc.get("marks", 0)
                })
            
            status = "Failed"
            if len(db_testcases) > 0:
                if passed_count == len(db_testcases) or passed_count >= 3:
                    status = "Passed"
            elif r.status == "Error":
                status = "Error"

            final_results.append({
                "question_id": r.question_id,
                "question_text": r.question_text,
                "query": r.query,
                "test_cases": merged_test_cases,
                "total_testcases": len(db_testcases),
                "total_marks": question_total_marks,
                "status": status,
                "passed_testcases": passed_count,
                "user_marks": question_user_marks
            })
            overall_total_user_marks += question_user_marks

        SQL_Results.insert_one({
            "email": req.email,
            "user_name": req.user_name,
            "assessment_id": req.assessment_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "results": final_results,
            "total_marks": overall_total_user_marks
        })
        print(f"DEBUG: Successfully saved SQL results for {req.email}")
    except Exception as e:
        print(f"DEBUG: Error saving SQL results: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "SQL results saved successfully"}

