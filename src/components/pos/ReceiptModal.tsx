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
                margin: 0;
              }
              @media print {
                html, body {
                  width: 78mm !important;
                  margin: 0 auto !important;
                  padding: 4mm 2.5mm !important;
                  background: #ffffff !important;
                  color: #000000 !important;
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
                font-family: 'Courier New', Courier, monospace, system-ui;
                font-size: 11px;
                line-height: 1.35;
                color: #000000;
                background: #ffffff;
                width: 78mm;
                margin: 0 auto;
                padding: 4mm 2.5mm;
              }
              .receipt-logo {
                width: 52px !important;
                height: 52px !important;
                max-width: 52px !important;
                max-height: 52px !important;
                object-fit: contain !important;
                border-radius: 50% !important;
                background: #000000 !important;
                padding: 3px !important;
                display: block !important;
                margin: 0 auto 4px auto !important;
              }
              .receipt-divider {
                border-bottom: 1px dashed #444444;
                margin: 6px 0;
              }
              .receipt-divider-thick {
                border-bottom: 2px dashed #000000;
                margin: 6px 0;
              }
              svg {
                display: block !important;
                margin: 2px auto !important;
                max-width: 170px !important;
                height: 32px !important;
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
          className="p-5 bg-white text-black font-mono text-xs select-none print:p-3 print:w-[78mm] print:max-w-[80mm] print:mx-auto print:my-0 print:border print:border-dashed print:border-gray-400 print:block" 
          id="printable-receipt"
        >
          
          {/* Header */}
          <div className="text-center pb-2">
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <img 
                src={logoImg} 
                alt="Logo LEYENDS" 
                className="receipt-logo"
                style={{
                  width: '52px',
                  height: '52px',
                  maxWidth: '52px',
                  maxHeight: '52px',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  background: '#000000',
                  padding: '3px',
                  display: 'inline-block',
                  margin: '0 auto 4px auto'
                }} 
              />
              <h2 style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.5px', marginTop: '2px', textTransform: 'uppercase', color: '#000000' }}>
                LEYENDS FITNESS GYM
              </h2>
              <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#222222', marginTop: '1px' }}>
                SUCURSAL CENTRAL FITNESS
              </p>
              <p style={{ fontSize: '9.5px', color: '#555555' }}>
                Blvd. de los Campeones #500
              </p>
              <p style={{ fontSize: '9px', color: '#666666' }}>
                RFC: LEY-920311-GYM • Tel: (55) 1234-5678
              </p>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #444444', margin: '6px 0' }} className="receipt-divider" />

          {/* Folio & Metadata */}
          <div style={{ fontSize: '10.5px', lineHeight: '1.45', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>FOLIO:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{sale.folio}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>FECHA:</span>
              <span>{new Date(sale.timestamp).toLocaleString('es-MX')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>CLIENTE:</span>
              <span style={{ fontWeight: 'bold' }}>{sale.clientName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>ATENDIÓ:</span>
              <span>{sale.cashierName}</span>
            </div>
          </div>

          <div style={{ borderBottom: '2px dashed #000000', margin: '6px 0' }} className="receipt-divider-thick" />

          {/* Line Items Table */}
          <div style={{ color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10.5px', paddingBottom: '3px', borderBottom: '1px solid #dddddd', marginBottom: '5px' }}>
              <span>CANT. ARTÍCULO</span>
              <span>TOTAL</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
              {sale.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 'bold', textAlign: 'left', paddingRight: '8px' }}>
                      {item.quantity}x {item.product.name}
                    </span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555555', marginTop: '1px' }}>
                    <span>{item.product.brand} - {item.product.flavor || 'Original'}</span>
                    <span>@${item.unitPrice.toFixed(2)} c/u</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderBottom: '2px dashed #000000', margin: '6px 0' }} className="receipt-divider-thick" />

          {/* Financial Totals */}
          <div style={{ fontSize: '11px', lineHeight: '1.45', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555555', marginBottom: '2px' }}>
              <span>SUBTOTAL:</span>
              <span style={{ fontFamily: 'monospace' }}>${sale.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555555', marginBottom: '2px' }}>
              <span>I.V.A. (16%):</span>
              <span style={{ fontFamily: 'monospace' }}>${sale.tax.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '13.5px', borderTop: '1px solid #000000', paddingTop: '4px', marginTop: '4px', color: '#000000' }}>
              <span>TOTAL A PAGAR:</span>
              <span style={{ fontFamily: 'monospace' }}>${sale.total.toFixed(2)} MXN</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333333', fontSize: '10.5px', marginTop: '4px' }}>
              <span style={{ textTransform: 'capitalize' }}>PAGO ({sale.paymentMethod}):</span>
              <span style={{ fontFamily: 'monospace' }}>${sale.amountPaid.toFixed(2)}</span>
            </div>
            {sale.paymentMethod === 'cash' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', color: '#000000', marginTop: '2px' }}>
                <span>CAMBIO ENTREGADO:</span>
                <span style={{ fontFamily: 'monospace' }}>${sale.changeGiven.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div style={{ borderBottom: '1px dashed #444444', margin: '6px 0' }} className="receipt-divider" />

          {/* Barcode & Footer */}
          <div style={{ textAlign: 'center', marginTop: '6px', color: '#000000' }}>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '4px auto', maxWidth: '170px' }}>
              <BarcodeSVG value={sale.folio || 'FOLIO-000'} height={32} fontSize={10} showText={false} className="w-44 max-w-full mx-auto" />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'monospace', margin: '2px 0 6px 0' }}>
              * {sale.folio} *
            </p>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#111111', marginBottom: '2px' }}>
              ¡GRACIAS POR ENTRENAR CON LAS LEYENDAS!
            </p>
            <p style={{ fontSize: '8.5px', color: '#666666' }}>
              Conserva este ticket para cualquier aclaración o garantía.
            </p>
          </div>

        </div>

        {/* Action Buttons (Excluded from print) */}
        <div className="p-4 bg-gym-surface/80 border-t border-gym-border flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 text-xs font-semibold text-gym-muted hover:text-white transition-colors cursor-pointer"
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
