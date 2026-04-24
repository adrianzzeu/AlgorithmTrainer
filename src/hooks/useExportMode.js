import { useEffect, useState } from 'react';

function getInitialExportMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem('exportMode') === 'true';
}

export default function useExportMode() {
  const [isExportMode, setIsExportMode] = useState(getInitialExportMode);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = window.document.documentElement;
    root.classList.toggle('export-mode', isExportMode);
    window.localStorage.setItem('exportMode', String(isExportMode));
  }, [isExportMode]);

  const toggleExportMode = () => {
    setIsExportMode((current) => !current);
  };

  return [isExportMode, toggleExportMode];
}
