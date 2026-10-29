"""Create a two page portfolio attachment from verified email screenshots."""
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'output/page-application'
DEST = ROOT / 'output/pdf/wallace-shift-email-work-samples.pdf'
DEST.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(DEST), pagesize=(612, 792))
c.setTitle('Wallace Shift custom email work samples')
c.setAuthor('Matthew Wallace | Wallace Shift LLC')
c.setSubject('Two existing transactional email designs shown with demonstration data')
samples = [
    ('Reply365 call summary email', 'Own product project', 'reply365-call-summary.png'),
    ('Legacy Compounds account access email', 'Client project', 'legacy-account-access.png'),
]
for index, (title, context, filename) in enumerate(samples, 1):
    c.setFillColor(HexColor('#000000'))
    c.setFont('Helvetica-Bold', 9)
    c.drawString(42, 760, 'WALLACE SHIFT LLC')
    c.setFont('Helvetica', 9)
    c.drawRightString(570, 760, 'MATTHEW WALLACE')
    c.setFont('Helvetica-Bold', 18)
    c.drawString(42, 727, title)
    c.setFont('Helvetica', 10)
    c.drawString(42, 707, context + ' | Existing custom HTML template')
    c.drawString(42, 690, 'Portfolio preview with demonstration details and inactive links.')
    image_path = ASSETS / filename
    with Image.open(image_path) as im:
        w, h = im.size
        scale = min(528 / w, 621 / h)
        dw, dh = w * scale, h * scale
        c.drawImage(ImageReader(im), (612 - dw) / 2, 672 - dh, width=dw, height=dh, mask='auto')
    c.setFillColor(HexColor('#555555'))
    c.setFont('Helvetica', 8)
    c.drawString(42, 31, 'Transactional email sample. Browser preview, not an email client compatibility certification.')
    c.drawRightString(570, 17, str(index))
    c.showPage()
c.save()
print(DEST)
