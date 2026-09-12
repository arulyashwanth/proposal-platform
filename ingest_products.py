import os
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document

from database import SessionLocal
import models

def ingest_db_products():
    load_dotenv()
    
    # Ensure keys exist
    if not os.getenv("OPENAI_API_KEY") or not os.getenv("PINECONE_API_KEY"):
        print("Error: Please set OPENAI_API_KEY and PINECONE_API_KEY in your .env file")
        return

    print("Connecting to Pinecone...")
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index_name = "products"
    
    print("Initializing OpenAI Embeddings (1536 dimensions)...")
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small", 
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    print("Fetching products from Supabase database...")
    db = SessionLocal()
    try:
        products = db.query(models.Product).all()
        
        documents = []
        for p in products:
            # Create a rich text description for the semantic search
            supplier_name = p.supplier.name if p.supplier else "Unknown Supplier"
            text = f"{p.name}. Category: {p.category}. SKU: {p.sku}. Supplied by {supplier_name}."
            
            metadata = {
                "product_id": p.id,
                "sku": p.sku, 
                "category": p.category, 
                "name": p.name,
                "base_price": float(p.base_price) if p.base_price else 0.0,
                "supplier_id": p.supplier_id
            }
            
            doc = Document(
                page_content=text,
                metadata=metadata
            )
            documents.append(doc)
            
        print(f"Ingesting {len(documents)} products into Pinecone (namespace: 'products')...")
        
        if len(documents) > 0:
            # Upsert to Pinecone
            PineconeVectorStore.from_documents(
                documents,
                embeddings,
                index_name=index_name,
                namespace="products"
            )
            print("Ingestion complete! Your database products are now searchable via Vector DB.")
        else:
            print("No products found in the database to ingest.")
            
    finally:
        db.close()

if __name__ == "__main__":
    ingest_db_products()
