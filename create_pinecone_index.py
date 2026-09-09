from pinecone import Pinecone
import os
from dotenv import load_dotenv
import time

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Create index
try:
    pc.create_index(
        name="products",
        dimension=1536,
        metric="cosine",
        spec={
            "serverless": {
                "cloud": "aws",
                "region": "us-east-1"
            }
        }
    )
    print("✅ Creating index 'products'...")
    time.sleep(30)  # Wait for creation
    print("✅ Index 'products' created successfully")
except Exception as e:
    if "already exists" in str(e):
        print("✅ Index 'products' already exists")
    else:
        print(f"❌ Error: {e}")

# Verify index exists
try:
    index = pc.Index("products")
    stats = index.describe_index_stats()
    print(f"✅ Index stats: {stats}")
except Exception as e:
    print(f"❌ Failed to access index: {e}")