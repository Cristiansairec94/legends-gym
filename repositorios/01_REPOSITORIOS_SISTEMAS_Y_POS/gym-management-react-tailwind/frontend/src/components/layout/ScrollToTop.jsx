import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll to the top of the page whenever the route path changes. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}
