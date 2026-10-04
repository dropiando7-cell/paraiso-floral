import sys

with open(r'd:\paraiso-floral\scripts\print_server_tickets.py', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Left Margin: I will use 38 columns and indent everything by 2 spaces.
c = c.replace('width=42', 'width=38')
c = c.replace('b"-" * 42', 'b"  " + b"-" * 38')
c = c.replace('receipt.extend(d_line.encode(', 'receipt.extend(b"  " + d_line.encode(')
c = c.replace('receipt.extend(b"FACTURA NO: "', 'receipt.extend(b"  FACTURA NO: "')
c = c.replace('receipt.extend(b"FECHA: "', 'receipt.extend(b"  FECHA: "')
c = c.replace('receipt.extend(b"CAI: "', 'receipt.extend(b"  CAI: "')
c = c.replace('receipt.extend(b"CLIENTE: "', 'receipt.extend(b"  CLIENTE: "')
c = c.replace('receipt.extend(b"RTN CLIENTE: "', 'receipt.extend(b"  RTN CLIENTE: "')
c = c.replace('receipt.extend(b"RTN: "', 'receipt.extend(b"  RTN: "')

c = c.replace('receipt.extend(b"CANT DESCRIPCION                 TOTAL" + LF)', 'receipt.extend(b"  CANT DESCRIPCION               TOTAL" + LF)')

# 2. Extract correct total and short description
old_item_loop = '''    import textwrap
    for item in items:
        cant = str(item.get('cantidad', 1))
        # Quitar saltos de linea que puedan romper el formato
        desc_raw = remove_accents(item.get('descripcion', '')).replace('\\n', ' ').replace('\\r', '').strip()
        total = format_currency(item.get('total', 0))
        
        # Envolver texto a un maximo de 25 caracteres por linea
        wrapped = textwrap.wrap(desc_raw, width=25)
        if not wrapped:
            wrapped = [""]
            
        for i, line in enumerate(wrapped):
            c_str = cant if i == 0 else ""
            if i == len(wrapped) - 1:
                # Ultima linea, agregar el total
                line_str = f"{c_str:<4} {line:<25} {total:>11}"
            else:
                line_str = f"{c_str:<4} {line:<25}"
            
            receipt.extend(line_str.encode('ascii', 'ignore') + LF)'''

new_item_loop = '''    import textwrap
    for item in items:
        cant = str(item.get('cantidad', 1))
        
        # Extract short description
        desc_full = remove_accents(item.get('descripcion', '')).replace('\\r', '')
        desc_lines = desc_full.split('\\n')
        desc_raw = desc_lines[0].strip()
        if "Producto registrado desde" in desc_raw:
            desc_raw = desc_raw.split("Producto registrado desde")[0].strip()
            
        # Also check if it's named 'nombre' or 'productoNombre'
        desc_raw = remove_accents(item.get('nombre') or item.get('productoNombre') or desc_raw).strip()
        
        total_val = item.get('totalLinea') or item.get('total') or 0
        total = format_currency(total_val)
        
        # Envolver texto a un maximo de 23 caracteres por linea (38 col - 5 cant - 10 total)
        wrapped = textwrap.wrap(desc_raw, width=23)
        if not wrapped:
            wrapped = [""]
            
        for i, line in enumerate(wrapped):
            c_str = cant if i == 0 else ""
            if i == len(wrapped) - 1:
                # Ultima linea, agregar el total
                line_str = f"  {c_str:<4} {line:<23} {total:>9}"
            else:
                line_str = f"  {c_str:<4} {line:<23}"
            
            receipt.extend(line_str.encode('ascii', 'ignore') + LF)'''

c = c.replace(old_item_loop, new_item_loop)

# 3. Align Totals
old_totals = '''    receipt.extend(f"SUBTOTAL: {subtotal:>15}".encode('ascii', 'ignore') + LF)
    # Mostramos el impuesto total (o puedes usar isv15 + isv18)
    receipt.extend(f"IMPUESTO: {impuesto:>15}".encode('ascii', 'ignore') + LF)
    
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(CMD_DOUBLE_HEIGHT)
    receipt.extend(f"TOTAL: {total:>15}".encode('ascii', 'ignore') + LF)'''

new_totals = '''    receipt.extend(f"  {'SUBTOTAL:':<16}{subtotal:>22}".encode('ascii', 'ignore') + LF)
    receipt.extend(f"  {'IMPUESTO:':<16}{impuesto:>22}".encode('ascii', 'ignore') + LF)
    
    receipt.extend(CMD_BOLD_ON)
    receipt.extend(CMD_DOUBLE_HEIGHT)
    receipt.extend(f"  {'TOTAL:':<10}{total:>15}".encode('ascii', 'ignore') + LF)'''

c = c.replace(old_totals, new_totals)

# 4. Center Align Header and Footer manually
c = c.replace("receipt.extend(remove_accents(org.get('name', 'DISTRIBUIDORA')).encode('ascii', 'ignore') + LF)", 
              "org_name = remove_accents(org.get('name', 'DISTRIBUIDORA'))\n    receipt.extend(org_name.center(40).encode('ascii', 'ignore') + LF)")

old_footer = '''    # --- PIE DE PAGINA ---
    receipt.extend(CMD_CENTER)
    receipt.extend(b"*** GRACIAS POR SU COMPRA ***" + LF)
    receipt.extend(b"Desarrollado por Soluciones Tecnologicas HN" + LF)
    receipt.extend(b"+504 94897451" + LF)'''

new_footer = '''    # --- PIE DE PAGINA ---
    receipt.extend(b"*** GRACIAS POR SU COMPRA ***".center(40).encode('ascii', 'ignore') + LF)
    receipt.extend(b"Desarrollado por Soluciones Tecnologicas HN".center(40).encode('ascii', 'ignore') + LF)
    receipt.extend(b"+504 94897451".center(40).encode('ascii', 'ignore') + LF)'''

c = c.replace(old_footer, new_footer)

with open(r'd:\paraiso-floral\scripts\print_server_tickets.py', 'w', encoding='utf-8') as f:
    f.write(c)
