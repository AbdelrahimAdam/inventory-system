// src/components/BarcodeScanner.tsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { XCircleIcon } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ isOpen, onClose, onDetected }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !cameraRef.current) return;

    setLoading(true);
    setError(null);

    const html5QrCode = new Html5Qrcode("scanner");
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices.length === 0) {
          setError("لم يتم العثور على كاميرا.");
          setLoading(false);
          return;
        }

        const cameraId = devices[0].id;

        html5QrCode
          .start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              html5QrCode.stop().then(() => {
                scannerRef.current = null;
                onDetected(decodedText);
                onClose();
              });
            }
          )
          .then(() => setLoading(false))
          .catch((err) => {
            setError("حدث خطأ أثناء تشغيل الكاميرا.");
            console.error(err);
            setLoading(false);
          });
      })
      .catch((err) => {
        setError("تعذر الوصول إلى الكاميرا.");
        console.error(err);
        setLoading(false);
      });

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, [isOpen, onClose, onDetected]);

  if (!isOpen) return null;

  return createPortal(
    <Dialog open={isOpen} onClose={onClose} className="relative z-50" dir="rtl">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          as={motion.div}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-sm w-full p-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-red-600 hover:text-red-700 dark:text-red-400"
            aria-label="إغلاق الماسح"
          >
            <XCircleIcon size={24} />
          </button>
          <Dialog.Title className="text-lg font-semibold text-center text-gray-800 dark:text-white mb-4">
            امسح الباركود
          </Dialog.Title>

          {loading && (
            <div className="w-full h-64 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">جاري تشغيل الكاميرا...</p>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center font-medium mt-4">{error}</div>
          )}

          <div ref={cameraRef} className="mt-4">
            <div id="scanner" className="rounded overflow-hidden" />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>,
    document.body
  );
};

export default BarcodeScanner;
