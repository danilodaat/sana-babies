import { useEffect, useState } from 'react';

/**
 * false durante los primeros `ms` después de montar. Las tarjetas lo usan para
 * ignorar el toque que las abrió: si el navegador dispara un clic tardío en el
 * mismo punto, no debe apretar un botón de la tarjeta recién aparecida.
 */
export function useArmed(ms = 400) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return armed;
}
