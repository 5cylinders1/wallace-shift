"""Build the one-page Wallace Shift services overview.

Requires reportlab. Brand fonts are cached in tmp/pdfs/fonts on first run.
Copy follows src/content/{servicesPage,siteConfig,approachPage,about}.ts;
colors follow docs/brand-palette.md. No pricing or customer results are implied.
"""

from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/wallace-shift-services.pdf"
FONT_DIR = ROOT / "tmp/pdfs/fonts"
WIDTH, HEIGHT = 612, 792
MARGIN = 36
INK = HexColor("#080d12")
GRAPHITE = HexColor("#121a21")
PEARL = HexColor("#edf1f2")
SILVER = HexColor("#c3d0d8")
MUTED = HexColor("#52616b")
AZURE = HexColor("#4fa8ff")
DEEP_AZURE = HexColor("#175c99")
RULE = HexColor("#c8d2d8")

FONTS = {
    "Manrope": "https://fonts.gstatic.com/s/manrope/v23/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FO_F.ttf",
    "Manrope-Medium": "https://fonts.gstatic.com/s/manrope/v23/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk7PFO_F.ttf",
    "Manrope-Semibold": "https://fonts.gstatic.com/s/manrope/v23/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4jE-_F.ttf",
    "Manrope-Bold": "https://fonts.gstatic.com/s/manrope/v23/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4aE-_F.ttf",
    "Instrument-Italic": "https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zATiw.ttf",
}


def register_fonts():
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in FONTS.items():
        target = FONT_DIR / f"{name}.ttf"
        if not target.exists():
            with urllib.request.urlopen(url, timeout=30) as response:
                target.write_bytes(response.read())
        pdfmetrics.registerFont(TTFont(name, str(target)))


def text(pdf, value, x, top, size=10, font="Manrope", color=INK):
    """Place text using a top-aligned coordinate system."""
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    ascent = pdfmetrics.getAscent(font) * size / 1000
    pdf.drawString(x, HEIGHT - top - ascent, value)


def label(pdf, value, x, top, color=MUTED, size=8, tracking=1.25):
    pdf.saveState()
    obj = pdf.beginText(x, HEIGHT - top - pdfmetrics.getAscent("Manrope-Bold") * size / 1000)
    obj.setFont("Manrope-Bold", size)
    obj.setCharSpace(tracking)
    obj.setFillColor(color)
    obj.textOut(value)
    pdf.drawText(obj)
    pdf.restoreState()


def paragraph(pdf, value, x, top, width, size=10.5, leading=15, color=INK,
              font="Manrope", max_height=None):
    style = ParagraphStyle(
        "body", fontName=font, fontSize=size, leading=leading,
        textColor=color, alignment=TA_LEFT, splitLongWords=False,
    )
    block = Paragraph(value, style)
    _, height = block.wrap(width, HEIGHT)
    if max_height is not None and height > max_height:
        raise ValueError(f"Text exceeds its allocated space: {value!r} ({height} > {max_height})")
    block.drawOn(pdf, x, HEIGHT - top - height)
    return height


def line(pdf, x1, top1, x2, top2, color=RULE, thickness=0.6):
    pdf.setStrokeColor(color)
    pdf.setLineWidth(thickness)
    pdf.line(x1, HEIGHT - top1, x2, HEIGHT - top2)


def logo(pdf, x, top, width, color=PEARL):
    """Draw the existing WS monogram as vectors from the repository SVG."""
    root = ET.parse(ROOT / "public/brand/wallace-shift-logo-black.svg").getroot()
    scale = width / 1025
    pdf.saveState()
    pdf.translate(x, HEIGHT - top)
    pdf.scale(scale, -scale)
    pdf.translate(-124, -291)
    pdf.setFillColor(color)
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] != "path":
            continue
        tokens = iter(re.findall(r"[MLHVZ]|-?\d+(?:\.\d+)?", element.attrib["d"]))
        shape = pdf.beginPath()
        px = py = 0
        for token in tokens:
            if token in ("M", "L"):
                px, py = float(next(tokens)), float(next(tokens))
                (shape.moveTo if token == "M" else shape.lineTo)(px, py)
            elif token == "H":
                px = float(next(tokens))
                shape.lineTo(px, py)
            elif token == "V":
                py = float(next(tokens))
                shape.lineTo(px, py)
            elif token == "Z":
                shape.close()
            else:
                raise ValueError(f"Unexpected logo path token: {token}")
        pdf.drawPath(shape, stroke=0, fill=1)
    pdf.restoreState()


def arrow(pdf, x, top, color, length=14):
    line(pdf, x, top, x + length, top, color, 0.9)
    line(pdf, x + length - 4, top - 4, x + length, top, color, 0.9)
    line(pdf, x + length - 4, top + 4, x + length, top, color, 0.9)


def service(pdf, index, top, heading, description, examples):
    line(pdf, MARGIN, top, WIDTH - MARGIN, top)
    text(pdf, index, MARGIN, top + 14, 10, "Manrope-Semibold", DEEP_AZURE)
    paragraph(pdf, heading, 66, top + 12, 187, 13.3, 17,
              font="Manrope-Semibold", max_height=37)
    paragraph(pdf, description, 274, top + 12, 302, 10.3, 14.4,
              max_height=44)
    text(pdf, examples, 274, top + 61, 8.1, "Manrope-Medium", MUTED)


def build():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=(WIDTH, HEIGHT), pageCompression=1)
    pdf.setTitle("Wallace Shift | Services")
    pdf.setAuthor("Wallace Shift LLC")
    pdf.setSubject("Custom CRMs, AI integrations, workflow automation, and websites")
    pdf.setKeywords("Wallace Shift, services, CRM, AI, automation, websites")
    pdf.setCreator("Wallace Shift")

    pdf.setFillColor(PEARL)
    pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)

    # Compact dark hero, with the same type and palette as the website.
    pdf.setFillColor(INK)
    pdf.rect(0, HEIGHT - 253, WIDTH, 253, fill=1, stroke=0)
    logo(pdf, MARGIN, 30, 42)
    text(pdf, "WALLACE SHIFT", 91, 29, 12, "Manrope-Bold", PEARL)
    text(pdf, "Software. Workflows. Progress.", 91, 47, 8, color=SILVER)
    label(pdf, "SERVICES", 510, 35, SILVER, 7.7, 1)
    line(pdf, MARGIN, 75, WIDTH - MARGIN, 75, HexColor("#30404b"))

    text(pdf, "Systems built around", MARGIN, 96, 33, "Manrope-Semibold", PEARL)
    text(pdf, "your business.", MARGIN, 137, 46, "Instrument-Italic", AZURE)
    paragraph(
        pdf,
        "Custom CRMs, practical AI integrations, and connected workflows.<br/>"
        "We start with the work your team needs to do.",
        MARGIN, 202, 530, 10.8, 16, SILVER, max_height=33,
    )

    label(pdf, "WHAT WE DO", MARGIN, 274, DEEP_AZURE)
    service(
        pdf, "01", 296, "Custom CRMs &amp;<br/>business systems",
        "Bring enquiries, customer records, follow-up, and work in progress "
        "into a system built around your team.",
        "Shared records / Owner views / Focused internal tools",
    )
    service(
        pdf, "02", 386, "AI integrations &amp;<br/>workflow automation",
        "Connect repetitive steps and the tools you already use. Give AI a "
        "defined task, with clear inputs and human review.",
        "Enquiry routing / Follow-up / Checks for failed steps",
    )
    service(
        pdf, "03", 476, "Websites &amp;<br/>enquiry journeys",
        "Help customers understand your work and get in touch. Plan how "
        "each enquiry reaches the team handling it.",
        "Copy & design / Responsive development / Enquiry forms",
    )
    line(pdf, MARGIN, 566, WIDTH - MARGIN, 566)

    # A short process rather than a list of unsupported results.
    label(pdf, "A CLEAR PATH TO HANDOVER", MARGIN, 586, DEEP_AZURE)
    steps = [
        (36, "Understand", "Map the work\nand the gaps."),
        (179, "Agree", "Set the scope\nand price in writing."),
        (322, "Build & review", "Test the workflow\nwith your team."),
        (465, "Hand over", "Document the system;\nagree ongoing support."),
    ]
    for n, (x, title, body) in enumerate(steps):
        text(pdf, title, x, 608, 10.5, "Manrope-Bold")
        paragraph(pdf, body.replace("\n", "<br/>"), x, 627, 119,
                  9.1, 13.3, MUTED, max_height=27)
        if n < len(steps) - 1:
            arrow(pdf, x + 119, 615, DEEP_AZURE, 11)

    text(pdf, "Integrations, AI provider costs, and ongoing support are scoped for each project.",
         MARGIN, 669, 8.2, color=MUTED)

    # Linked, reader-facing contact block.
    pdf.setFillColor(GRAPHITE)
    pdf.rect(MARGIN, HEIGHT - 759, 540, 62, fill=1, stroke=0)
    text(pdf, "Where is work getting stuck?", 50, 709, 17,
         "Instrument-Italic", PEARL)
    text(pdf, "Start a conversation with Bella.", 50, 737, 8.4, color=SILVER)
    text(pdf, "bella@wallaceshift.com", 381, 710, 9.1,
         "Manrope-Semibold", AZURE)
    text(pdf, "wallaceshift.com/contact", 381, 734, 8.6, color=PEARL)
    pdf.linkURL("mailto:bella@wallaceshift.com", (381, HEIGHT - 725, 562, HEIGHT - 706), relative=0)
    pdf.linkURL("https://wallaceshift.com/contact", (381, HEIGHT - 749, 562, HEIGHT - 730), relative=0)

    text(pdf, "Greater Kansas City / Working remotely", MARGIN, 775, 7.3, color=MUTED)
    text(pdf, "Services & starting prices: wallaceshift.com/pricing", 358, 775, 7.0, color=DEEP_AZURE)
    pdf.linkURL("https://wallaceshift.com/pricing", (358, 6, 576, 20), relative=0)
    pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
