export default function FacturasPage() {
  return (
    <div className="flex flex-col items-center justify-center p-24 text-center h-[80vh] animate-in fade-in zoom-in duration-500">
      <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">Módulo de Facturación</h1>
      <p className="text-lg text-slate-500 max-w-lg mb-8">
        Sistema centralizado para la emisión y gestión de facturas de servicios, rentas de equipo y pólizas de mantenimiento.
      </p>
      
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 text-brand-700 font-medium">
        Sección en Construcción
      </div>
    </div>
  );
}
