"""
document_generator.py — Jinja2-based quotation document generator.
Produces a professional HTML quotation file. No AI credits needed.
"""
import os
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from jinja2 import Environment, FileSystemLoader


TEMPLATES_DIR = Path(__file__).parent / "templates"
EXPORTS_DIR   = Path(__file__).parent / "exports" / "quotations"


def ensure_dirs():
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


def generate_quotation_html(
    quotation_id: int,
    project_name: str,
    client_name: str,
    items: List[Dict[str, Any]],
    cost_summary: Dict[str, Any],
    prepared_by: str = "Mekatron System",
    notes: Optional[str] = None,
) -> Dict[str, str]:
    """
    Render quotation data into an HTML document using the Jinja2 template.

    Args:
        quotation_id:  ID of the quotation record.
        project_name:  Name of the project.
        client_name:   Customer/contractor name.
        items:         List of line items (product_name, sku, quantity, unit_price, margin, subtotal).
        cost_summary:  Dict with material_cost, labor, markup, total_price.
        prepared_by:   Name of the user/system generating the document.
        notes:         Optional additional notes to include.

    Returns:
        Dict with 'document_path' (absolute path) and 'preview_url'.
    """
    ensure_dirs()

    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("quotation.html.j2")

    context = {
        "quotation_id": quotation_id,
        "project_name": project_name,
        "client_name": client_name,
        "prepared_by": prepared_by,
        "date": datetime.date.today().strftime("%d %B %Y"),
        "items": items,
        "cost_summary": cost_summary,
        "notes": notes or "",
        "mekatron_version": "1.0.0",
    }

    rendered_html = template.render(**context)

    filename = f"quotation_{quotation_id}_{datetime.date.today().isoformat()}.html"
    output_path = EXPORTS_DIR / filename

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(rendered_html)

    return {
        "document_path": str(output_path.resolve()),
        "filename": filename,
        "preview_url": f"http://localhost:8000/api/quotations/{quotation_id}/preview",
    }
