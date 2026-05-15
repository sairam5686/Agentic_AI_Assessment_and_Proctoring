import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_LAPTOP_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_LAPTOP_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_LAPTOP_API_SECRET")
)