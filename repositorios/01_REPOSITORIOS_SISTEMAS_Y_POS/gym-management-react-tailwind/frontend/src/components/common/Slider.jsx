import { useEffect, useRef, useState, Children } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Lightweight, dependency-free slider/carousel.
 * - responsive items-per-view (1 / 2 / 3)
 * - autoplay with pause-on-hover
 * - arrows + dot pagination
 * Usage: <Slider>{items.map(...)}</Slider>
 */
export default function Slider({ children, autoPlay = true, interval = 4500, className = '' }) {
  const slides = Children.toArray(children);
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const hovering = useRef(false);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const maxIndex = Math.max(0, slides.length - perView);
  useEffect(() => { if (index > maxIndex) setIndex(maxIndex); }, [maxIndex, index]);

  useEffect(() => {
    if (!autoPlay || slides.length <= perView) return;
    const t = setInterval(() => {
      if (!hovering.current) setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, interval);
    return () => clearInterval(t);
  }, [autoPlay, interval, maxIndex, perView, slides.length]);

  const go = (i) => setIndex(Math.min(maxIndex, Math.max(0, i)));
  const pages = maxIndex + 1;

  return (
    <div className={`relative ${className}`}
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}>
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * (100 / perView)}%)` }}>
          {slides.map((child, i) => (
            <div key={i} className="shrink-0 px-3" style={{ width: `${100 / perView}%` }}>
              {child}
            </div>
          ))}
        </div>
      </div>

      {slides.length > perView && (
        <>
          <button onClick={() => go(index - 1)} aria-label="Previous"
            className="absolute -left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-ink-700 bg-ink-900/90 text-gray-200 transition hover:border-brand hover:text-brand disabled:opacity-30"
            disabled={index === 0}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(index + 1)} aria-label="Next"
            className="absolute -right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-ink-700 bg-ink-900/90 text-gray-200 transition hover:border-brand hover:text-brand disabled:opacity-30"
            disabled={index === maxIndex}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-brand' : 'w-2 bg-ink-600 hover:bg-ink-500'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
