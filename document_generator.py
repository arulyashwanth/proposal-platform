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


from fpdf import FPDF

class QuotationPDF(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 20)
        self.set_text_color(41, 128, 185) # Blue
        self.cell(0, 10, "MEKATRON", border=0, align="L", new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "I", 12)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, "Professional Quotation", border=0, align="L", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def sanitize(text: str) -> str:
    if not text:
        return ""
    text = str(text)
    replacements = {
        '—': '-', '–': '-', '•': '*', '“': '"', '”': '"', '‘': "'", '’': "'",
        '™': '(TM)', '©': '(c)', '®': '(R)', '…': '...'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    # encode to ascii and decode back to remove any other unicode chars
    return text.encode('latin-1', 'replace').decode('latin-1')


def generate_quotation_pdf(
    quotation_id: int,
    project_name: str,
    client_name: str,
    items: List[Dict[str, Any]],
    cost_summary: Dict[str, Any],
    prepared_by: str = "Mekatron System",
    notes: Optional[str] = None,
) -> Dict[str, str]:
    """
    Generate a professional PDF quotation using fpdf2.
    """
    ensure_dirs()
    
    pdf = QuotationPDF()
    pdf.add_page()
    
    # Project & Client Info
    pdf.set_font("helvetica", "B", 12)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(50, 8, "Quotation Ref:", border=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, f"QTN-{quotation_id:04d}", border=0, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(50, 8, "Project:", border=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, sanitize(project_name), border=0, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(50, 8, "Client:", border=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, sanitize(client_name), border=0, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(50, 8, "Date:", border=0)
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, datetime.date.today().strftime("%d %B %Y"), border=0, new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    
    # Items Table Header
    pdf.set_font("helvetica", "B", 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(80, 10, "Product", border=1, fill=True)
    pdf.cell(30, 10, "SKU", border=1, fill=True)
    pdf.cell(20, 10, "Qty", border=1, align="C", fill=True)
    pdf.cell(30, 10, "Unit Price", border=1, align="R", fill=True)
    pdf.cell(30, 10, "Subtotal", border=1, align="R", fill=True, new_x="LMARGIN", new_y="NEXT")
    
    # Items Table Body
    pdf.set_font("helvetica", "", 10)
    for item in items:
        # truncate product name if too long
        p_name = sanitize(str(item.get("product_name", "")))[:42]
        if len(str(item.get("product_name", ""))) > 42:
            p_name += "..."
        pdf.cell(80, 10, p_name, border=1)
        pdf.cell(30, 10, sanitize(str(item.get("sku", ""))), border=1)
        pdf.cell(20, 10, str(item.get("quantity", 0)), border=1, align="C")
        pdf.cell(30, 10, f"${item.get('unit_price', 0):.2f}", border=1, align="R")
        pdf.cell(30, 10, f"${item.get('subtotal', 0):.2f}", border=1, align="R", new_x="LMARGIN", new_y="NEXT")
        
    pdf.ln(10)
    
    # Cost Summary
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Cost Summary", border=0, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    
    def summary_row(label, val, is_bold=False):
        if is_bold:
            pdf.set_font("helvetica", "B", 12)
        else:
            pdf.set_font("helvetica", "", 10)
        pdf.cell(130, 8, "", border=0)
        pdf.cell(30, 8, label, border=0)
        pdf.cell(30, 8, f"${val:.2f}", border=0, align="R", new_x="LMARGIN", new_y="NEXT")

    summary_row("Material Cost:", cost_summary.get("material_cost", 0))
    summary_row("Labor:", cost_summary.get("labor", 0))
    summary_row("Markup:", cost_summary.get("markup", 0))
    summary_row("Total Price:", cost_summary.get("total_price", 0), is_bold=True)
    
    if notes:
        pdf.ln(10)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 8, "Notes:", border=0, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        pdf.multi_cell(0, 6, sanitize(notes))
        
    filename = f"quotation_{quotation_id}_{datetime.date.today().isoformat()}.pdf"
    output_path = EXPORTS_DIR / filename
    
    pdf.output(str(output_path))
    
    return {
        "document_path": str(output_path.resolve()),
        "filename": filename,
        "download_url": f"http://localhost:8000/api/quotations/{quotation_id}/download-pdf",
    }
