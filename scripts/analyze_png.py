import sys
from PIL import Image

try:
    img = Image.open('test_label.png')
    img = img.convert('RGB')
    print(f"Image Size: {img.size}")
    width, height = img.size
    
    # We want to see where the black divider is.
    # The divider should be a vertical black line around x=284.
    # Let's check a horizontal slice at y=100.
    row_pixels = []
    for x in range(width):
        r, g, b = img.getpixel((x, 100))
        # 0: black, 1: white/other
        if r < 50 and g < 50 and b < 50:
            row_pixels.append('#')
        else:
            row_pixels.append('-')
            
    print("Horizontal slice at y=100:")
    print("".join(row_pixels))

    # Let's also check a few other things, like where is the QR code?
    # QR code is approx x=290 to x=400.
    
    print("Done")
except Exception as e:
    print(e)
