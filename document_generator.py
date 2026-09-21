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


def generate_quotation_excel(
    quotation_ref: str,
    project_name: str,
    client_name: str,
    items: List[Dict[str, Any]],
    cost_summary: Dict[str, Any],
    prepared_by: str = "Mekatron System",
    notes: Optional[str] = None,
) -> Dict[str, str]:
    """
    Generate a professional Excel quotation with 4 sheets.
    """
    ensure_dirs()
    import time
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

    wb = Workbook()
    
    # 1. Cover Letter
    ws_cover = wb.active
    ws_cover.title = "Cover Letter"
    ws_cover.column_dimensions['A'].width = 25
    ws_cover.column_dimensions['B'].width = 60
    
    bold_font = Font(bold=True)
    header_font = Font(bold=True, size=14, color="FFFFFF")
    header_fill = PatternFill(start_color="2980b9", end_color="2980b9", fill_type="solid")
    
    ws_cover.append(["TECHNICAL SUBMITTAL"])
    ws_cover["A1"].font = Font(bold=True, size=16)
    ws_cover.append([f"REF.No.: {quotation_ref}"])
    ws_cover.append([])
    ws_cover.append(["Attention :", f"{client_name}"])
    ws_cover.append([None, "Project Section / Engineer"])
    ws_cover.append([])
    ws_cover.append(["Project Name:", project_name])
    ws_cover.append(["Date:", datetime.date.today().strftime("%d %B %Y")])
    ws_cover.append([])
    ws_cover.append(["Dear Sir,"])
    ws_cover.append(["Subject:", "Ironmongery Submission for " + project_name])
    
    for row in ws_cover.iter_rows(min_row=1, max_row=11, min_col=1, max_col=1):
        for cell in row:
            if cell.value:
                cell.font = bold_font

    # 2. Hardware sets
    ws_hw = wb.create_sheet("Hardware sets")
    ws_hw.append(["PROJECT NAME:", project_name, "", "", "", "", "DATE:", datetime.date.today().strftime("%d.%m.%Y")])
    ws_hw.append([f"REF.No.: {quotation_ref}"])
    ws_hw.append(["HARDWARE SETS SCHEDULE"])
    ws_hw["A3"].font = Font(bold=True, size=12)
    ws_hw.append([])
    
    headers = ["ITEM", "SKU", "DESCRIPTION", "QTY", "UNIT PRICE (AED)", "SUBTOTAL (AED)"]
    ws_hw.append(headers)
    for col, width in zip(['A', 'B', 'C', 'D', 'E', 'F'], [20, 20, 50, 10, 20, 20]):
        ws_hw.column_dimensions[col].width = width
        
    for cell in ws_hw[5]:
        cell.font = bold_font
        cell.fill = header_fill
        
    for item in items:
        ws_hw.append([
            sanitize(str(item.get("product_name", ""))),
            sanitize(str(item.get("sku", ""))),
            sanitize(str(item.get("category", ""))),
            item.get("quantity", 0),
            float(item.get('unit_price', 0)),
            float(item.get('subtotal', 0))
        ])

    # 3. Costing breakdown
    ws_cost = wb.create_sheet("Costing breakdown")
    ws_cost.append(["PROJECT NAME:", project_name])
    ws_cost.append([f"REF.No.: {quotation_ref}"])
    ws_cost.append([])
    ws_cost.append(["COSTING BREAKDOWN"])
    ws_cost["A4"].font = Font(bold=True, size=12)
    ws_cost.append([])
    
    ws_cost.column_dimensions['A'].width = 25
    ws_cost.column_dimensions['B'].width = 25
    
    def add_cost_row(label, val, is_bold=False):
        ws_cost.append([label, float(val)])
        if is_bold:
            ws_cost[ws_cost.max_row][0].font = bold_font
            ws_cost[ws_cost.max_row][1].font = bold_font

    add_cost_row("Material Cost (AED):", cost_summary.get("material_cost", 0))
    add_cost_row("Labor (AED):", cost_summary.get("labor", 0))
    add_cost_row("Markup (AED):", cost_summary.get("markup", 0))
    add_cost_row("Total Price (AED):", cost_summary.get("total_price", 0), is_bold=True)
    
    if notes:
        ws_cost.append([])
        ws_cost.append(["Notes:"])
        ws_cost.append([sanitize(notes)])
        ws_cost[ws_cost.max_row - 1][0].font = bold_font

    # 4. Delivery schedule
    ws_del = wb.create_sheet("Delivery schedule")
    ws_del.append(["PROJECT NAME:", project_name])
    ws_del.append([f"REF.No.: {quotation_ref}"])
    ws_del.append([])
    ws_del.append(["DELIVERY SCHEDULE"])
    ws_del["A4"].font = Font(bold=True, size=12)
    ws_del.append([])
    ws_del.append(["Phase", "Description", "Estimated Timeline"])
    for cell in ws_del[6]:
        cell.font = bold_font
        cell.fill = header_fill
        
    ws_del.column_dimensions['A'].width = 20
    ws_del.column_dimensions['B'].width = 50
    ws_del.column_dimensions['C'].width = 25
    
    ws_del.append(["Phase 1", "Hardware Sets - Initial Batch", "2-3 Weeks from Approval"])
    ws_del.append(["Phase 2", "Hardware Sets - Final Batch", "4-6 Weeks from Approval"])

    filename = f"quotation_{quotation_ref}_{datetime.date.today().isoformat()}_{int(time.time())}.xlsx"
    output_path = EXPORTS_DIR / filename
    
    wb.save(str(output_path))
    
    return {
        "document_path": str(output_path.resolve()),
        "filename": filename,
        "download_url": f"http://localhost:8000/api/quotations/{quotation_ref}/download-pdf",
    }
