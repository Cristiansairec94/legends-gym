import { useEffect, useRef, useState } from 'react';

/**
 * Full-site animated Vanta.NET background.
 * Rendered once (in PublicLayout) as a fixed layer behind all content, so the
 * animation shows through every translucent section across the whole website.
 * three + vanta load lazily; on any failure we fall back to a static gradient.
 */
export default function SiteBackground() {
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
          points: 11.0,
          maxDistance: 24.0,
          spacing: 17.0,
        });
      } catch {
        if (mounted) setFailed(true);
      }
    })();
    return () => {
      mounted = false;
      if (effectRef.current) { effectRef.current.destroy(); effectRef.current = null; }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* Vanta canvas mounts here */}
      <div
        ref={ref}
        className="h-full w-full opacity-60"
        style={failed ? { background: 'radial-gradient(circle at 30% 10%, #16161a, #0a0a0b)' } : undefined}
      />
      {/* Dark veil keeps text readable over the animation */}
      <div className="absolute inset-0 bg-ink-950/55" />
    </div>
  );
}
