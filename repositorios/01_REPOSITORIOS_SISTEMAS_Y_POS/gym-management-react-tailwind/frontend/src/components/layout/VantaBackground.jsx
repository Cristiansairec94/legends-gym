import { useEffect, useRef, useState } from 'react';

/**
 * Vanta.js animated background with correct cleanup + graceful fallback.
 * Loads three + vanta lazily so a failure never breaks the page.
 */
export default function VantaBackground({ className = '', children }) {
  const ref = useRef(null);
  const effectRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const THREE = await import('three');
        const NET = (await import('vanta/dist/vanta.net.min')).default;
        if (!mounted || !ref.current || effectRef.current) return;
        effectRef.current = NET({
          el: ref.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0xe11d2a,
          backgroundColor: 0x0a0a0b,
          points: 10.0,
          maxDistance: 22.0,
          spacing: 18.0,
        });
      } catch (err) {
        if (mounted) setFailed(true);
      }
    })();

    return () => {
      mounted = false;
      if (effectRef.current) {
        effectRef.current.destroy();
        effectRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      // Fallback gradient shows if Vanta fails or before it loads
      style={failed ? { background: 'radial-gradient(circle at 30% 20%, #1c1c20, #0a0a0b)' } : undefined}
    >
      {children}
    </div>
  );
}
