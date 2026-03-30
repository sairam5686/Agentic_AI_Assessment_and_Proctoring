from pydantic import BaseModel, Field
from typing import  Any


class CodingTestCaseResult(BaseModel):
    test_case_order: int
    test_case_output_value: str
    test_case_marks: float

class CodingResultEntry(BaseModel):
    question_id: str | int
    question_text: str | None = None
    code: str
    language: str
    test_cases: list[CodingTestCaseResult]
    total_testcases: int
    total_marks: float
    status: str
    passed_testcases: int
    user_marks: float

class CodingSaveResultsRequest(BaseModel):
    email: str | None = None
    user_name: str | None = None
    assessment_id: str | None = None
    results: list[CodingResultEntry]
    total_marks: float

class SQLTestCaseResult(BaseModel):
    test_case_id: int | str
    test_case_output_value: Any
    marks: float

class SQLResultEntry(BaseModel):
    question_id: str | int
    question_text: str | None = None
    query: str
    test_cases: list[SQLTestCaseResult]
    total_testcases: int
    total_marks: float
    status: str
    passed_testcases: int
    user_marks: float

class SQLSaveResultsRequest(BaseModel):
    email: str | None = None
    user_name: str | None = None
    assessment_id: str | None = None
    results: list[SQLResultEntry]
    total_marks: float

class MCQResultEntry(BaseModel):
    question_id: str | int
    Correct_answer: str
    user_answer: str
    Mark: float

class MCQSaveResultsRequest(BaseModel):
    assessment_id: str
    user_name: str
    email: str
    MCQ_Result: list[MCQResultEntry]
    user_total_marks: float
    total_marks: float

