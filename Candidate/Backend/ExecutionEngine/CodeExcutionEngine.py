import asyncio
from fastapi import HTTPException
import httpx
from Backend.Connection.Assessment_Connection_DB import Coding_TestCases_DB


async def Code_Runner(assessment_id , question_id, code, language):
    record = Coding_TestCases_DB.find_one(
        {"assessment_id": assessment_id, "question_id": question_id}
    )

    if not record:
        raise HTTPException(status_code=404, detail="Testcases not found")

    all_testcases = record.get("testcases", [])

    LANGUAGE_MAP = {
        "Python": ("python", "solution.py"),
        "Java": ("java", "Main.java"),
        "C++": ("cpp", "solution.cpp"),
        "JavaScript": ("nodejs", "solution.js"),
    }

    compiler_lang, filename = LANGUAGE_MAP.get(language, ("python", "solution.py"))

    async def run_single(tc: dict, client: httpx.AsyncClient) -> dict:
        payload = {
            "language": compiler_lang,
            "files": [
                {
                    "name": filename,
                    "content": code
                }
            ],
            "stdin": tc["input"].replace("\\n", "\n"),
        }

        try:
            resp = await client.post(
                "https://onecompiler-apis.p.rapidapi.com/api/v1/run",
                json=payload,
                headers={ 
                    "x-rapidapi-key": "c8538c4e42msh279dbf283fba515p1a7fbcjsn492e030be219",
	"x-rapidapi-host": "onecompiler-apis.p.rapidapi.com",
                    "Content-Type": "application/json"},
            )

            result = resp.json()

            actual_output = (result.get("stdout") or "").strip()
            stderr = (result.get("stderr") or "").strip()
            status = result.get("status", "")

        except Exception as e:
            actual_output = ""
            stderr = str(e)
            status = "error"

        expected = tc["expected_output"].strip()
        passed = (actual_output == expected) and status != "error"

        return {
            "title": tc["title"],
            "input": tc["input"],
            "expected_output": expected,
            "your_output": actual_output if status != "error" else stderr,
            "passed": passed,
            "is_hidden": tc["is_hidden"],
            "marks": tc["marks"],
        }

    async with httpx.AsyncClient(timeout=20) as client:
        tasks = [run_single(tc, client) for tc in all_testcases]
        results = await asyncio.gather(*tasks)

    visible_results = [
        {k: v for k, v in r.items() if k != "is_hidden"}
        for r in results if not r["is_hidden"]
    ]

    hidden_summary = {
        "total": sum(1 for r in results if r["is_hidden"]),
        "passed": sum(1 for r in results if r["is_hidden"] and r["passed"]),
    }

    return {
        "visible_testcases": visible_results,
        "hidden_summary": hidden_summary,
        "all_testcase_results": results, # Added for detailed storage
        "total_marks_earned": sum(r["marks"] for r in results if r["passed"]),
        "total_marks": sum(tc["marks"] for tc in all_testcases),
    }
