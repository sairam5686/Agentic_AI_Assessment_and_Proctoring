import pandas as pd
from fastapi import UploadFile
from collections import defaultdict
from datetime import datetime
from Backend.Connection.Assessment_Connection import FITB_DB


async def fitb_parser(file: UploadFile, assessment_id: str, Test_Title: str, FITB_duration: str):
    """
    Parses a FITB Excel file and stores the questions in MongoDB.

    Expected Excel columns:
        Question id   | Section Name | Question Text               | Answers              | Marks | Partial Marks | Difficulty
        1             | Section A    | The sky is #blank# in color | Blue|blue;Sky blue   | 2     | yes           | Easy

    Answers column format:
        - Separate multiple accepted answers for one blank using pipe: Blue|blue
        - Separate blanks using semicolon:  Blue|blue ; Sky blue
    """
    df = pd.read_excel(file.file)
    df.columns = df.columns.str.strip()

    sections_map = defaultdict(list)

    for _, row in df.iterrows():
        section_name = str(row["Section Name"]).strip()
        raw_answers  = str(row["Answers"]).strip()

        # Parse blanks: split by ';', each group has pipe-separated accepted answers
        blanks = []
        for blank_chunk in raw_answers.split(";"):
            accepted = [a.strip() for a in blank_chunk.split("|") if a.strip()]
            if accepted:
                blanks.append(accepted)

        # Count blanks in the question text
        question_text = str(row["Question Text"]).strip()
        blank_count   = question_text.count("#blank#")

        question = {
            "question_id":    int(row["Question id"]),
            "question_text":  question_text,        # contains #blank# tokens
            "blank_count":    blank_count,
            "blanks":         blanks,               # list[list[str]] — accepted answers per blank
            "marks":          int(row.get("Marks", 1)),
            "partial_marks":  str(row.get("Partial Marks", "yes")).strip().lower() == "yes",
            "difficulty":     str(row.get("Difficulty", "Medium")).strip(),
            "type":           "FITB"
        }

        sections_map[section_name].append(question)

    # Build sections list
    sections = []
    for idx, (section_name, questions) in enumerate(sections_map.items(), start=1):
        sections.append({
            "section_id":   idx,
            "section_name": section_name,
            "questions":    questions
        })

    document = {
        "assessment_id":    assessment_id,
        "test_title":       Test_Title,
        "fitb_duration":    FITB_duration,
        "sections":         sections,
        "total_questions":  sum(len(s["questions"]) for s in sections),
        "created_at":       datetime.utcnow()
    }

    FITB_DB.insert_one(document)
    document.pop("_id", None)
    return document
