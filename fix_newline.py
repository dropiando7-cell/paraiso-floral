import sys
import re

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace any n.split('\n    ')[0] or similar with n.split('\\n')[0]
c = re.sub(r"n = n\.split\('\n\s*'\)\[0\];", r"n = n.split('\\n')[0];", c)

with open(r'd:\paraiso-floral\src\components\facturas\DocumentListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
