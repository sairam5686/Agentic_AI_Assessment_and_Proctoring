import requests as http_requests                      
from fastapi import HTTPException
import httpx
import json    
from Backend.Connection.Assessment_Connection_DB import SQL_TestCases_DB


async def SQL_Runner(assessment_id: str, question_id: str, code: str):
    record = SQL_TestCases_DB.find_one(
        {"assessment_id": assessment_id, "question_id": question_id}
    )

    if not record:
        raise HTTPException(status_code=404, detail="Testcases not found")

    testcases = record.get("testcases", [])
    results = []

    for tc in testcases:
        test_case_id = tc.get("test_case_id")
        setup_sql = tc.get("setup_sql", "")
        expected_output = tc.get("expected_output", [])
        marks = tc.get("marks", 0)

        python_script = f"""
import sqlite3
import json

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

setup_sql = {repr(setup_sql)}
for statement in setup_sql.strip().split(";"):
    stmt = statement.strip()
    if stmt:
        cursor.execute(stmt)
conn.commit()

user_sql = {repr(code)}
try:
    cursor.execute(user_sql.strip())
    rows = cursor.fetchall()
    print(json.dumps({{"success": True, "rows": [list(r) for r in rows]}}))
except Exception as e:
    print(json.dumps({{"success": False, "error": str(e)}}))

conn.close()
"""

        #  OneCompiler API call DO not touch (Works on Hope)
        try:
            response = http_requests.post(
                "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
                json={
                    "language": "python",
                    "stdin": "",
                    "files": [
                        {
                            "name": "index.py",
                            "content": python_script
                        }
                    ]
                },
                headers={
                    "x-rapidapi-key": "c8538c4e42msh279dbf283fba515p1a7fbcjsn492e030be219",
                    "x-rapidapi-host": "onecompiler-apis.p.rapidapi.com",
                    "Content-Type": "application/json"
                },
                timeout=15
            )
        except Exception as e:
            results.append({
                "test_case_id": test_case_id,
                "status": "error",
                "error": f"Execution API request failed: {str(e)}",
                "expected_output": expected_output,
                "your_output": None,
                "marks_awarded": 0,
                "total_marks": marks
            })
            continue

        # Parse JSON response
        try:
            api_response = response.json()
        except Exception as e:
            results.append({
                "test_case_id": test_case_id,
                "status": "error",
                "error": f"Failed to parse API response: {str(e)}",
                "expected_output": expected_output,
                "your_output": None,
                "marks_awarded": 0,
                "total_marks": marks
            })
            continue

        # Guard against None response
        if not api_response:
            results.append({
                "test_case_id": test_case_id,
                "status": "error",
                "error": "Empty response from execution API",
                "expected_output": expected_output,
                "your_output": None,
                "marks_awarded": 0,
                "total_marks": marks
            })
            continue

        # Safely extract stdout and stderr (handles null values from API)
        stdout = (api_response.get("stdout") or "").strip()
        stderr = (api_response.get("stderr") or "").strip()

        if not stdout:
            results.append({
                "test_case_id": test_case_id,
                "status": "error",
                "error": stderr or "No output received",
                "expected_output": expected_output,
                "your_output": None,
                "marks_awarded": 0,
                "total_marks": marks
            })
            continue

        # Parse the JSON printed by the script
        try:
            parsed = json.loads(stdout)
        except json.JSONDecodeError:
            results.append({
                "test_case_id": test_case_id,
                "status": "error",
                "error": f"Could not parse output: {stdout}",
                "expected_output": expected_output,
                "your_output": None,
                "marks_awarded": 0,
                "total_marks": marks
            })
            continue

        if not parsed.get("success"):
            results.append({
                "test_case_id": test_case_id,
                "status": "error",
                "error": parsed.get("error", "Unknown SQL error"),
                "expected_output": expected_output,
                "your_output": None,
                "marks_awarded": 0,
                "total_marks": marks
            })
            continue

        actual_output = parsed.get("rows", [])
        passed = actual_output == expected_output

        results.append({
            "test_case_id": test_case_id,
            "status": "passed" if passed else "failed",
            "expected_output": expected_output,
            "your_output": actual_output,
            "marks_awarded": marks if passed else 0,
            "total_marks": marks
        })

    total_marks_awarded = sum(r.get("marks_awarded", 0) for r in results)
    total_marks = sum(r.get("total_marks", 0) for r in results)
    all_passed = all(r["status"] == "passed" for r in results)

    return {
        "assessment_id": assessment_id,
        "question_id": question_id,
        "overall_status": "passed" if all_passed else "failed",
        "total_marks_awarded": total_marks_awarded,
        "total_marks": total_marks,
        "testcase_results": results
    }

