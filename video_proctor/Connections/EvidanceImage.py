import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "dmpuhpff9"),
    api_key = os.getenv("CLOUDINARY_API_KEY", "476452371877234"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "GHwCx5mb-1oeYVAw2DldJRASOjc")
)