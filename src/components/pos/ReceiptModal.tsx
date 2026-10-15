import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sale } from '../../types';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { BarcodeSVG } from '../products/BarcodeSVG';
import logoImg from '../../assets/logo.png';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  // Mark body for print layout so #root is cleanly suppressed and ticket prints at (0,0)
  useEffect(() => {
    document.body.classList.add('is-printing-receipt');
    return () => {
      document.body.classList.remove('is-printing-receipt');
    };
  }, []);

  const handlePrint = () => {
    const receiptEl = document.getElementById('printable-receipt');
    if (!receiptEl) {
      window.print();
      return;
    }

    // Try isolated hidden iframe printing first (100% reliable in Chromium without blank preview)
    let iframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Ticket - ${sale.folio}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0mm;
              }
              @media print {
                html, body {
                  width: 78mm !important;
                  margin: 0 auto !important;
                  padding: 3mm 2mm !important;
                  background: #fff !important;
                  color: #000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                color: #000000;
                background: #ffffff;
                width: 78mm;
                margin: 0 auto;
                padding: 3mm 2mm;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              svg {
                display: block;
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%;">
              ${receiptEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Iframe print fallback:', e);
          window.print();
        }
      }, 150);
    } else {
      window.print();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="print-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible print:block">
      <div className="print-modal-card bg-gym-card rounded-2xl border border-gym-border w-full max-w-md overflow-hidden shadow-2xl relative my-6 print:static print:m-0 print:p-0 print:border-none print:shadow-none print:bg-transparent print:w-auto print:max-w-none print:overflow-visible">
        
        {/* Top Action Bar (Excluded from print) */}
        <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">Venta Procesada Exitosamente</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Wrapper */}
        <div 
          className="p-6 bg-white text-black font-mono text-xs select-none print:p-4 print:w-[80mm] print:max-w-[80mm] print:mx-auto print:my-0 print:border print:border-dashed print:border-gray-400 print:block" 
          id="printable-receipt"
        >
          
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-dashed border-gray-400">
            <div className="flex flex-col items-center justify-center gap-1.5 mb-1.5">
              <div className="w-14 h-14 bg-black rounded-full p-1.5 flex items-center justify-center shadow-sm">
                <img src={logoImg} alt="Logo LEYENDS" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-base font-black tracking-wider text-black">LEYENDS FITNESS GYM</h2>
            </div>
            <p className="text-[11px] font-bold text-gray-800">SUCURSAL CENTRAL FITNESS</p>
            <p className="text-[10px] text-gray-600">Blvd. de los Campeones #500</p>
            <p className="text-[10px] text-gray-600">RFC: LEY-920311-GYM • Tel: (55) 1234-5678</p>
          </div>

          {/* Folio & Metadata */}
          <div className="py-3 border-b border-dashed border-gray-300 space-y-0.5 text-[11px] text-black">
            <div className="flex justify-between">
              <span className="font-bold">FOLIO:</span>
              <span className="font-bold font-mono">{sale.folio}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA:</span>
              <span>{new Date(sale.timestamp).toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between">
              <span>CLIENTE:</span>
              <span className="font-bold truncate max-w-[180px]">{sale.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span>ATENDIÓ:</span>
              <span>{sale.cashierName}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3 border-b-2 border-dashed border-gray-400 text-black">
            <div className="flex justify-between font-bold text-[11px] mb-2 border-b border-gray-200 pb-1">
              <span>CANT. ARTÍCULO</span>
              <span>TOTAL</span>
            </div>

            <div className="space-y-2 text-[11px]">
              {sale.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span className="font-bold">{item.quantity}x {item.product.name}</span>
                    <span className="font-mono font-bold">${item.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 flex justify-between">
                    <span>{item.product.brand} - {item.product.flavor || 'Original'}</span>
                    <span>@${item.unitPrice.toFixed(2)} c/u</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-1 text-right text-[11px] text-black">
            <div className="flex justify-between text-gray-700">
              <span>SUBTOTAL:</span>
              <span>${sale.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>I.V.A. (16%):</span>
              <span>${sale.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200 text-black">
              <span>TOTAL A PAGAR:</span>
              <span className="text-base font-mono">${sale.total.toFixed(2)} MXN</span>
            </div>

            <div className="flex justify-between text-gray-800 pt-1 text-[11px]">
              <span className="capitalize">PAGO ({sale.paymentMethod}):</span>
              <span className="font-mono">${sale.amountPaid.toFixed(2)}</span>
            </div>
            {sale.paymentMethod === 'cash' && (
              <div className="flex justify-between text-gray-900 font-bold text-[11px]">
                <span>CAMBIO ENTREGADO:</span>
                <span className="font-mono">${sale.changeGiven.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="pt-4 text-center space-y-2 text-black">
            <div className="flex justify-center my-1">
              <BarcodeSVG value={sale.folio || 'FOLIO-000'} height={34} fontSize={10} className="w-52 max-w-full" />
            </div>
            <p className="text-[10px] font-bold text-gray-800">
              ¡GRACIAS POR ENTRENAR CON LAS LEYENDAS!
            </p>
            <p className="text-[9px] text-gray-600">
              Conserva este ticket para cualquier aclaración o garantía.
            </p>
          </div>

        </div>

        {/* Action Buttons (Excluded from print) */}
        <div className="p-4 bg-gym-surface/80 border-t border-gym-border flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 text-xs font-semibold text-gym-muted hover:text-white transition-colors"
          >
            Cerrar
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket Térmico</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
