"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Zap, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface PosCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function PosCameraScannerModal({
  isOpen,
  onClose,
  onScan,
}: PosCameraScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerContainerId = "pos-fast-scanner-container";
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const nativeDetectorRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Sound beep utility
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } catch (e) {
      // Audio autoplay restrictions or not supported
    }
  }, []);

  const handleDetectedText = useCallback(
    (rawText: string) => {
      const now = Date.now();
      // Cooldown 1200ms between scans to prevent duplicate triggers
      if (now - lastScanTimestampRef.current < 1200) return;
      lastScanTimestampRef.current = now;

      let cleanCode = rawText.trim().replace(/'/g, '-');
      if (cleanCode.includes('/')) {
        const parts = cleanCode.split('/').filter(Boolean);
        const lastPart = parts.pop();
        if (lastPart) cleanCode = lastPart.trim();
      }

      setLastScannedCode(cleanCode);
      playBeep();
      onScan(cleanCode);
    },
    [onScan, playBeep]
  );

  // Stop camera tracks cleanly
  const stopScanner = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (err) {
        // Ignore stop errors
      }
      html5QrcodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Initialize native BarcodeDetector or Html5Qrcode
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setIsInitializing(true);
    setError(null);
    setLastScannedCode(null);

    let isMounted = true;

    async function initCamera() {
      await stopScanner();
      if (!isMounted) return;

      // 1. Try Native Hardware-Accelerated BarcodeDetector API first (60 FPS GPU native decode)
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
          const formatsToUse = [
            'qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 
            'upc_a', 'upc_e', 'data_matrix', 'aztec', 'pdf417'
          ].filter(f => supportedFormats.includes(f));

          const detector = new (window as any).BarcodeDetector({ formats: formatsToUse });
          nativeDetectorRef.current = detector;

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });

          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            // Check torch availability
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
              if (capabilities.torch) setHasTorch(true);
            }
          }

          let lastDetectTime = 0;
          const detectLoop = async () => {
            if (!isMounted || !videoRef.current) return;
            const now = performance.now();
            // Detect at ~24 FPS for ultra-smooth rendering & minimal CPU impact
            if (now - lastDetectTime >= 40) {
              lastDetectTime = now;
              try {
                if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    handleDetectedText(barcodes[0].rawValue);
                  }
                }
              } catch (e) {
                // Ignore frame detect errors
              }
            }
            if (isMounted) {
              animFrameRef.current = requestAnimationFrame(detectLoop);
            }
          };

          setIsInitializing(false);
          animFrameRef.current = requestAnimationFrame(detectLoop);
          return;
        } catch (nativeErr) {
          console.warn("Native BarcodeDetector unavailable, falling back to Html5Qrcode:", nativeErr);
        }
      }

      // 2. Fallback to Html5Qrcode with 720p hardware constraints & formats
      try {
        const container = document.getElementById(scannerContainerId);
        if (!container) return;

        const html5Qrcode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });

        html5QrcodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 25,
            qrbox: (w, h) => ({
              width: Math.floor(Math.min(w, h) * 0.8),
              height: Math.floor(Math.min(w, h) * 0.5),
            }),
            videoConstraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (decodedText) => {
            if (isMounted) handleDetectedText(decodedText);
          },
          () => {}
        );

        setIsInitializing(false);
      } catch (fallbackErr: any) {
        console.error("Html5Qrcode error:", fallbackErr);
        if (isMounted) {
          setIsInitializing(false);
          setError("No se pudo acceder a la cámara. Verifica los permisos.");
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, handleDetectedText, stopScanner]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn("Torch error:", e);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                Escáner POS Cámara Ultra-Rápido
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                Soporta Códigos de Barras 1D y QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar escáner"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Viewport Container */}
        <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
          {/* Native Video Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Html5Qrcode Fallback Container */}
          <div
            id={scannerContainerId}
            className="absolute inset-0 w-full h-full overflow-hidden [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          {/* GPU Hardware-Accelerated 60 FPS Laser Animation Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-between p-4">
            {/* Viewfinder Bounding Corners */}
            <div className="absolute inset-5 border-2 border-dashed border-indigo-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="text-[10px] font-black uppercase text-indigo-300/90 tracking-widest bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-indigo-500/30 shadow-md">
                Encuadrar Código
              </div>
            </div>

            {/* GPU hardware accelerated laser (using translate3d instead of top layout reflow) */}
            <div
              className="absolute left-4 right-4 h-[2.5px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.9)] pointer-events-none z-10"
              style={{
                animation: 'gpu-scan-laser 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                willChange: 'transform',
                transform: 'translateZ(0)',
              }}
            />
          </div>

          {/* Initializing Spinner */}
          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20">
              <RefreshCw size={28} className="text-indigo-400 animate-spin" />
              <span className="text-xs font-bold text-slate-300 tracking-wide">
                Iniciando cámara...
              </span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center gap-3 z-20">
              <AlertCircle size={32} className="text-rose-500" />
              <p className="text-xs font-semibold text-rose-300 leading-relaxed">
                {error}
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* CSS GPU Animation Definition */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes gpu-scan-laser {
              0% { transform: translate3d(0, 16px, 0); opacity: 0.8; }
              50% { transform: translate3d(0, 240px, 0); opacity: 1; }
              100% { transform: translate3d(0, 16px, 0); opacity: 0.8; }
            }
          `
        }} />

        {/* Footer controls: Torch + Last Scanned Indicator + Close */}
        <div className="mt-4 flex flex-col gap-2 shrink-0">
          {lastScannedCode && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs animate-in zoom-in-95">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="font-mono font-bold text-emerald-200 truncate">
                  {lastScannedCode}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                ¡Escaneado!
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                  isTorchOn
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Zap size={15} className={isTorchOn ? 'fill-amber-400 text-amber-400' : ''} />
                <span>{isTorchOn ? 'Linterna ON' : 'Linterna'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-black rounded-xl transition-all cursor-pointer text-center border border-slate-700"
            >
              Cerrar Escáner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
