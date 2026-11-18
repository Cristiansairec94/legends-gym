/**
 * Shared runtime mode detection helpers so App, GymContext, and Terminal components
 * consistently identify standalone Turnstile Terminal vs ERP / Clients windows.
 */
export function isClientsMode(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('mode') === 'clients' || searchParams.get('tab') === 'clients';
}

export function isTerminalMode(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  const queryMode = searchParams.get('mode');
  if (queryMode === 'main' || queryMode === 'pos' || searchParams.get('tab') === 'pos') return false;
  if (queryMode === 'terminal' || searchParams.get('terminal') === 'true') return true;
  const electronAppMode = (window as any).electronAPI?.appMode;
  if (electronAppMode === 'main') return false;
  if (electronAppMode === 'terminal') return true;
  const fileName = window.location.pathname.split('/').pop()?.toLowerCase() || '';
  if (fileName.includes('terminal')) return true;
  if (window.location.hash.includes('terminal')) return true;
  if (
    localStorage.getItem('legends_device_mode') === 'main' ||
    localStorage.getItem('legends_device_mode') === 'pos'
  ) {
    return false;
  }
  if (localStorage.getItem('legends_device_mode') === 'terminal') return true;
  return false;
}
