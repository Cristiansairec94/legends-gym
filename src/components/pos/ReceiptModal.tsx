import React from 'react';
import { Sale } from '../../types';
import { X, Printer, CheckCircle2, Dumbbell } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-md overflow-hidden shadow-2xl relative my-6">
        
        {/* Top Action Bar */}
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
        <div className="p-6 bg-white text-black font-mono text-xs select-none" id="printable-receipt">
          
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-dashed border-gray-400">
            <div className="flex flex-col items-center justify-center gap-1 mb-1.5">
              <div className="w-14 h-14 bg-black rounded-full p-1 flex items-center justify-center">
                <img src="/logo.png" alt="Logo LEYENDS" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-base font-black tracking-wider">LEYENDS FITNESS GYM</h2>
            </div>
            <p className="text-[11px] font-bold text-gray-700">SUCURSAL CENTRAL FITNESS</p>
            <p className="text-[10px] text-gray-600">Blvd. de los Campeones #500</p>
            <p className="text-[10px] text-gray-600">RFC: LEY-920311-GYM • Tel: (55) 1234-5678</p>
          </div>

          {/* Folio & Metadata */}
          <div className="py-3 border-b border-dashed border-gray-300 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold">FOLIO:</span>
              <span>{sale.folio}</span>
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
          <div className="py-3 border-b-2 border-dashed border-gray-400">
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
          <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-1 text-right text-[11px]">
            <div className="flex justify-between text-gray-600">
              <span>SUBTOTAL:</span>
              <span>${sale.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>I.V.A. (16%):</span>
              <span>${sale.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200">
              <span>TOTAL A PAGAR:</span>
              <span className="text-base">${sale.total.toFixed(2)} MXN</span>
            </div>

            <div className="flex justify-between text-gray-700 pt-1 text-[11px]">
              <span className="capitalize">PAGO ({sale.paymentMethod}):</span>
              <span>${sale.amountPaid.toFixed(2)}</span>
            </div>
            {sale.paymentMethod === 'cash' && (
              <div className="flex justify-between text-gray-800 font-bold text-[11px]">
                <span>CAMBIO ENTREGADO:</span>
                <span>${sale.changeGiven.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="pt-4 text-center space-y-2">
            {/* Visual Simulated Barcode */}
            <div className="inline-block tracking-widest text-[9px] bg-black text-white px-3 py-1 font-mono font-bold">
              ||| | || |||| | ||| || |||| | ||
            </div>
            <p className="text-[10px] font-mono tracking-widest text-gray-600">
              *{sale.folio}*
            </p>
            <p className="text-[10px] font-bold text-gray-700">
              ¡GRACIAS POR ENTRENAR CON LAS LEYENDAS!
            </p>
            <p className="text-[9px] text-gray-500">
              Conserva este ticket para cualquier aclaración.
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
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket Térmico</span>
          </button>
        </div>

      </div>
    </div>
  );
};
