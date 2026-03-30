import pandas as pd
from fastapi import UploadFile
from collections import defaultdict
from datetime import datetime

from Backend.Connection.Assessment_Connection import (
    Coding_Questions_DB,
    Coding_TestCases_DB,
)





async def coding_parser(
    file: UploadFile,
    assessment_id: str,
    Test_Title: str,
    Coding_duration: str,
):


    xls = pd.ExcelFile(file.file)

    if "Question_Description" not in xls.sheet_names:
        raise ValueError("Missing sheet: Question_Description")

    if "Test_Cases" not in xls.sheet_names:
        raise ValueError("Missing sheet: Test_Cases")

    q_df = pd.read_excel(xls, "Question_Description")
    tc_df = pd.read_excel(xls, "Test_Cases")

    q_df.columns = q_df.columns.str.strip()
    tc_df.columns = tc_df.columns.str.strip()


    tc_df.columns = [
        "question_id",
        "test_case_order",        # numeric: 1,2,3...
        "test_case_title",
        "test_case_description",
        "test_case_category",     # Default / Basic / Necessary
        "test_case_marks",
        "test_case_size",
        "test_case_input_value",
        "test_case_output_value",
    ]


    testcase_map = defaultdict(list)
    marks_map = defaultdict(float)

    for _, row in tc_df.iterrows():
        qid = str(row["question_id"]).strip()
        if not qid:
            continue

        category = str(row["test_case_category"]).strip().lower()
        marks = float(row["test_case_marks"])

        testcase_map[qid].append({
            "title": str(row["test_case_title"]),
            "description": str(row["test_case_description"]),
            "input": str(row["test_case_input_value"]),
            "expected_output": str(row["test_case_output_value"]),
            "type": str(row["test_case_category"]),
            "size": str(row["test_case_size"]),
            "marks": marks,
            # Default = visible, Basic/Necessary = hidden
            "is_hidden": category in ("basic", "necessary"),
        })

        marks_map[qid] += marks

    # ─────────────────────────────────────────────────────────
    # 4. Build Coding Questions
    # ─────────────────────────────────────────────────────────
    questions = []

    for _, row in q_df.iterrows():
        qid = str(row["question_id"]).strip()
        if not qid:
            continue

        languages = [
            lang.strip()
            for lang in str(row["languages (list)"]).split(",")
            if lang.strip()
        ]

        questions.append({
            "question_id": qid,
            "topic": row.get("topic", ""),
            "difficulty": row.get("difficulty_level", ""),
            "question_text": row.get("question_text", ""),
            "input_types": row.get("input_types", ""),
            "output_types": row.get("output_types", ""),
            "languages": languages,
            "marks": marks_map.get(qid, 0),
            "testcases": testcase_map.get(qid, []),
        })

    coding_document = {
        "assessment_id": assessment_id,
        "test_title": Test_Title,
        "coding_duration": Coding_duration,
        "total_questions": len(questions),
        "questions": questions,
        "created_at": datetime.utcnow(),
    }

 
    Coding_Questions_DB.insert_one(coding_document)
    coding_document.pop("_id", None)
    

    if Coding_TestCases_DB is not None:
        Coding_TestCases_DB.insert_many([
            {
                "assessment_id": assessment_id,
                "question_id": q["question_id"],
                "testcases": q["testcases"],
            }
            for q in questions
        ])

    return coding_document