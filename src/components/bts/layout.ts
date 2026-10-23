import { createContext, useContext } from 'react';

/** Width class of the inspector's content area (it changes between overlay and docked modes). */
export const BtsWideContext = createContext(true);

export function useBtsWide(): boolean {
  return useContext(BtsWideContext);
}
