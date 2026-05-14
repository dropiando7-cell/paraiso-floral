with open('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'r') as f:
    content = f.read()

import re

# Find handleAgregarMovimiento
match = re.search(r'const handleAgregarMovimiento = \(\) => \{.*?setForm\(\{.*?\n\s+\}\);\n\s+\};', content, re.DOTALL)
if match:
    old_func = match.group(0)
    
    new_func = """const handleAgregarMovimiento = async () => {
    if (!form.categoria || !form.descripcion || !form.importe) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }
    const importeNum = parseFloat(String(form.importe || 0));
    const tipoCambioNum = parseFloat(String(form.tipoCambio)) || 1;
    const total = form.moneda === 'USD' ? importeNum * tipoCambioNum : importeNum;

    if (!sessionData?.id) {
      toast.error('No hay sesión de caja abierta');
      return;
    }

    setIsSaving(true);
    const res = await registerCajaChicaMovimiento({
      sessionId: sessionData.id,
      tipo: tipoMovimiento as any,
      categoria: form.categoria,
      descripcion: form.descripcion,
      documento: form.documento,
      nroDoc: form.nroDoc || '',
      importe: importeNum,
      moneda: form.moneda,
      tipoCambio: tipoCambioNum,
      total,
      beneficiario: form.beneficiario || '',
      creadoPorId: dbUser.id
    });

    if (res.success) {
      toast.success('Movimiento registrado');
      await loadData();
      setShowModalNuevo(false);
      setForm({
        categoria: '',
        descripcion: '',
        documento: 'FACTURA',
        nroDoc: '',
        importe: '0',
        moneda: 'HNL',
        tipoCambio: '1',
        beneficiario: ''
      });
    } else {
      toast.error(res.error || 'Error al guardar movimiento');
    }
    setIsSaving(false);
  };"""
    
    content = content.replace(old_func, new_func)
    with open('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'w') as f:
        f.write(content)
else:
    print("Function not found")
