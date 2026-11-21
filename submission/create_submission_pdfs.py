from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle, SimpleDocTemplate, Spacer
from pathlib import Path


OUT = Path(__file__).resolve().parent
INK = colors.HexColor("#17252B")
RED = colors.HexColor("#DD493F")
PAPER = colors.HexColor("#F7F8F4")
MUTED = colors.HexColor("#66757A")
MINT = colors.HexColor("#DCE9DF")
NAVY = colors.HexColor("#203A43")
LINE = colors.HexColor("#D8DDDA")


def footer(c, page_no):
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(44, 24, f"CIVICLENS  /  {page_no:02d}")


def create_presentation():
    page_size = landscape((13.333 * inch, 7.5 * inch))
    c = canvas.Canvas(str(OUT / "CivicLens_Presentation.pdf"), pagesize=page_size)
    w, h = page_size

    c.setFillColor(INK)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 42)
    c.drawString(54, h - 110, "CivicLens")
    c.setFont("Helvetica-Bold", 28)
    c.drawString(54, h - 190, "REPORT THE ISSUE.")
    c.drawString(54, h - 230, "ROUTE THE RESPONSE.")
    c.setFillColor(MINT)
    c.setFont("Helvetica", 16)
    c.drawString(54, h - 310, "Citizen complaint intelligence for fast municipal action")
    c.setFillColor(RED)
    c.circle(w - 155, h - 155, 92, fill=0, stroke=1)
    c.setFillColor(RED)
    c.circle(w - 155, h - 155, 42, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(w - 155, h - 330, "AI + RULES")
    c.drawCentredString(w - 155, h - 348, "+ LOCATION")
    footer(c, 1)
    c.showPage()

    c.setFillColor(PAPER)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(54, h - 70, "The civic reporting gap")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 18)
    c.drawString(54, h - 125, "Reports arrive, but context, urgency, routing,")
    c.drawString(54, h - 150, "and repeat incidents remain fragmented.")
    items = ["Free-text reports", "Photo evidence", "Location uncertainty", "Duplicate complaints"]
    for i, text in enumerate(items):
        y = h - 230 - i * 58
        c.setFillColor(colors.white)
        c.setStrokeColor(LINE)
        c.roundRect(54, y - 20, 320, 44, 5, fill=1, stroke=1)
        c.setFillColor(RED)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(70, y, f"{i + 1:02d}")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(118, y - 2, text)
    c.setFillColor(NAVY)
    c.roundRect(470, 90, 410, 380, 8, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(510, 390, "CivicLens")
    c.setFont("Helvetica-Bold", 14)
    for i, text in enumerate(["Understand", "Verify", "Geolocate", "Deduplicate", "Prioritize", "Route"]):
        c.setFillColor(RED if i == 0 else colors.white)
        c.drawString(510, 330 - i * 38, text)
    footer(c, 2)
    c.showPage()

    c.setFillColor(colors.white)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(54, h - 70, "One report becomes a managed incident")
    stages = [
        ("01", "Capture", "Description, photo, GPS"),
        ("02", "Understand", "Gemini + policy rules"),
        ("03", "Detect", "PostGIS + pgvector"),
        ("04", "Route", "Priority + department"),
    ]
    for i, (num, title, detail) in enumerate(stages):
        x = 54 + i * 216
        c.setFillColor(colors.HexColor("#FFF1EE") if i == 3 else PAPER)
        c.setStrokeColor(RED if i == 3 else LINE)
        c.setLineWidth(2 if i == 3 else 1)
        c.roundRect(x, 210, 190, 220, 7, fill=1, stroke=1)
        c.setFillColor(RED if i == 3 else MUTED)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 16, 390, num)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(x + 16, 325, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 12)
        c.drawString(x + 16, 280, detail)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(54, 120, "Preserve every original report")
    footer(c, 3)
    c.showPage()

    c.setFillColor(INK)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(54, h - 70, "Built for a complete pilot")
    features = [
        ("ELECTRICITY", "CRITICAL", "Gemini classification"),
        ("POSTGIS", "LOCATION", "Geographic candidates"),
        ("PGVECTOR", "384D", "Semantic similarity"),
        ("TICKET", "OPEN", "Officer status workflow"),
    ]
    for i, (tag, value, detail) in enumerate(features):
        x = 54 + (i % 2) * 445
        y = 320 if i < 2 else 155
        c.setFillColor(RED if i == 0 else NAVY)
        c.roundRect(x, y, 405, 135, 7, fill=1, stroke=0)
        c.setFillColor(MINT if i else colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 18, y + 100, tag)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 24)
        c.drawString(x + 18, y + 58, value)
        c.setFont("Helvetica", 11)
        c.drawString(x + 18, y + 24, detail)
    c.setFillColor(MINT)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(54, 75, "React + FastAPI + Supabase")
    footer(c, 4)
    c.showPage()

    c.setFillColor(PAPER)
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(54, h - 70, "Impact and next step")
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(54, 130, 300, 330, 7, fill=1, stroke=1)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(82, 410, "Verified")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 50)
    c.drawString(82, 340, "99%")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 14)
    c.drawString(82, 290, "Gemini confidence")
    c.drawString(82, 270, "on a live-wire complaint")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(82, 205, "CRITICAL  /  ELECTRICITY  /  PRIORITY 100")
    c.setFillColor(INK)
    c.roundRect(390, 130, 490, 330, 7, fill=1, stroke=0)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(430, 410, "NEXT")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(430, 350, "Deploy the pilot")
    c.setFillColor(MINT)
    c.setFont("Helvetica", 14)
    c.drawString(430, 300, "Public hosting · Officer authentication")
    c.drawString(430, 278, "Realtime status · Mobile notifications")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(430, 205, "GitHub: github.com/sumanth02005/AIT-Tech")
    footer(c, 5)
    c.save()


def create_writeup_pdf():
    path = OUT / "CivicLens_Project_Writeup.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=40, leftMargin=40, topMargin=42, bottomMargin=40)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleInk", parent=styles["Title"], textColor=INK, fontName="Helvetica-Bold", fontSize=28, leading=34, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name="SubRed", parent=styles["Normal"], textColor=RED, fontName="Helvetica-Bold", fontSize=12, leading=16))
    styles.add(ParagraphStyle(name="BodyCivic", parent=styles["BodyText"], textColor=INK, fontName="Helvetica", fontSize=10.5, leading=15))
    styles.add(ParagraphStyle(name="H1Civic", parent=styles["Heading1"], textColor=INK, fontName="Helvetica-Bold", fontSize=17, leading=21, spaceBefore=14, spaceAfter=7))

    story = [
        Paragraph("CIVICLENS", styles["TitleInk"]),
        Paragraph("Citizen Complaint Management · AI Classification · Geospatial Duplicate Detection", styles["SubRed"]),
        Spacer(1, 10),
        Table([
            ["Team", "CivicLens"],
            ["College", "SJB Institute of Technology"],
            ["Team leader", "Manoj N"],
            ["Leader email", "manoj062005@gmail.com"],
            ["Leader phone", "8123259754"],
            ["Members", "Sumanth V; Manoj N"],
        ], colWidths=[100, 360], style=TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), MINT),
            ("TEXTCOLOR", (0, 0), (-1, -1), INK),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])),
        Spacer(1, 12),
        Paragraph("Project Overview", styles["H1Civic"]),
        Paragraph("CivicLens gives citizens a direct way to report roads, utilities, public-safety, sanitation, and other municipal issues. It combines structured complaint capture, optional evidence photos, GPS or manual location, Gemini AI analysis, deterministic policy rules, multilingual embeddings, and geographic/semantic duplicate detection.", styles["BodyCivic"]),
        Paragraph("The citizen-facing interface presents one focused report flow and a clear reference receipt. The officer-facing interface displays a priority-sorted queue and supports assignment and status changes.", styles["BodyCivic"]),
        Paragraph("Problem and Solution", styles["H1Civic"]),
        Paragraph("Municipal complaint systems commonly lose context across unstructured reports, separate channels, and repeated submissions. CivicLens preserves every original citizen report while linking likely repeats to one incident or operational ticket. This preserves evidence and avoids discarding individual reports.", styles["BodyCivic"]),
        Paragraph("Implemented Features", styles["H1Civic"]),
    ]

    for item in [
        "Citizen complaint submission with name, contact, description, GPS/manual location, and image evidence.",
        "EXIF location extraction with GPS and manual-location fallbacks.",
        "Gemini classification of category, severity, hazards, summary, language, confidence, and department.",
        "Independent rules engine for critical keywords and low-confidence human-review flags.",
        "384-dimensional multilingual Sentence Transformer embeddings.",
        "Supabase PostgreSQL storage with PostGIS location points and pgvector similarity search.",
        "Combined geographic, semantic, category, and duplicate-likelihood evaluation.",
        "Incident, ticket, audit, and status workflow with priority sorting.",
        "React citizen reporting desk and officer operations dashboard.",
        "Supabase private evidence bucket, table permissions, and analytics endpoints.",
    ]:
        story.append(Paragraph(f"• {item}", styles["BodyCivic"]))

    story += [
        Paragraph("Technology Stack", styles["H1Civic"]),
        Paragraph("React + TypeScript, FastAPI + Python, Gemini, Sentence Transformers, Supabase PostgreSQL, PostGIS, pgvector, Supabase Storage, and Vite.", styles["BodyCivic"]),
        Paragraph("Processing Workflow", styles["H1Civic"]),
    ]
    workflow = [
        "A citizen submits a report and optional evidence.",
        "The backend validates the payload and stores the original complaint.",
        "The system resolves location from EXIF metadata, GPS, or manual coordinates.",
        "Gemini produces AI analysis and the rules engine independently evaluates severity.",
        "Sentence Transformers generate a 384-dimensional embedding.",
        "PostGIS and pgvector identify geographic and semantic candidates.",
        "A combined decision creates a new incident or links the report to an existing incident.",
        "The system creates a prioritized department ticket and stores an audit trail.",
        "Officers review, assign, update, and resolve incidents.",
    ]
    for i, item in enumerate(workflow, 1):
        story.append(Paragraph(f"{i}. {item}", styles["BodyCivic"]))

    story += [
        Paragraph("Verification and Results", styles["H1Civic"]),
        Paragraph("The backend, database, embedding model, complaint submission, incident creation, ticket routing, analytics, and React interface have been tested locally. A live-wire complaint was classified by Gemini as ELECTRICITY / CRITICAL with 99% confidence and routed to Electrical with priority 100. Repeated evidence also returned a likely-duplicate result.", styles["BodyCivic"]),
        Paragraph("Repository", styles["H1Civic"]),
        Paragraph("https://github.com/sumanth02005/AIT-Tech", styles["SubRed"]),
        Paragraph("AI Usage", styles["H1Civic"]),
        Paragraph("GitHub Copilot / VS Code Copilot was used for implementation and debugging. Google Gemini performs runtime complaint analysis. An independent rules engine and database fallback remain active rather than relying on AI output alone.", styles["BodyCivic"]),
    ]
    doc.build(story)


if __name__ == "__main__":
    create_presentation()
    create_writeup_pdf()
