import React from 'react';
import { InvoiceSettings } from '@/types/invoice';

interface InvoiceSignaturesAndSealsProps {
  settings: InvoiceSettings;
}

export default function InvoiceSignaturesAndSeals({ settings }: InvoiceSignaturesAndSealsProps) {
  const showSignatures = settings.showSignatures ?? false;
  const showEmilia = settings.showEmiliaZapata ?? true;
  const showManuel = settings.showManuelTejada ?? true;
  
  const showSeals = settings.showSeals ?? false;
  const showCompanySeal = settings.showCompanySeal ?? true;
  const selectedStatusSeal = settings.selectedStatusSeal ?? 'none';
  
  const signatureHeight = settings.signatureHeight ?? 64;
  const sealSize = settings.sealSize ?? 112;
  const companySealPosition = settings.companySealPosition ?? 'manuel';
  const statusSealPosition = settings.statusSealPosition ?? 'right';
  const signatureSpacing = settings.signatureSpacing ?? 0;
  
  if (!showSignatures && !showSeals) return null;
  
  return (
    <div className="relative mt-10 mb-6 w-full print:break-inside-avoid">
      {/* Sello de Estado Independiente (Posición: Derecha o Centro) */}
      {showSeals && selectedStatusSeal !== 'none' && (statusSealPosition === 'right' || statusSealPosition === 'center') && (
        <div 
          className={`absolute z-20 pointer-events-none transform rotate-[12deg] select-none ${
            statusSealPosition === 'center' ? 'left-1/2 -translate-x-1/2 -top-10' : 'right-12 -top-10'
          }`}
          style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
        >
          <img 
            src={selectedStatusSeal === 'cancelado' ? '/firmas-sellos/SELLO DE CANCELADO.png' : '/firmas-sellos/SELLO DE ENTREGADO.png'} 
            alt={`Sello ${selectedStatusSeal}`} 
            className="w-full h-full object-contain mix-blend-multiply opacity-80" 
          />
        </div>
      )}

      {showSignatures && (
        <div className="flex justify-around items-end pt-10 relative">
          {/* Sello de la Empresa Independiente (Posición: Centro) */}
          {showSeals && showCompanySeal && companySealPosition === 'center' && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 top-4 z-10 pointer-events-none transform rotate-[-5deg] select-none"
              style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
            >
              <img 
                src="/firmas-sellos/SELLO DE BIOELECTRONICA.png" 
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
                src="/firmas-sellos/SELLO DE BIOELECTRONICA.png" 
                alt="Sello Bioelectrónica" 
                className="w-full h-full object-contain mix-blend-multiply opacity-75" 
              />
            </div>
          )}

          {/* Emilia Zapata Column */}
          {showEmilia && (
            <div className="flex flex-col items-center text-center w-[40%] relative">
              {/* Sello de la Empresa superpuesto sobre Emilia */}
              {showSeals && showCompanySeal && companySealPosition === 'emilia' && (
                <div 
                  className="absolute -top-12 z-10 pointer-events-none transform rotate-[-8deg] select-none"
                  style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                >
                  <img 
                    src="/firmas-sellos/SELLO DE BIOELECTRONICA.png" 
                    alt="Sello Bioelectrónica" 
                    className="w-full h-full object-contain mix-blend-multiply opacity-75" 
                  />
                </div>
              )}
              {/* Sello de Estado superpuesto sobre Emilia */}
              {showSeals && selectedStatusSeal !== 'none' && statusSealPosition === 'emilia' && (
                <div 
                  className="absolute -top-12 z-20 pointer-events-none transform rotate-[10deg] select-none"
                  style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                >
                  <img 
                    src={selectedStatusSeal === 'cancelado' ? '/firmas-sellos/SELLO DE CANCELADO.png' : '/firmas-sellos/SELLO DE ENTREGADO.png'} 
                    alt={`Sello ${selectedStatusSeal}`} 
                    className="w-full h-full object-contain mix-blend-multiply opacity-80" 
                  />
                </div>
              )}
              <div className="flex items-end justify-center mb-1 select-none w-full" style={{ height: '64px' }}>
                <img 
                  src="/firmas-sellos/firma emilia zapata.png" 
                  alt="Firma Ing. Emilia Zapata" 
                  className="object-contain relative mix-blend-multiply" 
                  style={{ 
                    height: `${signatureHeight}px`,
                    top: `${signatureSpacing}px`
                  }}
                />
              </div>
              <div className="w-full border-t border-slate-400 my-1"></div>
              <p className="font-bold text-slate-800 text-xs">Ing. Emilia Zapata</p>
              <p className="text-slate-500 text-[10px]">Jefa del departamento de Biomédica</p>
            </div>
          )}

          {/* Manuel Tejada Column */}
          {showManuel && (
            <div className="flex flex-col items-center text-center w-[40%] relative">
              {/* Sello de la Empresa superpuesto sobre Manuel */}
              {showSeals && showCompanySeal && companySealPosition === 'manuel' && (
                <div 
                  className="absolute -top-12 -right-4 z-10 pointer-events-none transform rotate-[-8deg] select-none"
                  style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                >
                  <img 
                    src="/firmas-sellos/SELLO DE BIOELECTRONICA.png" 
                    alt="Sello Bioelectrónica" 
                    className="w-full h-full object-contain mix-blend-multiply opacity-75" 
                  />
                </div>
              )}
              {/* Sello de Estado superpuesto sobre Manuel */}
              {showSeals && selectedStatusSeal !== 'none' && statusSealPosition === 'manuel' && (
                <div 
                  className="absolute -top-12 z-20 pointer-events-none transform rotate-[10deg] select-none"
                  style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                >
                  <img 
                    src={selectedStatusSeal === 'cancelado' ? '/firmas-sellos/SELLO DE CANCELADO.png' : '/firmas-sellos/SELLO DE ENTREGADO.png'} 
                    alt={`Sello ${selectedStatusSeal}`} 
                    className="w-full h-full object-contain mix-blend-multiply opacity-80" 
                  />
                </div>
              )}
              <div className="flex items-end justify-center mb-1 select-none w-full" style={{ height: '64px' }}>
                <img 
                  src="/firmas-sellos/firma Ing Manuel Tejada.png" 
                  alt="Firma Ing. Manuel Tejada" 
                  className="object-contain relative mix-blend-multiply" 
                  style={{ 
                    height: `${signatureHeight}px`,
                    top: `${signatureSpacing}px`
                  }}
                />
              </div>
              <div className="w-full border-t border-slate-400 my-1"></div>
              <p className="font-bold text-slate-800 text-xs">Ing. Manuel Tejada</p>
              <p className="text-slate-500 text-[10px]">Gerente General</p>
            </div>
          )}
        </div>
      )}

      {/* Caso especial: Sólo sellos activados, sin firmas y en el centro */}
      {!showSignatures && showSeals && showCompanySeal && (companySealPosition === 'center' || companySealPosition === 'manuel' || companySealPosition === 'emilia' || companySealPosition === 'right') && (
        <div className="flex justify-center items-center py-4">
          <div 
            className="pointer-events-none transform rotate-[-5deg] select-none"
            style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
          >
            <img 
              src="/firmas-sellos/SELLO DE BIOELECTRONICA.png" 
              alt="Sello Bioelectrónica" 
              className="w-full h-full object-contain mix-blend-multiply opacity-80" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
