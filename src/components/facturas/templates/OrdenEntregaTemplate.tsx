'use client';

import React from 'react';
import { X, CheckSquare, Square, Package, Camera, Info } from 'lucide-react';
import QRCode from 'react-qr-code';
import { InvoiceSettings } from '@/types/invoice';

interface OrdenEntregaTemplateProps {
  settings: InvoiceSettings;
  organization: any;
  docNumber: string;
  nombreUsuario?: string;
  selectedClient: any | null;
  today: string;
  lineItems: any[];
  viewMode?: boolean;
  ordenEntrega: any;
  onToggleItemExcluido: (id: string, isExcluded: boolean) => Promise<void>;
  ordenTrabajo?: any;
}

export default function OrdenEntregaTemplate({
  settings,
  organization,
  docNumber,
  nombreUsuario,
  selectedClient,
  today,
  lineItems,
  viewMode = false,
  ordenEntrega,
  onToggleItemExcluido,
  ordenTrabajo
}: OrdenEntregaTemplateProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!ordenEntrega) return null;

  const [fechaVal = '', ...horaParts] = (today || '').split(' ');
  const horaVal = horaParts.join(' ');

  const qrOrigin = isMounted && typeof window !== 'undefined' ? window.location.origin : 'https://www.bioelectronicahn.com';
  const qrUrl = `${qrOrigin}/v/entrega/${ordenEntrega.id}`;

  const signatureHeight = settings.signatureHeight ?? 64;
  const sealSize = settings.sealSize ?? 112;
  const signatureSpacing = settings.signatureSpacing ?? 0;

  // Filtrar secciones (títulos de grupo) para la entrega
  const items = lineItems.filter(item => !item.isSection);

  // Lista de firmas configuradas
  const signaturesList = settings.signaturesList || [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings.showEmiliaZapata !== false },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings.showManuelTejada !== false }
  ];

  const activeSigs = (ordenEntrega.mostrarFirmas !== false) ? signaturesList.filter((sig: any) => sig.enabled) : [];
  const showSeals = (ordenEntrega.mostrarSello !== false);

  const excludedIds = ordenEntrega.detallesExcluidos || [];

  return (
    <div className="bg-white px-12 pt-12 pb-28 max-w-[816px] mx-auto min-h-[1056px] relative text-black border border-slate-100 shadow-xl print:shadow-none print:border-none print:p-0 print:m-0 select-none print:text-black">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
        <div>
          {organization?.logoUrl ? (
            <img src={organization.logoUrl} alt={organization.name || 'Logo'} className="h-14 object-contain" />
          ) : (
            <div className="h-14 w-32 bg-slate-100 flex items-center justify-center border border-slate-200 text-[10px] text-slate-400 font-bold">
              Bioelectrónica
            </div>
          )}
        </div>
        <h1 className="text-3xl font-black text-[#0d608e] uppercase tracking-wide">
          ORDEN DE ENTREGA
        </h1>
      </div>

      {/* Info Grid: Client Block */}
      <div className="mb-6">
        <div className="border-b-2 border-black pb-0.5 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider">INFORMACIÓN DEL CLIENTE</h2>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 text-[11px] min-w-0">
          {/* Col 1 */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-end min-w-0">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">CLIENTE</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 truncate font-semibold uppercase min-w-0 text-left">
                {selectedClient?.name || '—'}
              </span>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">CELULAR</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 font-semibold min-w-0 text-left">
                {selectedClient?.phone || '—'}
              </span>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">RTN</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 font-mono font-semibold min-w-0 text-left">
                {selectedClient?.rtn || '—'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-[1.5px] bg-black self-stretch my-0.5"></div>

          {/* Col 2 */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-end min-w-0">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">ATENCIÓN</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 font-semibold uppercase min-w-0 text-left">
                {nombreUsuario || '—'}
              </span>
            </div>
            <div className="flex items-end min-w-0">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">DIRECCIÓN</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 truncate font-semibold uppercase min-w-0 text-left" title={selectedClient?.address || ''}>
                {selectedClient?.address || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid: Details Block */}
      <div className="mb-6">
        <div className="border-b-2 border-black pb-0.5 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider">DETALLES DE ENTREGA</h2>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 text-[11px]">
          {/* Col 1 */}
          <div className="space-y-1.5">
            <div className="flex items-end">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">FECHA</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 font-semibold">
                {fechaVal || '—'}
              </span>
            </div>
            <div className="flex items-end">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">HORA</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 font-semibold">
                {horaVal || '—'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-[1.5px] bg-black self-stretch my-0.5"></div>

          {/* Col 2 */}
          <div className="space-y-1.5">
            <div className="flex items-end">
              <span className="font-bold w-20 border-b border-black pb-0.5 shrink-0">ORDEN NO.</span>
              <span className="flex-1 border-b border-black border-dashed pb-0.5 pl-2 font-mono font-bold text-indigo-700 print:text-black">
                {ordenEntrega.correlativo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="mb-6">
        <div className="border-b-2 border-black pb-0.5 mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider">ARTÍCULOS POR ENTREGAR</h2>
          <span className="text-[9px] text-slate-400 font-medium print:hidden flex items-center gap-1">
            <Info size={11} /> Marca la casilla para incluir/excluir artículos de la entrega.
          </span>
        </div>

        <table className="w-full border-2 border-black border-collapse text-[11px] text-black">
          <thead>
            <tr className="border-b border-black bg-slate-50 font-bold uppercase text-center">
              <th className="border-r border-black py-1.5 px-2 w-[8%] print:hidden">Incluir</th>
              <th className="border-r border-black py-1.5 px-2 w-[7%]">No.</th>
              <th className="border-r border-black py-1.5 px-2 w-[23%]">Serie</th>
              <th className="border-r border-black py-1.5 px-2 text-left w-[47%]">Descripción</th>
              <th className="py-1.5 px-2 w-[15%]">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isExcluded = excludedIds.includes(item.id);
              const isIncluded = !isExcluded;

              return (
                <tr 
                  key={item.id} 
                  className={`border-b border-black text-center min-h-[32px] transition-all ${
                    isExcluded ? 'bg-slate-50/70 text-slate-400 opacity-40 line-through print:hidden' : 'hover:bg-slate-50/30'
                  }`}
                >
                  {/* Selector (Check) */}
                  <td className="border-r border-black py-2 px-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => onToggleItemExcluido(item.id, isIncluded)}
                      className={`p-1 rounded-lg transition-colors hover:bg-slate-100 flex items-center justify-center mx-auto ${
                        isIncluded ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                      title={isIncluded ? "Excluir de la orden" : "Incluir en la orden"}
                    >
                      {isIncluded ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>

                  {/* Number */}
                  <td className="border-r border-black py-2 px-2">{idx + 1}</td>

                  {/* Serie */}
                  <td className="border-r border-black py-2 px-2 font-semibold">
                    {item.serie || 'N/A'}
                  </td>

                  {/* Description */}
                  <td className="border-r border-black py-2 px-3 text-left">
                    <span className="font-medium text-black">{item.shortDesc}</span>
                    {item.garantia && item.garantia.toLowerCase() !== 'sin garantía' && (
                      <span className="block text-[9px] text-slate-500 font-semibold mt-1">
                        Garantía: {item.garantia}
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="py-2 px-2 font-semibold">{item.qty}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black bg-slate-50 font-bold">
              <td className="border-r border-black py-2 px-2 print:hidden"></td>
              <td className="border-r border-black py-2 px-2"></td>
              <td className="border-r border-black py-2 px-2"></td>
              <td className="border-r border-black py-2 px-3 text-right uppercase tracking-wider text-xs">
                TOTAL ARTÍCULOS / BULTOS:
              </td>
              <td className="py-2 px-2 text-center text-xs font-black">
                {items
                  .filter(it => !excludedIds.includes(it.id))
                  .reduce((acc, it) => acc + (Number(it.qty) || 0), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Support Diagnosis if linked to a Ticket */}
      {ordenTrabajo?.diagnosticoTecnico && (
        <div className="mb-6 border border-slate-300 rounded-xl p-4 bg-slate-50/50 print:bg-white print:border-black text-[11px] print:break-inside-avoid">
          <h3 className="font-bold text-slate-800 print:text-black mb-1.5 uppercase tracking-wide text-xs">
            Diagnóstico Técnico de Soporte
          </h3>
          <p className="text-slate-600 print:text-black leading-relaxed whitespace-pre-wrap">
            {ordenTrabajo.diagnosticoTecnico}
          </p>
        </div>
      )}

      {/* Photographic Evidence Section */}
      {ordenEntrega.evidenciaFotos && ordenEntrega.evidenciaFotos.length > 0 && (
        <div className="mb-6 print:break-inside-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
            Evidencias Fotográficas de Entrega
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {ordenEntrega.evidenciaFotos.map((foto: string, i: number) => {
              const desc = (ordenEntrega.evidenciaFotosDesc || [])[i] || "";
              return (
                <div key={i} className="border border-slate-300 rounded-lg p-1 bg-slate-50 flex flex-col items-center print:bg-white print:border-black w-full">
                  <div className="w-20 h-20 relative rounded overflow-hidden bg-slate-100 flex items-center justify-center border border-black">
                    <img src={foto} alt={`Evidencia ${i + 1}`} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[7.5px] text-slate-600 print:text-black mt-1 text-center font-semibold leading-tight break-words w-full" title={`${i + 1}. ${desc || 'Evidencia'}`}>
                    {`${i + 1}. ${desc || 'Evidencia'}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG filter definitions for signature stroke thickening/thinning */}
      <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="sig-dilate-small">
            <feMorphology operator="dilate" radius="0.5" />
          </filter>
          <filter id="sig-dilate-medium">
            <feMorphology operator="dilate" radius="1.0" />
          </filter>
          <filter id="sig-dilate-large">
            <feMorphology operator="dilate" radius="1.8" />
          </filter>
          <filter id="sig-erode-ultra">
            <feMorphology operator="erode" radius="0.95" />
          </filter>
          <filter id="sig-erode-medium">
            <feMorphology operator="erode" radius="0.65" />
          </filter>
          <filter id="sig-erode-light">
            <feMorphology operator="erode" radius="0.35" />
          </filter>
        </defs>
      </svg>

      {/* Signatures & Client Acceptance */}
      <div className="relative mt-12 pt-6 flex justify-around items-start gap-8 print:break-inside-avoid">
        
        {/* Seal of Bioelectrónica */}
        {showSeals && (
          <div 
            className="absolute pointer-events-none transform rotate-[-8deg] select-none z-10"
            style={{ 
              width: `${sealSize}px`, 
              height: `${sealSize}px`,
              left: `${(settings.companySealX || 0) + 120}px`,
              top: `${-15 + (settings.companySealY || 0)}px`
            }}
          >
            <img 
              src="/firmas-sellos/SELLO DE BIOELECTRONICA.png" 
              alt="Sello Bioelectrónica" 
              className="w-full h-full object-contain mix-blend-multiply opacity-75" 
            />
          </div>
        )}

        {/* Enabled Company Signatures */}
        {activeSigs.filter((s: any) => s.id !== 'cliente_firma' && s.id !== 'cliente').map((sig: any) => {
          return (
            <div key={sig.id} className="flex flex-col items-center text-center relative flex-1 max-w-[240px]">
              <div className="flex items-end justify-center w-full relative z-10" style={{ height: `${signatureHeight}px` }}>
                {sig.imageUrl && (
                  <img 
                    src={sig.imageUrl} 
                    alt={`Firma ${sig.name}`} 
                    className="object-contain max-h-full mix-blend-multiply relative z-10" 
                    style={{ 
                      height: `${sig.height || signatureHeight}px`,
                      transform: `translate(${sig.offsetX || 0}px, ${(sig.offsetY || 0)}px)`
                    }}
                  />
                )}
              </div>
              <div className="w-full border-t border-slate-400 my-1 relative z-0"></div>
              <div className="pt-0.5 space-y-0.5 relative z-0">
                <p className="font-bold text-slate-800 text-[10px] leading-tight">{sig.name}</p>
                <p className="text-slate-500 text-[9px] leading-tight">{sig.role}</p>
              </div>
            </div>
          );
        })}

        {/* Client Acceptance Signature Column */}
        {(() => {
          const clientSigItem = activeSigs.find((s: any) => s.id === 'cliente_firma' || s.id === 'cliente' || s.isClientSig);
          const clientSigUrl = clientSigItem?.imageUrl || ordenEntrega.factura?.firmaClienteBase64 || ordenEntrega.firmaClienteUrl;

          return (
            <div className="flex flex-col items-center text-center relative flex-1 max-w-[240px]">
              <div className="flex items-end justify-center w-full relative z-10" style={{ height: `${signatureHeight}px` }}>
                {clientSigUrl && (
                  <img 
                    src={clientSigUrl} 
                    alt="Firma del Cliente" 
                    className="object-contain max-h-full mix-blend-multiply relative z-10" 
                    style={{ 
                      height: `${clientSigItem?.height || signatureHeight}px`,
                      transform: `translate(${clientSigItem?.offsetX || 0}px, ${(clientSigItem?.offsetY || 0)}px)`
                    }}
                  />
                )}
              </div>
              <div className="w-full border-t border-slate-400 my-1 relative z-0"></div>
              <div className="pt-0.5 space-y-0.5 relative z-0">
                <p className="font-bold text-slate-800 text-[10px] leading-tight">Aceptación del Cliente</p>
                <p className="text-slate-500 text-[9px] leading-tight">Firma y Sello del Beneficiario</p>
                <p className="text-[7.5px] text-slate-400 leading-tight mt-1 max-w-[190px]">
                  Al firmar, el cliente acepta los términos y condiciones de esta entrega y garantía.
                </p>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Blue Footer with embedded QR Code */}
      <div className="absolute bottom-0 left-0 right-0 h-[62px] bg-[#0d608e] text-white flex items-center justify-center px-4 py-1 print:fixed print:bottom-0 print:left-0 print:right-0">
        <div className="w-full text-center text-[9.5px] leading-tight font-medium uppercase px-16">
          <p className="font-bold tracking-wide">
            BARRIO GUAMILITO. 7 CALLE. 9 AVENIDA, SAN PEDRO SULA, CORTES, HONDURAS C.A.
          </p>
          <p className="mt-0.5">
            TEL:(504) 552 04 91. CEL. 3178 2368 / 8924-6108
          </p>
          <p className="mt-0.5">
            E-MAIL: gerencia@bioelectronicahn.com / bioelectronicaa_a@yahoo.com
          </p>
        </div>

        {/* QR Code de Trazabilidad Digital en el Footer Azul (Posicionado a la Derecha) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 shrink-0">
          <div className="p-0.5 bg-white rounded-md flex items-center justify-center shrink-0 shadow-sm">
            <QRCode 
              value={qrUrl} 
              size={32} 
              level="M" 
            />
          </div>
          <div className="text-left text-white leading-none pr-1">
            <p className="text-[8.5px] font-mono font-black tracking-tight">{ordenEntrega.correlativo}</p>
            <p className="text-[6.5px] text-blue-100 font-semibold tracking-tighter mt-0.5">Trazabilidad Digital</p>
          </div>
        </div>
      </div>
    </div>
  );
}
