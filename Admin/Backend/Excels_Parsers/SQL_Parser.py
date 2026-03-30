import pandas as pd
from fastapi import UploadFile
from collections import defaultdict
from datetime import datetime
import ast

from Backend.Connection.Assessment_Connection import (
    SQL_Questions_DB,
    SQL_TestCases_DB,
)


async def sql_parser(
    file: UploadFile,
    assessment_id: str,
    Test_Title: str,
    SQL_duration: str,
):
    """
    Parses an SQL questions Excel file and stores questions + test cases in MongoDB.
    
    Excel format:
      Sheet 1 - 'Questions':       question_id, question_text, difficulty, marks, table_name, columns, sample_rows
      Sheet 2 - 'Test_Cases':      question_id, test_case_id, setup_sql, expected_output
    """

    xls = pd.ExcelFile(file.file)

    # ─────────────────────────────────────────────────────────
    # 1. Validate required sheets
    # ─────────────────────────────────────────────────────────
    if "Questions" not in xls.sheet_names:
        raise ValueError("Missing sheet: Questions")

    if "Test_Cases" not in xls.sheet_names:
        raise ValueError("Missing sheet: Test_Cases")

    q_df = pd.read_excel(xls, "Questions")
    tc_df = pd.read_excel(xls, "Test_Cases")

    q_df.columns = q_df.columns.str.strip()
    tc_df.columns = tc_df.columns.str.strip()

    # ─────────────────────────────────────────────────────────
    # 2. Build test case map grouped by question_id
    # ─────────────────────────────────────────────────────────
    testcase_map = defaultdict(list)
    marks_map = defaultdict(float)

    for _, row in tc_df.iterrows():
        qid = str(row["question_id"]).strip()
        if not qid:
            continue

        marks = float(row.get("marks", 0)) if pd.notna(row.get("marks")) else 0

        # Parse expected_output as a list (expected format: [["val1", "val2"], ...])
        try:
            raw_output = str(row["expected_output"]).strip() if pd.notna(row.get("expected_output")) else "[]"
            # Handle empty strings or plain "nan"
            if not raw_output or raw_output.lower() == "nan":
                expected_output = []
            else:
                expected_output = ast.literal_eval(raw_output)
        except (ValueError, SyntaxError):
            # Fallback to empty list if parsing fails
            expected_output = []

        testcase_map[qid].append({
            "test_case_id": int(row["test_case_id"]),
            "setup_sql": str(row["setup_sql"]),
            "expected_output": expected_output,
            "marks": marks,
        })

        marks_map[qid] += marks

    # ─────────────────────────────────────────────────────────
    # 3. Build SQL Questions list
    # ─────────────────────────────────────────────────────────
    questions = []

    for _, row in q_df.iterrows():
        qid = str(row["question_id"]).strip()
        if not qid:
            continue

        # Parse columns from comma-separated string
        columns = [
            col.strip()
            for col in str(row.get("columns", "")).split(",")
            if col.strip()
        ]

        # Parse sample_rows: pipe-separated rows, comma-separated values
        sample_rows = []
        raw_rows = str(row["sample_rows"]) if pd.notna(row.get("sample_rows")) else ""
        if raw_rows and raw_rows != "nan":
            for r in raw_rows.split("|"):
                r = r.strip()
                if r:
                    sample_rows.append([v.strip() for v in r.split(",")])

        questions.append({
            "question_id": qid,
            "question_text": str(row.get("question_text", "")),
            "difficulty": str(row.get("difficulty", "")),
            "marks": marks_map.get(qid, float(row.get("marks", 0))),
            "table_display": {
                "table_name": str(row.get("table_name", "")),
                "columns": columns,
                "sample_rows": sample_rows,
            },
            "testcases": testcase_map.get(qid, []),
        })

    # ─────────────────────────────────────────────────────────
    # 4. Insert into SQL_Questions_DB
    # ─────────────────────────────────────────────────────────
    sql_document = {
        "assessment_id": assessment_id,
        "test_title": Test_Title,
        "sql_duration": SQL_duration,
        "total_questions": len(questions),
        "questions": questions,
        "created_at": datetime.utcnow(),
    }

    SQL_Questions_DB.insert_one(sql_document)
    sql_document.pop("_id", None)

    # ─────────────────────────────────────────────────────────
    # 5. Insert into SQL_TestCases_DB (one doc per question)
    # ─────────────────────────────────────────────────────────
    if SQL_TestCases_DB is not None and len(questions) > 0:
        SQL_TestCases_DB.insert_many([
            {
                "assessment_id": assessment_id,
                "question_id": q["question_id"],
                "testcases": q["testcases"],
            }
            for q in questions
        ])

    return sql_document
