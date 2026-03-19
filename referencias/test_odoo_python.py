import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    f"http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/671/image_1024",
    f"http://he608m8yeek.sn.mynetname.net:8032/web/image/product.template/671/image_1920",
    f"http://he608m8yeek.sn.mynetname.net:8032/web/image?model=product.template&id=671&field=image_1920",
    f"http://he608m8yeek.sn.mynetname.net:8032/web/image?model=product.template&id=671&field=image_512",
]

for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as r:
            data = r.read()
            print(f"URL: {u} -> Length: {len(data)}, type: {r.headers.get('Content-Type')}")
    except Exception as e:
        print(f"URL: {u} -> Error: {e}")
