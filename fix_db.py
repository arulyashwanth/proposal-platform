from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE cost_summaries ALTER COLUMN markup TYPE NUMERIC(12, 2);"))
    conn.commit()
    print("Column altered successfully!")
