import React from 'react';
import { InvoiceSettings } from '@/types/invoice';

interface InvoiceSignaturesAndSealsProps {
  settings: InvoiceSettings;
  clienteSignature?: { url: string; date: string; name: string } | null;
}

export default function InvoiceSignaturesAndSeals({ settings, clienteSignature }: InvoiceSignaturesAndSealsProps) {
  const showSignatures = settings.showSignatures ?? false;
  
  const showSeals = settings.showSeals ?? false;
  const showCompanySeal = settings.showCompanySeal ?? true;
  const selectedStatusSeal = settings.selectedStatusSeal ?? 'none';
  
  const signatureHeight = settings.signatureHeight ?? 64;
  const sealSize = settings.sealSize ?? 112;
  const companySealPosition = settings.companySealPosition ?? 'manuel';
  const statusSealPosition = settings.statusSealPosition ?? 'right';
  const signatureSpacing = settings.signatureSpacing ?? 0;

  // Dynamic signatures list fallback
  const signaturesList = settings.signaturesList || [
    { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings.showEmiliaZapata !== false },
    { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings.showManuelTejada !== false }
  ];

  const activeSigs = signaturesList.filter(sig => sig.enabled);
  const companySealImg = settings.companySealUrl || '/firmas-sellos/SELLO DE BIOELECTRONICA.png';

  let statusSealImg = '';
  if (selectedStatusSeal === 'cancelado') {
    statusSealImg = '/firmas-sellos/SELLO DE CANCELADO.png';
  } else if (selectedStatusSeal === 'entregado') {
    statusSealImg = '/firmas-sellos/SELLO DE ENTREGADO.png';
  } else if (selectedStatusSeal && selectedStatusSeal !== 'none') {
    statusSealImg = selectedStatusSeal; // Custom URL from library
  }
  
  if ((!showSignatures || activeSigs.length === 0) && !showSeals) return null;
  
  return (
    <div className="relative mt-10 mb-6 w-full print:break-inside-avoid">
      {/* Sello de Estado Independiente (Posición: Derecha o Centro) */}
      {showSeals && statusSealImg && (statusSealPosition === 'right' || statusSealPosition === 'center') && (
        <div 
          className={`absolute z-20 pointer-events-none transform rotate-[12deg] select-none ${
            statusSealPosition === 'center' ? 'left-1/2 -translate-x-1/2 -top-10' : 'right-12 -top-10'
          }`}
          style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
        >
          <img 
            src={statusSealImg} 
            alt={`Sello ${selectedStatusSeal}`} 
            className="w-full h-full object-contain mix-blend-multiply opacity-80" 
          />
        </div>
      )}

      {showSignatures && activeSigs.length > 0 && (
        <div className="flex flex-wrap justify-around items-end pt-10 relative gap-y-8">
          {/* Sello de la Empresa Independiente (Posición: Centro) */}
          {showSeals && showCompanySeal && companySealPosition === 'center' && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 top-4 z-10 pointer-events-none transform rotate-[-5deg] select-none"
              style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
            >
              <img 
                src={companySealImg} 
                alt="Sello Bioelectrónica" 
                className="w-full h-full object-contain mix-blend-multiply opacity-75" 
              />
            </div>
          )}

          {/* Sello de la Empresa Independiente (Posición: Derecha) */}
          {showSeals && showCompanySeal && companySealPosition === 'right' && (
            <div 
              className="absolute right-4 top-4 z-10 pointer-events-none transform rotate-[-8deg] select-none"
              style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
            >
              <img 
                src={companySealImg} 
                alt="Sello Bioelectrónica" 
                className="w-full h-full object-contain mix-blend-multiply opacity-75" 
              />
            </div>
          )}

          {/* Render Active Signatures columns */}
          {activeSigs.map((sig) => {
            const columnWidth = activeSigs.length <= 2 ? 'w-[40%]' : 'w-[28%]';
            return (
              <div key={sig.id} className={`flex flex-col items-center text-center relative ${columnWidth}`}>
                {/* Sello de la Empresa superpuesto sobre esta firma */}
                {showSeals && showCompanySeal && companySealPosition === sig.id && (
                  <div 
                    className="absolute -top-12 z-10 pointer-events-none transform rotate-[-8deg] select-none animate-in fade-in"
                    style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                  >
                    <img 
                      src={companySealImg} 
                      alt="Sello Bioelectrónica" 
                      className="w-full h-full object-contain mix-blend-multiply opacity-75" 
                    />
                  </div>
                )}
                {/* Sello de Estado superpuesto sobre esta firma */}
                {showSeals && statusSealImg && statusSealPosition === sig.id && (
                  <div 
                    className="absolute -top-12 z-20 pointer-events-none transform rotate-[10deg] select-none animate-in fade-in"
                    style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                  >
                    <img 
                      src={statusSealImg} 
                      alt="Sello Estado" 
                      className="w-full h-full object-contain mix-blend-multiply opacity-80" 
                    />
                  </div>
                )}
                <div className="flex items-end justify-center mb-1 select-none w-full" style={{ height: '64px' }}>
                  {sig.imageUrl && (
                    <img 
                      src={sig.imageUrl} 
                      alt={`Firma ${sig.name}`} 
                      className="object-contain relative mix-blend-multiply" 
                      style={{ 
                        height: `${signatureHeight}px`,
                        top: `${signatureSpacing}px`
                      }}
                    />
                  )}
                </div>
                <div className="w-full border-t border-slate-400 my-1"></div>
                <p className="font-bold text-slate-800 text-xs">{sig.name}</p>
                <p className="text-slate-500 text-[10px]">{sig.role}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Signature Area */}
      {clienteSignature && (
          <div className="flex justify-center items-end mt-12 w-full">
            <div className="flex flex-col items-center text-center relative w-[40%]">
              <div className="flex items-end justify-center mb-1 select-none w-full" style={{ height: '48px' }}>
                  <img 
                    src={clienteSignature.url} 
                    alt={`Firma de Cliente`} 
                    className="object-contain relative mix-blend-multiply" 
                    style={{ height: `${signatureHeight * 0.7}px`, maxHeight: '45px' }}
                  />
              </div>
              <div className="w-full border-t border-slate-400 my-1"></div>
              <p className="font-bold text-slate-800 text-xs">Firma Aprobada por: {clienteSignature.name}</p>
              <p className="text-slate-500 text-[10px]">Cliente / Solicitante</p>
              <p className="text-slate-400 text-[8px] mt-1">Fecha: {new Date(clienteSignature.date).toLocaleString()}</p>
            </div>
          </div>
      )}

      {/* Caso especial: Sólo sellos activados, sin firmas y en el centro */}
      {(!showSignatures || activeSigs.length === 0) && showSeals && showCompanySeal && (
        <div className="flex justify-center items-center py-4">
          <div 
            className="pointer-events-none transform rotate-[-5deg] select-none"
            style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
          >
            <img 
              src={companySealImg} 
              alt="Sello Bioelectrónica" 
              className="w-full h-full object-contain mix-blend-multiply opacity-80" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
