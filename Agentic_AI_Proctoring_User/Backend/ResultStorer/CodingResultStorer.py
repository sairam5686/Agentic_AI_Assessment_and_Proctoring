from fastapi import HTTPException
from Backend.Connection.Assessment_Connection_DB import Coding_Results, Coding_TestCases_DB
from Backend.ResultStorer.ResultModelSchema import CodingSaveResultsRequest
from datetime import datetime, timezone

async def Coding_store(req : CodingSaveResultsRequest):
    print(f"DEBUG: Received Coding results for {req.email}, assessment {req.assessment_id}")
    try:
        final_results = []
        overall_total_user_marks = 0.0
        
        for r in req.results:
            tc_record = Coding_TestCases_DB.find_one({
                "assessment_id": req.assessment_id, 
                "question_id": r.question_id
            })
            db_testcases = tc_record.get("testcases", []) if tc_record else []
            
            user_tc_map = {tc.test_case_order: tc for tc in r.test_cases}
            
            merged_test_cases = []
            passed_count = 0
            question_user_marks = 0.0
            question_total_marks = 0.0
            
            for idx, db_tc in enumerate(db_testcases):
                order = idx + 1
                user_tc = user_tc_map.get(order)
                
                your_output = (user_tc.test_case_output_value or "").strip() if user_tc else ""
                expected = (db_tc.get("expected_output") or "").strip()
                
                is_passed = False
                if your_output and your_output == expected:
                    is_passed = True
                    passed_count += 1
                    question_user_marks += db_tc.get("marks", 0)
                
                question_total_marks += db_tc.get("marks", 0)
                
                merged_test_cases.append({
                    "test_case_order": order,
                    "test_case_output_value": your_output,
                    "test_case_marks": db_tc.get("marks", 0)
                })
            
            # Status: Passed if 3 or more pass or ALL pass
            status = "Failed"
            if len(db_testcases) > 0:
                if passed_count == len(db_testcases) or passed_count >= 3:
                    status = "Passed"
            elif r.status == "Error": # Maintain error status if no test cases found but frontend reported error
                status = "Error"

            final_results.append({
                "question_id": r.question_id,
                "question_text": r.question_text,
                "code": r.code,
                "language": r.language,
                "test_cases": merged_test_cases,
                "total_testcases": len(db_testcases),
                "total_marks": question_total_marks,
                "status": status,
                "passed_testcases": passed_count,
                "user_marks": question_user_marks
            })
            overall_total_user_marks += question_user_marks

        Coding_Results.insert_one({
            "email": req.email,
            "user_name": req.user_name,
            "assessment_id": req.assessment_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "results": final_results,
            "total_marks": overall_total_user_marks
        })
        print(f"DEBUG: Successfully saved Coding results for {req.email}")
    except Exception as e:
        print(f"DEBUG: Error saving Coding results: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "Coding results saved successfully"}
