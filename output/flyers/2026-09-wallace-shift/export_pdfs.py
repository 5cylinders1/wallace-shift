"""Wrap the approved flyer artwork losslessly in PDFs with clickable contacts."""

from pathlib import Path
import argparse

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent
DEST = ROOT / "output" / "pdf"
DEST.mkdir(parents=True, exist_ok=True)

# Preserve the approved 2:3 artwork on 6 x 9 inch pages, without cropping.
PAGE_W, PAGE_H = 432, 648
IMAGE_W, IMAGE_H = 1024, 1536


def link(pdf, url, rect):
    """Convert top-origin image coordinates to PDF page coordinates."""
    left, top, right, bottom = rect
    pdf.linkURL(
        url,
        (left * PAGE_W / IMAGE_W, (IMAGE_H - bottom) * PAGE_H / IMAGE_H,
         right * PAGE_W / IMAGE_W, (IMAGE_H - top) * PAGE_H / IMAGE_H),
        relative=0,
        thickness=0,
    )


FLYERS = [
    {
        "image": "wallace-shift-website-value-v5.png",
        "output": "wallace-shift-website-value-flyer.pdf",
        "title": "Wallace Shift - Website Value",
        "cta": (56, 1422, 420, 1485),
        "web": (520, 1310, 963, 1353),
        "email": (520, 1356, 963, 1399),
        "phone": (520, 1404, 963, 1449),
        "sources": [
            ("https://www.brightlocal.com/research/consumer-search-behavior-speed/", (43, 578, 197, 604)),
            ("https://www.brightlocal.com/research/consumer-search-behavior-speed/", (246, 578, 400, 604)),
            ("https://www.brightlocal.com/research/consumer-search-behavior-channels/", (445, 578, 599, 604)),
            ("https://credibility.stanford.edu/pdf/How_Do_People_Evaluate_a_Web_Site%27s_Credibility_v37.pdf", (650, 578, 796, 604)),
            ("https://blog.google/products-and-platforms/products/ads/speed-scorecard-impact-calculator/", (850, 578, 981, 604)),
        ],
    },
    {
        "image": "wallace-shift-services-v2.png",
        "output": "wallace-shift-services-flyer.pdf",
        "title": "Wallace Shift - Services and Pricing",
        "cta": (54, 1392, 417, 1467),
        "web": (614, 1338, 975, 1378),
        "email": (614, 1383, 975, 1427),
        "phone": (614, 1431, 975, 1474),
    },
]

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--website-only", action="store_true", help="Update the website flyer and combined set; keep the services PDF unchanged.")
args = parser.parse_args()

for flyer in FLYERS[:1] if args.website_only else FLYERS:
    path = DEST / flyer["output"]
    pdf = canvas.Canvas(str(path), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    pdf.setTitle(flyer["title"])
    pdf.setAuthor("Wallace Shift")
    pdf.setSubject("Approved Wallace Shift flyer artwork")
    pdf.setViewerPreference("DisplayDocTitle", "true")
    pdf.drawImage(str(SOURCE / flyer["image"]), 0, 0, width=PAGE_W, height=PAGE_H)
    link(pdf, "https://wallaceshift.com/contact", flyer["cta"])
    link(pdf, "https://wallaceshift.com/contact", flyer["web"])
    link(pdf, "mailto:bella@wallaceshift.com", flyer["email"])
    link(pdf, "tel:+16308034218", flyer["phone"])
    for source_url, rect in flyer.get("sources", []):
        link(pdf, source_url, rect)
    pdf.showPage()
    pdf.save()
    print(path)

combined = PdfWriter()
for flyer in FLYERS:
    combined.append(PdfReader(DEST / flyer["output"]))
combined.add_metadata({"/Title": "Wallace Shift - Flyer Collection", "/Author": "Wallace Shift"})
combined_path = DEST / "wallace-shift-flyers-combined.pdf"
with combined_path.open("wb") as output:
    combined.write(output)
print(combined_path)
