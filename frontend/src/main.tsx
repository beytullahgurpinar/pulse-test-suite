import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { CssVarsProvider, getInitColorSchemeScript } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { theme, modeStorageKey } from './theme';
import { router } from './routes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      {getInitColorSchemeScript({ defaultMode: 'system', modeStorageKey })}
      <CssVarsProvider theme={theme} modeStorageKey={modeStorageKey} defaultMode="system">
        <CssBaseline />
        <RouterProvider router={router} />
      </CssVarsProvider>
    </>
  </StrictMode>,
);
