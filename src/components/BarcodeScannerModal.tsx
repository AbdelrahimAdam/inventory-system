// src/components/BarcodeScannerModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import toast from 'react-hot-toast';
import beepSound from '../assets/success-beep.mp3';
import { updateInventoryByBarcode } from '../utils/inventoryService';
import LoadingSpinner from './LoadingSpinner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCAN_COOLDOWN_MS = 5000;

export default function BarcodeScannerModal({ isOpen, onClose }: BarcodeScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scanner = useRef<Html5Qrcode | null>(null);
  const lastScanned = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  const onScanSuccess = async (decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScanned.current && now - lastScanTime.current < SCAN_COOLDOWN_MS) return;
    lastScanned.current = decodedText;
    lastScanTime.current = now;

    audio.current?.play();
    toast.success(`تم مسح: ${decodedText}`, { position: 'top-right' });

    try {
      await updateInventoryByBarcode(decodedText);
    } catch {
      toast.error('فشل تحديث المخزون.');
    }
  };

  const onScanFailure = () => {};

  const startScanner = async (cameraId?: string) => {
    if (scanner.current?.getState() === Html5QrcodeScannerState.SCANNING) return;

    try {
      setLoading(true);

      const allCameras = await Html5Qrcode.getCameras();
      if (!allCameras.length) {
        setHasCamera(false);
        setLoading(false);
        return;
      }

      setHasCamera(true);
      setCameras(allCameras);
      const selectedId = cameraId || allCameras[0].id;
      setCurrentCameraId(selectedId);

      const scannerElement = document.getElementById('scanner');
      if (!scannerElement) throw new Error("العنصر 'scanner' غير موجود.");

      if (!scanner.current) {
        scanner.current = new Html5Qrcode('scanner');
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        ...(torchOn && { videoConstraints: { advanced: [{ torch: true }] } }),
      };

      await scanner.current.start({ deviceId: { exact: selectedId } }, config, onScanSuccess, onScanFailure);

      setCameraStarted(true);
    } catch (err: any) {
      toast.error(`خطأ في تشغيل الكاميرا: ${err?.message || err}`);
      setHasCamera(false);
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scanner.current?.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.current.stop();
        scanner.current.clear();
      }
    } catch (err) {
      console.warn('خطأ أثناء إيقاف الماسح:', err);
    }
    setCameraStarted(false);
  };

  const toggleTorch = async () => {
    if (!scanner.current || !currentCameraId) return;

    try {
      setTorchOn((prev) => !prev);
      await stopScanner();
      await startScanner(currentCameraId);
    } catch (err: any) {
      toast.error('الفلاش غير مدعوم في هذا الجهاز.');
    }
  };

  const switchCamera = async () => {
    if (!cameras.length) return;
    const currentIndex = cameras.findIndex((c) => c.id === currentCameraId);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];
    await stopScanner();
    await startScanner(nextCamera.id);
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setHasCamera(null);
      lastScanned.current = null;
      lastScanTime.current = 0;
      setTorchOn(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl relative"
              dir="rtl"
            >
              <Dialog.Title className="text-lg font-bold mb-4">امسح الباركود أو QR</Dialog.Title>

              {hasCamera === false && (
                <div className="text-red-600 mb-4">
                  لا يمكن العثور على كاميرا. <br />
                  تأكد من أن الإذن مفعّل أو أعد تحميل الصفحة.
                  <button
                    onClick={() => startScanner()}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex justify-center items-center h-40 mb-4">
                  <LoadingSpinner />
                </div>
              )}

              {!loading && cameraStarted && (
                <>
                  <div id="scanner" className="mx-auto w-full h-[250px] mb-4 rounded border border-gray-300" />
                  <div className="flex gap-2 mb-4 justify-center">
                    {cameras.length > 1 && (
                      <button
                        onClick={switchCamera}
                        className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded"
                      >
                        تبديل الكاميرا
                      </button>
                    )}
                    <button
                      onClick={toggleTorch}
                      className="bg-yellow-400 hover:bg-yellow-500 text-sm px-3 py-1 rounded"
                    >
                      {torchOn ? 'إيقاف الفلاش' : 'تشغيل الفلاش'}
                    </button>
                  </div>
                </>
              )}

              {!loading && !cameraStarted && hasCamera !== false && (
                <button
                  onClick={() => startScanner()}
                  className="mb-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                >
                  تشغيل الكاميرا
                </button>
              )}

              <button
                onClick={() => {
                  stopScanner();
                  onClose();
                }}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded"
              >
                إغلاق
              </button>

              <audio ref={audio} src={beepSound} preload="auto" />
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}