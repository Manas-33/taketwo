import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
STORAGE_BASE_URL = os.getenv("STORAGE_BASE_URL", "http://localhost:8000")
