import React, { useRef } from 'react';
import { Client } from '../../types';
import { getGymAvatar, getOfflineGymSvgAvatar, detectGender } from '../../utils/genderAvatar';
import { encodeBarcodeCode128 } from '../../utils/barcode';
import { getMembershipStatus } from '../../utils/membershipUtils';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  CheckCircle2, 
  Fingerprint, 
  QrCode, 
  ShieldCheck, 
  Award,
  Crown,
  Calendar,
  Flame
} from 'lucide-react';

interface ClientCredentialModalProps {
  client: Client;
  onClose: () => void;
}

export const ClientCredentialModal: React.FC<ClientCredentialModalProps> = ({
  client,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const { isExpired, isExpiring: isExpiringSoon, daysRemaining: calcDays } = getMembershipStatus(client.membership);
  const isVip = client.membership.planType === 'vip' || client.membership.planName.toLowerCase().includes('vip') || client.membership.planName.toLowerCase().includes('black');

  // Generate barcode
  const barcode = encodeBarcodeCode128(client.id || 'MEM-000');

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏋️ *FITNESS LEGENDS PRO GYM* 🏋️\n` +
      `*Credencial Digital de Socio*\n\n` +
      `👤 *Socio:* ${client.fullName}\n` +
      `🆔 *ID:* ${client.id}\n` +
      `📋 *DNI:* ${client.documentId}\n` +
      `⭐ *Membresía:* ${client.membership.planName}\n` +
      `📅 *Vigencia:* ${client.membership.startDate} al ${client.membership.endDate}\n` +
      `🔒 *Huella Biometríca:* ${client.biometricRegistered ? 'Activa & Enrolada ✅' : 'Pendiente en Recepción'}\n\n` +
      `_¡Presenta esta credencial o tu huella en el torniquete de acceso!_`
    );
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-[#0f1015] rounded-3xl border border-gym-border/80 w-full max-w-xl overflow-hidden shadow-2xl relative my-6 print:border-none print:shadow-none print:m-0 print:w-full">
        
        {/* Modal Top Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gym-border/60 bg-[#14151d] print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Credencial Digital de Acceso
              </h2>
              <p className="text-[11px] text-gym-muted">Pase oficial para torniquetes y validación en mostrador</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
              title="Imprimir Credencial"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-colors"
              title="Enviar por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-gym-surface hover:bg-zinc-800 text-gym-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Credential Card Content */}
        <div className="p-6 flex flex-col items-center">
          
          {/* Printable Card Container */}
          <div 
            ref={cardRef}
            className={`w-full max-w-md rounded-3xl p-6 relative overflow-hidden transition-all duration-300 shadow-2xl border ${
              isVip 
                ? 'bg-gradient-to-br from-[#1c1608] via-[#0f1118] to-[#08090d] border-amber-500/50 shadow-amber-500/10'
                : 'bg-gradient-to-br from-[#121622] via-[#0d0f15] to-[#07080b] border-zinc-700/60 shadow-black/60'
            }`}
          >
            {/* Background Texture / Accent Highlights */}
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Top Gym Badge & Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-lg shadow-glow-gold">
                  FL
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white tracking-widest uppercase">
                      LEGENDS
                    </span>
                    <span className="text-sm font-black text-amber-400 tracking-wider">
                      PRO GYM
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-gym-muted uppercase tracking-widest">
                    Official Member Pass
                  </p>
                </div>
              </div>

              {/* VIP or Member Badge */}
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 border border-amber-500/40 text-[10px] font-black uppercase text-amber-400 shadow-sm">
                {isVip ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>BLACK VIP</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5 text-blue-400" />
                    <span>MEMBER</span>
                  </>
                )}
              </div>
            </div>

            {/* Member Profile Main Block */}
            <div className="flex items-center gap-4 py-5 relative z-10">
              {/* Photo with Glowing Halo */}
              <div className="relative shrink-0">
                <img
                  src={getGymAvatar(client.fullName, client.avatarUrl, client.gender)}
                  alt={client.fullName}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getOfflineGymSvgAvatar(detectGender(client.fullName));
                  }}
                  className={`w-20 h-20 rounded-2xl object-cover border-2 shadow-xl ${
                    isExpired
                      ? 'border-red-500 ring-2 ring-red-500/30'
                      : isExpiringSoon
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-emerald-400 ring-2 ring-emerald-400/30'
                  }`}
                />
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f1118] flex items-center justify-center ${
                  isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-400' : 'bg-emerald-500'
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5 text-black stroke-[3]" />
                </span>
              </div>

              {/* Information */}
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-lg font-black text-white leading-tight truncate">
                  {client.fullName}
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    ID: {client.id}
                  </span>
                  <span className="font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    DNI: {client.documentId}
                  </span>
                </div>

                <p className="text-xs font-semibold text-emerald-400 truncate pt-0.5">
                  {client.membership.planName}
                </p>
              </div>
            </div>

            {/* Validity & Biometric Strip */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-black/50 border border-white/10 relative z-10 mb-4">
              <div>
                <span className="text-[10px] text-gym-muted block uppercase font-bold tracking-wider">Vigencia</span>
                <span className="text-xs font-black text-white font-mono block">
                  Hasta {client.membership.endDate}
                </span>
                <span className={`text-[10px] font-bold ${
                  isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {calcDays >= 0 
                    ? `${calcDays} días restantes` 
                    : `Venció hace ${Math.abs(calcDays)} días`}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gym-muted block uppercase font-bold tracking-wider">Acceso Torniquete</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Fingerprint className={`w-3.5 h-3.5 ${client.biometricRegistered ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className={`text-xs font-bold ${client.biometricRegistered ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {client.biometricRegistered ? 'Huella Enrolada' : 'Sin Enrolar'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  {client.checkInsCount} asistencias registradas
                </span>
              </div>
            </div>

            {/* Optical Barcode (Code 128) Render */}
            <div className="p-3 bg-white rounded-xl flex flex-col items-center justify-center relative z-10">
              <svg 
                viewBox={`0 0 ${barcode.totalWidth} 42`} 
                className="w-full h-11"
                preserveAspectRatio="none"
              >
                {barcode.bars.map((bar, index) => (
                  <rect
                    key={index}
                    x={bar.x}
                    y={0}
                    width={bar.width}
                    height={42}
                    fill="#000000"
                  />
                ))}
              </svg>
              <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-black mt-1 uppercase">
                *{client.id}*
              </span>
            </div>

            {/* Bottom Security Watermark */}
            <div className="flex items-center justify-between mt-3 text-[9px] text-zinc-500 font-mono relative z-10">
              <span>SECURITY HASH: {client.biometricHash || client.id}</span>
              <span>TORNIQUETE AUTORIZADO</span>
            </div>
          </div>

          <p className="text-xs text-gym-muted mt-4 text-center max-w-sm">
            Esta credencial puede imprimirse en PVC o enviarse como comprobante digital al teléfono celular del socio.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#14151d] border-t border-gym-border/60 flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gym-surface hover:bg-zinc-800 text-xs font-bold text-white transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
