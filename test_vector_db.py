from pinecone import Pinecone
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Get index
index = pc.Index("products")

# Check if index exists and has data
try:
    stats = index.describe_index_stats()
    print(f"Vector DB Status: {stats}")
    print(f"Total vectors: {stats.total_vector_count}")
except Exception as e:
    print(f"Error: {e}")