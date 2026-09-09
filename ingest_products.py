import os
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document

def ingest_mock_products():
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
    
    # Sample Mock Products with descriptive text for semantic search
    sample_data = [
        {
            "id": "prod_1", 
            "text": "Premium Commercial Main Entry Door Hardware Set. Includes heavy-duty closer, mortise lock, and ball-bearing hinges. Fire-rated up to 3 hours.", 
            "metadata": {"sku": "HS-A-001", "category": "Hardware Set", "type": "Commercial", "supplier_id": 1}
        },
        {
            "id": "prod_2", 
            "text": "Standard Residential Interior Door Handle. Lever style, satin nickel finish. Privacy function suitable for bedrooms and bathrooms.", 
            "metadata": {"sku": "RES-002", "category": "Knobs/Levers", "type": "Residential", "supplier_id": 1}
        },
        {
            "id": "prod_3", 
            "text": "Heavy Duty Floor Spring Closer for Glass Doors. Adjustable closing speed, hold-open function at 90 degrees.", 
            "metadata": {"sku": "COM-003", "category": "Closers", "type": "Commercial", "supplier_id": 2}
        }
    ]
    
    documents = []
    for item in sample_data:
        doc = Document(
            page_content=item["text"],
            metadata=item["metadata"]
        )
        documents.append(doc)
        
    print(f"Ingesting {len(documents)} products into Pinecone (namespace: 'products')...")
    
    # Upsert to Pinecone
    PineconeVectorStore.from_documents(
        documents,
        embeddings,
        index_name=index_name,
        namespace="products"
    )
    
    print("Ingestion complete! Your products are now searchable via Vector DB.")

if __name__ == "__main__":
    ingest_mock_products()
