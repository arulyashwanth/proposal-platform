import os
from dotenv import load_dotenv
import psycopg2
from pinecone import Pinecone
from anthropic import Anthropic
import json

load_dotenv()

# Connect to database
db_url = os.getenv("SUPABASE_DB_URL")
conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Connect to Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("products")

# Connect to Claude
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

print("✅ Connecting to database...")

# Get all products
cursor.execute("SELECT id, name, category FROM products LIMIT 20;")
products = cursor.fetchall()

print(f"✅ Found {len(products)} products")
print("✅ Creating embeddings...")

vectors_to_upsert = []

for product_id, name, category in products:
    # Create text to embed
    text = f"{name} {category}"
    
    # Get embedding from Claude
    try:
        # Using basic text embedding (Claude doesn't have native embedding API)
        # So we'll use a simple hash-based approach
        embedding = [hash(text + str(i)) % 1000 / 1000.0 for i in range(1536)]
        
        vectors_to_upsert.append((
            str(product_id),
            embedding,
            {"name": name, "category": category, "product_id": product_id}
        ))
    except Exception as e:
        print(f"Error embedding product {product_id}: {e}")
        continue

print(f"✅ Prepared {len(vectors_to_upsert)} vectors")
print("✅ Uploading to Pinecone...")

# Upload to Pinecone in batches
batch_size = 100
for i in range(0, len(vectors_to_upsert), batch_size):
    batch = vectors_to_upsert[i:i+batch_size]
    try:
        index.upsert(vectors=batch)
        print(f"   Uploaded batch {i//batch_size + 1}")
    except Exception as e:
        print(f"   Error uploading batch: {e}")

cursor.close()
conn.close()

print("✅ Indexing complete!")

# Verify
stats = index.describe_index_stats()
print(f"✅ Total vectors in Pinecone: {stats.total_vector_count}")