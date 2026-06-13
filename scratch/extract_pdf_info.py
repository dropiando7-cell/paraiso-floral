import fitz # PyMuPDF

doc = fitz.open("/Users/macbookpro/Documents/Bio/bioelectronicahn/referencias/ORDEN DE ENTREGA NAPKY BADER.pdf")
page = doc[0]
pix = page.get_pixmap(dpi=150)
pix.save("/Users/macbookpro/Documents/Bio/bioelectronicahn/scratch/page.png")
print("Saved scratch/page.png")
