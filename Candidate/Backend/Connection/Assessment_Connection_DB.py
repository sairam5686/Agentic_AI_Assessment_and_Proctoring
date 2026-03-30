from pymongo import MongoClient

MONGO_URI = "mongodb+srv://vimalrajproff_db_user:AAAPS@aaaps.q8uuhtj.mongodb.net/?appName=AAAPS"  

try:
    client = MongoClient(MONGO_URI)
    
    # Assessment Content DataBase
    Database = client["AssessmentDB"]



    # Assessment Collections
    MCQ_DB = Database["MCQ_DB"]
    Coding_Questions_DB = Database["Coding_Questions_DB"]      
    Coding_TestCases_DB = Database["Coding_TestCases_DB"]   
    Admin_Assessments_DB = Database["Admin_Assessments_DB"] 
    Enrollment_DB = Database["Enrollment_DB"]
    SQL_Questions_DB = Database["SQL_Questions_DB"]
    SQL_TestCases_DB = Database["SQL_TestCases_DB"]
    Pipe_Puzzle_Sessions_DB = Database["Pipe_Puzzle_Sessions_DB"]
    Gaming_DB = Database["Gaming_DB"]


    # Candidate DataBase 
    CandidateData_DB = client["CandidateDB"]


    # Candidate Collections
    Candidate_Data_DB = CandidateData_DB["CandidateData"]
    Pipe_Puzzle_Results_DB = CandidateData_DB["Pipe_Puzzle_Results"]
    Coding_Results = CandidateData_DB["Coding_Results"]
    SQL_Results = CandidateData_DB["SQL_Results"]
    MCQ_Results = CandidateData_DB["MCQ_Results"]
    
    # Note: Pipe_Puzzle_Results_DB has been moved to Candidate_Connection_DB
    
    print("\n*** Successfully Connected to AssessmentDB! ***\n")

except Exception as e:
    print("Couldn't Connect to DB:", e)
    MCQ_DB = None
    Admin_Assessments_DB = None 
    Enrollment_DB = None
    Coding_Questions_DB = None       
    Coding_TestCases_DB = None
    SQL_Questions_DB = None
    SQL_TestCases_DB = None
    Pipe_Puzzle_Sessions_DB = None
    Gaming_DB = None
    Candidate_Data_DB = None
    Pipe_Puzzle_Results_DB = None
    Coding_Results = None
    SQL_Results = None
