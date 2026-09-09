import yaml
import os
from pinecone import Pinecone, ServerlessSpec

def load_config():
    with open("config.yml", "r") as f:
        return yaml.safe_load(f)

def setup_vector_db():
    config = load_config()["VECTOR_DB"]
    api_key = os.environ.get("PINECONE_API_KEY", "your_pinecone_api_key")
    
    print("Initializing Pinecone client...")
    pc = Pinecone(api_key=api_key)
    
    index_name = config["index_name"]
    dimension = config["dimension"]
    metric = config["similarity_metric"]
    
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"Creating Pinecone index '{index_name}' with dimension {dimension}...")
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric=metric,
            spec=ServerlessSpec(
                cloud='aws',
                region='us-east-1'
            )
        )
        print("Index created successfully.")
    else:
        print(f"Index '{index_name}' already exists.")
        
    # Note on namespaces: In Pinecone, namespaces are created automatically when
    # you upsert vectors specifying a namespace. The required namespaces from config are:
    namespaces = config["namespaces"]
    print(f"\nThe following namespaces will be utilized upon data ingestion:")
    for ns in namespaces:
        print(f"- {ns}")

if __name__ == "__main__":
    setup_vector_db()
