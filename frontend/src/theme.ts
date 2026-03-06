import { extendTheme } from '@mui/joy/styles';

export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        neutral: {
          50: '#f8f9fc',
          100: '#f1f3f9',
          200: '#e4e8f1',
          300: '#d1d7e4',
          400: '#a8b1c4',
          500: '#7c859a',
          600: '#5f6779',
          700: '#474e5e',
          800: '#333845',
          900: '#1e222b',
        },
        background: {
          body: '#f5f7fb',
          surface: '#ffffff',
          level1: '#fafbfe',
          level2: '#f1f3f9',
          level3: '#e4e8f1',
        },
        text: {
          primary: '#1a1d26',
          secondary: '#5f6779',
          tertiary: '#8b93a7',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          50: '#1a1f35',
          100: '#1e2747',
          200: '#253463',
          300: '#3451a0',
          400: '#4c6ef5',
          500: '#5c7cfa',
          600: '#748ffc',
          700: '#91a7ff',
          800: '#bac8ff',
          900: '#dbe4ff',
        },
        neutral: {
          50: '#0e1117',
          100: '#13161e',
          200: '#1a1e28',
          300: '#252a36',
          400: '#363d4e',
          500: '#5a6277',
          600: '#8b93a7',
          700: '#a8b1c4',
          800: '#d1d7e4',
          900: '#e8ecf4',
        },
        background: {
          body: '#0c0f16',
          surface: '#12151e',
          level1: '#161a24',
          level2: '#1a1e28',
          level3: '#1f2430',
        },
        text: {
          primary: '#e8ecf4',
          secondary: '#8b93a7',
          tertiary: '#5a6277',
        },
      },
    },
  },
  fontFamily: {
    body: '"Inter", system-ui, -apple-system, sans-serif',
    display: '"Inter", system-ui, -apple-system, sans-serif',
  },
  fontSize: {
    xs: '0.7rem',
    sm: '0.8rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
    xl2: '1.25rem',
    xl3: '1.5rem',
    xl4: '2rem',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadow: {
    xs: '0 1px 2px rgba(0,0,0,0.04)',
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.04)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.03)',
  },
  cssVarPrefix: 'joy',
  components: {
    JoyButton: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: '8px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    JoyCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    JoySheet: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
  },
});

export const modeStorageKey = 'zotlo-color-mode';
