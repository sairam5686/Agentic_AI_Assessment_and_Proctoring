import pandas as pd
from fastapi import UploadFile
from collections import defaultdict
from datetime import datetime
from Backend.Connection.Assessment_Connection import MCQ_DB


async def mcq_parser(file: UploadFile, assessment_id: str , Test_Title: str, MCQ_duration: str):
    # Read Excel
    df = pd.read_excel(file.file)
    df.columns = df.columns.str.strip()

    sections_map = defaultdict(list)

    for _, row in df.iterrows():
        section_name = row["Section Name"]

        question = {
            "question_id": int(row["Question id"]),
            "question_text": row["Questions"],
            "options": {
                "A": row["Option A"],
                "B": row["Option B"],
                "C": row["Option C"],
                "D": row["Option D"]
            },
            "correct_answer": row["Correct Answer"],
            "marks": 1,
            "type": "MCQ"
        }

        sections_map[section_name].append(question)

    # Build sections
    sections = []
    for idx, (section_name, questions) in enumerate(sections_map.items(), start=1):
        sections.append({
            "section_id": idx,
            "section_name": section_name,
            "questions": questions
        })

    # Final MongoDB document
    mcq_document = {
        "assessment_id": assessment_id,
        "test_title": Test_Title,
        "mcq_duration": MCQ_duration,
        "sections": sections,
        "total_questions": sum(len(s["questions"]) for s in sections),
        "created_at": datetime.utcnow()
    }

    # Insert into MongoDB
    MCQ_DB.insert_one(mcq_document)
    mcq_document.pop("_id", None)
    return mcq_document