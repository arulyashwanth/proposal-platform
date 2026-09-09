import psycopg2
import os
from dotenv import load_dotenv

def setup_database():
    load_dotenv()
    
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url or "your_project_ref" in db_url:
        print("Please configure SUPABASE_DB_URL in the .env file.")
        return

    print("Connecting to Supabase PostgreSQL...")
    
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()

        # Phase 1: Core Tables
        schemas = [
            # 1. CORE TABLES
            """CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                type VARCHAR(50),
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );""",
            """CREATE TABLE IF NOT EXISTS enquiries (
                id SERIAL PRIMARY KEY,
                project_id INT REFERENCES projects(id),
                stage VARCHAR(50),
                entry_point VARCHAR(50),
                status VARCHAR(50)
            );""",
            """CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                contact_info TEXT,
                project_history TEXT
            );""",
            """CREATE TABLE IF NOT EXISTS contractors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                projects TEXT,
                bidding_status VARCHAR(50)
            );""",

            # 2. PRODUCT CATALOG TABLES
            """CREATE TABLE IF NOT EXISTS hardware_sets (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                door_type VARCHAR(100),
                specifications TEXT,
                category VARCHAR(100)
            );""",
            """CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                sku VARCHAR(100) UNIQUE,
                category VARCHAR(100),
                supplier_id INT,
                base_price DECIMAL(10, 2)
            );""",
            """CREATE TABLE IF NOT EXISTS supplier_price_list (
                id SERIAL PRIMARY KEY,
                supplier_id INT,
                product_id INT REFERENCES products(id),
                price DECIMAL(10, 2),
                effective_date DATE
            );""",
            """CREATE TABLE IF NOT EXISTS door_forms_library (
                id SERIAL PRIMARY KEY,
                form_type VARCHAR(100),
                door_set_id INT,
                specifications TEXT,
                json_config JSONB
            );""",

            # 3. QUOTATION & COSTING TABLES
            """CREATE TABLE IF NOT EXISTS quotations (
                id SERIAL PRIMARY KEY,
                enquiry_id INT REFERENCES enquiries(id),
                draft_status VARCHAR(50),
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_approved BOOLEAN DEFAULT FALSE
            );""",
            """CREATE TABLE IF NOT EXISTS quotation_items (
                id SERIAL PRIMARY KEY,
                quotation_id INT REFERENCES quotations(id),
                product_id INT REFERENCES products(id),
                quantity INT,
                unit_price DECIMAL(10, 2),
                margin DECIMAL(5, 2)
            );""",
            """CREATE TABLE IF NOT EXISTS cost_summaries (
                id SERIAL PRIMARY KEY,
                quotation_id INT REFERENCES quotations(id),
                material_cost DECIMAL(12, 2),
                labor DECIMAL(12, 2),
                markup DECIMAL(5, 2),
                total_price DECIMAL(12, 2)
            );""",

            # 4. CONFIGURATION TABLES
            """CREATE TABLE IF NOT EXISTS project_types (
                id SERIAL PRIMARY KEY,
                type_name VARCHAR(100),
                default_hardware_grouping TEXT
            );""",
            """CREATE TABLE IF NOT EXISTS hardware_groupings (
                id SERIAL PRIMARY KEY,
                grouping_name VARCHAR(100),
                sets_included TEXT,
                default_selections TEXT
            );""",
            """CREATE TABLE IF NOT EXISTS requirements_templates (
                id SERIAL PRIMARY KEY,
                project_type VARCHAR(100),
                required_fields TEXT,
                validation_rules JSONB
            );"""
        ]

        for schema in schemas:
            cursor.execute(schema)
            
        # Index Strategy
        indices = [
            "CREATE INDEX IF NOT EXISTS idx_enquiry_stage ON enquiries(stage);",
            "CREATE INDEX IF NOT EXISTS idx_quotation_status ON quotations(draft_status);",
            "CREATE INDEX IF NOT EXISTS idx_product_supplier ON products(supplier_id);"
        ]

        for idx in indices:
            cursor.execute(idx)

        print("Database schema and indices created successfully on Supabase.")
        
    except Exception as e:
        print(f"Database setup error: {e}")
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    setup_database()
