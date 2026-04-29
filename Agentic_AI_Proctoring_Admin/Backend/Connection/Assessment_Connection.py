import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb+srv://vimalrajproff_db_user:AAAPS@aaaps.q8uuhtj.mongodb.net/?appName=AAAPS")  

try:
    client = MongoClient(MONGO_URI)
    Database = client["AssessmentDB"]
    Candidate_DB = client["CandidateDB"]




    # For detailed Candidate Informations
    MCQ_Results_DB = Candidate_DB["MCQ_Results"]
    Coding_results_DB = Candidate_DB["Coding_Results"]
    SQL_Results_DB = Candidate_DB["SQL_Results"]
    Piped_Puzzle_DB  = Candidate_DB["Pipe_Puzzle_Results"]


    # Fro Admin Assessments DB
    MCQ_DB = Database["MCQ_DB"]
    Coding_Questions_DB = Database["Coding_Questions_DB"]      
    Coding_TestCases_DB = Database["Coding_TestCases_DB"]   
    Admin_Assessments_DB = Database["Admin_Assessments_DB"] 
    Enrollment_DB = Database["Enrollment_DB"]
    SQL_Questions_DB = Database["SQL_Questions_DB"]
    SQL_TestCases_DB = Database["SQL_TestCases_DB"]
    Gaming_DB = Database["Gaming_DB"]
    Game_Sessions_DB = Database["Game_Sessions_DB"]
    Results_DB = Database["Results_DB"]
    Invigilator_DB = Database["Invigilator_DB"]
    print("\n*** Successfully Connected To MongoDB! ***\n")
except Exception as e:
    print("Couldn't Connect to MongoDB:", e)
    MCQ_DB = None
    Admin_Assessments_DB = None 
    Enrollment_DB = None
    Coding_Questions_DB = None       
    Coding_TestCases_DB = None
    SQL_Questions_DB = None
    SQL_TestCases_DB = None