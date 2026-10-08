"""Build Architectural Split art using Walgreens' published business-card geometry.

The PDF remains editable vector typography and geometry; the decorative front
sculpture is raster art. PNG/JPG uploads are rendered from the final PDF at 600 dpi.
"""

from io import BytesIO
from pathlib import Path
import json
import shutil
import subprocess
import zipfile

from PIL import Image, ImageCms
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject, NameObject
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
ASSETS = BASE / "assets"
UPLOADS = BASE / "uploads"
PDF_DIR = ROOT / "output/pdf/wallace-shift-business-cards"
QA = ROOT / "tmp/pdfs/business-cards"
for folder in (UPLOADS, PDF_DIR, QA):
    folder.mkdir(parents=True, exist_ok=True)

for family, filename in (
    ("Manrope", "Manrope-Regular.ttf"),
    ("ManropeMedium", "Manrope-Medium.ttf"),
    ("Instrument", "InstrumentSerif-Regular.ttf"),
    ("InstrumentItalic", "InstrumentSerif-Italic.ttf"),
):
    pdfmetrics.registerFont(TTFont(family, str(ASSETS / filename)))

W, H = 261.0, 153.0  # 3.625 x 2.125 inches, including Walgreens bleed.
BLEED = 4.5  # 1/16 inch each edge; trim is 252 x 144 pt (3.5 x 2 inches).
SAFE = 9.0  # Additional 1/16 inch inside trim.
INK, GRAPHITE, PEARL = "#080d12", "#121a21", "#edf1f2"
AZURE, DEEP_AZURE = "#4fa8ff", "#175c99"
PEOPLE = [
    {"name": "Bella Wallace", "role": "Sales and first contact",
     "email": "bella@wallaceshift.com", "phone": "(630) 803-4218", "id": "bella"},
    {"name": "Matthew Wallace", "role": "Engineering and design",
     "email": "matthew@wallaceshift.com", "phone": "(630) 235-2299", "id": "matthew"},
]
SERVICE_LINE = "Websites · Web apps · Automation"
ART = ASSETS / "architectural-front-art.png"
TEXT_BOUNDS = []


def write_text(c, text, x, y, font, size, color, tracking=0, record=True):
    width = pdfmetrics.stringWidth(text, font, size) + max(0, len(text)-1) * tracking
    ascent, descent = pdfmetrics.getAscentDescent(font, size)
    box = (x, y+descent, x+width, y+ascent)
    if record:
        assert box[0] >= SAFE and box[1] >= SAFE and box[2] <= W-SAFE and box[3] <= H-SAFE, (text, box)
        TEXT_BOUNDS.append({"text": text, "font": font, "size_pt": size, "bbox_pt": box})
    c.setFillColor(HexColor(color))
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(tracking)
    t.textOut(text)
    c.drawText(t)
    return box


def exact_logo(c, x, y, width):
    """Exact two closed paths from public/brand/wallace-shift-logo-white.svg."""
    paths = [
        [(124,291),(322,291),(516,715),(582,572),(459,457),(540,291),
         (713,291),(640,447),(772,581),(645,852),(396,852)],
        [(952,291),(1149,291),(877,852),(693,852)],
    ]
    scale = width / 1025
    c.saveState()
    c.translate(x, y+561*scale)
    c.scale(scale, -scale)
    c.translate(-124, -291)
    c.setFillColor(HexColor(PEARL))
    for pts in paths:
        p = c.beginPath()
        p.moveTo(*pts[0])
        for point in pts[1:]:
            p.lineTo(*point)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
    c.restoreState()


def front(c, record=True):
    iw, ih = Image.open(ART).size
    scale = max(W/iw, H/ih)
    c.saveState()
    p = c.beginPath()
    p.rect(0, 0, W, H)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(str(ART), (W-iw*scale)/2, (H-ih*scale)/2, iw*scale, ih*scale)
    c.restoreState()
    # Match the approved left-aligned lockup; retain space before the sculpture.
    write_text(c, "WALLACE SHIFT", 18, 71, "ManropeMedium", 9.1, PEARL, .82, record)
    write_text(c, "Design. Technology. Momentum.", 18, 56.5,
               "InstrumentItalic", 9.0, PEARL, record=record)


def back(c, person, record=True):
    c.setFillColor(HexColor(PEARL))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # Dark diagonal echoes the separate ascending slash of the original mark.
    p = c.beginPath()
    p.moveTo(130, 0)
    p.lineTo(190, H)
    p.lineTo(W, H)
    p.lineTo(W, 0)
    p.close()
    c.setFillColor(HexColor(GRAPHITE))
    c.drawPath(p, fill=1, stroke=0)
    exact_logo(c, 196, 43, 50)
    items = [
        (person["name"], 113, "Instrument", 22.5),
        (person["role"], 99, "Manrope", 8.7),
        (person["phone"], 72, "Manrope", 8.8),
        (person["email"], 58, "Manrope", 8.8),
        ("wallaceshift.com", 44, "Manrope", 8.8),
        (SERVICE_LINE, 18, "Manrope", 7),
    ]
    for text, y, font, size in items:
        box = write_text(c, text, 20, y, font, size, INK, record=record)
        assert box[2] + 6 < 130 + 60*box[1]/H, ("Text too close to diagonal", text)
    c.setStrokeColor(HexColor(DEEP_AZURE))
    c.setLineWidth(1.15)
    c.line(20, 87, 40, 87)


def make_master():
    data = BytesIO()
    c = canvas.Canvas(data, pagesize=(W,H), pageCompression=1)
    c.setTitle("Wallace Shift | Architectural Split | Walgreens production master")
    c.setAuthor("Wallace Shift")
    front(c)
    c.showPage()
    for person in PEOPLE:
        back(c, person)
        c.showPage()
    c.save()
    writer = PdfWriter()
    reader = PdfReader(data)
    for page in reader.pages:
        page.trimbox = RectangleObject((BLEED, BLEED, W-BLEED, H-BLEED))
        page.bleedbox = RectangleObject((0,0,W,H))
        page[NameObject("/ArtBox")] = RectangleObject((0,0,W,H))
        writer.add_page(page)
    writer.add_metadata({"/Title": "Wallace Shift - Architectural Split production master",
                         "/Author": "Wallace Shift",
                         "/Subject": "Pages: shared front, Bella back, Matthew back. Walgreens 3.5 x 2 inch trim."})
    path = PDF_DIR / "architectural-split-production-master.pdf"
    with path.open("wb") as f:
        writer.write(f)
    return path


def make_proof():
    path = PDF_DIR / "architectural-split-actual-size-proof.pdf"
    c = canvas.Canvas(str(path), pagesize=(612,792), pageCompression=1)
    c.setTitle("Wallace Shift | Architectural Split | Actual-size proof")
    c.setAuthor("Wallace Shift")
    write_text(c, "Architectural Split", 40, 742, "Instrument", 30, INK, record=False)
    write_text(c, "WALGREENS BUSINESS CARDS / FINAL CONTACT PROOF", 40, 719, "ManropeMedium", 9, DEEP_AZURE, .6, False)
    write_text(c, "Print this page at 100% or Actual size. Do not use Fit to page.", 40, 696, "Manrope", 9, INK, record=False)
    write_text(c, "Each card below is exactly 3.5 x 2 inches at that scale.", 40, 680, "Manrope", 9, INK, record=False)
    for person, bottom in zip(PEOPLE, (478, 283)):
        for col, kind in enumerate(("front", "back")):
            left = 40 + col*280
            write_text(c, f'{person["name"]} / {kind.upper()}', left, bottom+156,
                       "ManropeMedium", 9, INK, record=False)
            c.saveState()
            p = c.beginPath()
            p.rect(left,bottom,252,144)
            c.clipPath(p, stroke=0, fill=0)
            c.translate(left-BLEED,bottom-BLEED)
            if kind == "front":
                front(c, record=False)
            else:
                back(c, person, record=False)
            c.restoreState()
    notes = [
        "UPLOAD FILES: shared front + the matching person's back (PNG or JPG).",
        "Artwork includes Walgreens' 1/16-inch bleed on every edge.",
        "Choose landscape, standard square corners, and a double-sided option.",
        "Confirm both sides in Walgreens' final preview before placing the order.",
        "This PDF is for checking actual size. Upload the separate images, not this page.",
    ]
    for i, text in enumerate(notes):
        write_text(c, text, 40, 235-i*17, "Manrope", 8.5, INK, record=False)
    c.setStrokeColor(HexColor(INK))
    c.setLineWidth(.5)
    c.line(40,110,112,110)
    c.line(40,107,40,113)
    c.line(112,107,112,113)
    write_text(c, "1 inch scale check", 40, 93, "Manrope", 8, INK, record=False)
    c.showPage()
    c.save()
    return path


def export_uploads(master):
    poppler = shutil.which("pdftoppm")
    if not poppler:
        raise RuntimeError("pdftoppm is required")
    subprocess.run([poppler, "-r", "600", "-png", str(master), str(QA / "master")], check=True)
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    names = ["01-shared-front", "02-bella-back", "03-matthew-back"]
    for i,name in enumerate(names,1):
        im = Image.open(QA/f"master-{i}.png").convert("RGB")
        assert im.size == (2175,1275), im.size
        im.save(UPLOADS/f"{name}.png", dpi=(600,600), icc_profile=icc)
        im.save(UPLOADS/f"{name}.jpg", dpi=(600,600), icc_profile=icc, quality=98, subsampling=0)


def verify(master, proof):
    reader = PdfReader(master)
    fonts = {}
    for page in reader.pages:
        for ref in page["/Resources"]["/Font"].values():
            font = ref.get_object()
            if font.get("/Subtype") == "/TrueType":
                descriptor = font["/FontDescriptor"].get_object()
                embedded = any(k in descriptor for k in ("/FontFile", "/FontFile2", "/FontFile3"))
                assert embedded, font["/BaseFont"]
                fonts[str(font["/BaseFont"])] = embedded
    assert len(fonts) == 4, fonts
    assert len(reader.pages) == 3
    assert "WALLACE SHIFT" in reader.pages[0].extract_text()
    assert "Design. Technology. Momentum." in reader.pages[0].extract_text()
    for page,person in zip(reader.pages[1:],PEOPLE):
        text = page.extract_text()
        for value in (person["name"],person["role"],person["email"],person["phone"],"wallaceshift.com",SERVICE_LINE):
            assert value in text, (person["id"], value, text)
        other = next(p for p in PEOPLE if p != person)
        assert other["phone"] not in text
        assert other["email"] not in text
    for page in reader.pages:
        assert tuple(page.mediabox) == (0,0,W,H)
        assert tuple(page.trimbox) == (BLEED,BLEED,W-BLEED,H-BLEED)
    pr = PdfReader(proof)
    assert len(pr.pages)==1 and tuple(pr.pages[0].mediabox)==(0,0,612,792)
    result = {
        "trim_inches": [3.5,2], "bleed_canvas_inches": [3.625,2.125],
        "safe_area_inches": [3.375,1.875], "upload_pixels": [2175,1275],
        "export_dpi": 600, "color_profile": "sRGB", "master_pages": 3,
        "art_native_pixels": list(Image.open(ART).size),
        "art_effective_ppi": round(min(Image.open(ART).width/3.625,Image.open(ART).height/2.125),1),
        "minimum_text_size_pt": min(item["size_pt"] for item in TEXT_BOUNDS),
        "embedded_fonts": fonts,
        "contact_text_verified": True, "text_within_safe_area": True,
        "text_bounds": TEXT_BOUNDS,
        "walgreens_uploader_preview_verified": False,
        "physical_print_verified": False,
    }
    (BASE/"validation.json").write_text(json.dumps(result,indent=2)+"\n")


def package(master, proof):
    destination = BASE / "wallace-shift-walgreens-upload-kit.zip"
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(UPLOADS.iterdir()):
            directory = "PNG-uploads" if path.suffix == ".png" else "JPG-alternatives"
            z.write(path, f"{directory}/{path.name}")
        for path in (master, proof):
            z.write(path, f"PDF-proofs-and-master/{path.name}")
        z.write(BASE/"README.md", "READ-ME-FIRST.md")
    with zipfile.ZipFile(destination) as z:
        assert z.testzip() is None
    print(destination)


if __name__ == "__main__":
    master = make_master()
    proof = make_proof()
    export_uploads(master)
    verify(master,proof)
    package(master,proof)
    print(master)
    print(proof)
    print("Verified 3 PNG/JPG upload pairs, card dimensions, contacts, and safe margins.")
