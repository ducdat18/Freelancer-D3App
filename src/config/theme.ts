import { createTheme } from '@mui/material/styles'

// SCI-FI Theme: Neon cyan/violet/magenta with glassmorphism
export const cryptoTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ffc3', // Neon cyan
      light: '#5cffda',
      dark: '#00c896',
      contrastText: '#070511',
    },
    secondary: {
      main: '#8084ee', // Violet
      light: '#a5a8f3',
      dark: '#5c60c9',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#070511', // Deep space
      paper: '#0b192a', // Dark navy
    },
    text: {
      primary: '#e0e6ed',
      secondary: 'rgba(224, 230, 237, 0.6)',
    },
    success: {
      main: '#00ffc3',
      dark: '#00c896',
      light: '#5cffda',
    },
    error: {
      main: '#ff00ff', // Magenta
      dark: '#cc00cc',
      light: '#ff55ff',
    },
    warning: {
      main: '#e04d01', // Neon orange
      dark: '#b33d00',
      light: '#ff7033',
    },
    info: {
      main: '#8084ee',
      dark: '#5c60c9',
      light: '#a5a8f3',
    },
    divider: 'rgba(0, 255, 195, 0.1)',
  },
  typography: {
    fontFamily: '"Rajdhani", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      fontWeight: 700,
      fontSize: '3.5rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h2: {
      fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '0.03em',
    },
    h3: {
      fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      fontWeight: 600,
      fontSize: '2rem',
      letterSpacing: '0.02em',
    },
    h4: {
      fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '0.02em',
    },
    h5: {
      fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      letterSpacing: '0.01em',
    },
    h6: {
      fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      letterSpacing: '0.01em',
    },
    button: {
      fontFamily: '"Rajdhani", sans-serif',
      textTransform: 'uppercase' as const,
      fontWeight: 600,
      letterSpacing: '0.08em',
      fontSize: '0.9rem',
    },
    body1: {
      fontFamily: '"Rajdhani", sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: '"Rajdhani", sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontFamily: '"Rajdhani", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      fontSize: '0.75rem',
    },
    subtitle1: {
      fontFamily: '"Rajdhani", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    subtitle2: {
      fontFamily: '"Rajdhani", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    overline: {
      fontFamily: '"Orbitron", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: `
            radial-gradient(circle, rgba(0,255,195,0.045) 1px, transparent 1px) 0 0 / 30px 30px,
            radial-gradient(ellipse at 15% 35%, rgba(0, 255, 195, 0.07) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 15%, rgba(128, 132, 238, 0.07) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 90%, rgba(255, 0, 255, 0.04) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 60%, rgba(0, 255, 195, 0.03) 0%, transparent 35%),
            #070511
          `,
          backgroundAttachment: 'fixed',
        },
        '*::-webkit-scrollbar': {
          width: '6px',
          height: '6px',
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(0, 255, 195, 0.2)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(0, 255, 195, 0.4)',
          },
        },
        '::selection': {
          background: 'rgba(0, 255, 195, 0.3)',
          color: '#e0e6ed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '10px 24px',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          position: 'relative' as const,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            transition: 'left 0.5s ease',
          },
          '&:hover::before': {
            left: '100%',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #00ffc3 0%, #00c896 100%)',
          color: '#070511',
          border: '1px solid rgba(0, 255, 195, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5cffda 0%, #00ffc3 100%)',
            boxShadow: '0 0 20px rgba(0, 255, 195, 0.3), 0 0 40px rgba(0, 255, 195, 0.1)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #8084ee 0%, #5c60c9 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(128, 132, 238, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #a5a8f3 0%, #8084ee 100%)',
            boxShadow: '0 0 20px rgba(128, 132, 238, 0.3), 0 0 40px rgba(128, 132, 238, 0.1)',
          },
        },
        containedError: {
          background: 'linear-gradient(135deg, #ff00ff 0%, #cc00cc 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 0, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ff55ff 0%, #ff00ff 100%)',
            boxShadow: '0 0 20px rgba(255, 0, 255, 0.3), 0 0 40px rgba(255, 0, 255, 0.1)',
          },
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #00ffc3 0%, #00c896 100%)',
          color: '#070511',
          border: '1px solid rgba(0, 255, 195, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5cffda 0%, #00ffc3 100%)',
            boxShadow: '0 0 20px rgba(0, 255, 195, 0.3), 0 0 40px rgba(0, 255, 195, 0.1)',
          },
        },
        containedWarning: {
          background: 'linear-gradient(135deg, #e04d01 0%, #b33d00 100%)',
          color: '#FFFFFF',
          border: '1px solid rgba(224, 77, 1, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ff7033 0%, #e04d01 100%)',
            boxShadow: '0 0 20px rgba(224, 77, 1, 0.3), 0 0 40px rgba(224, 77, 1, 0.1)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 255, 195, 0.3)',
          color: '#00ffc3',
          borderWidth: 1,
          '&:hover': {
            borderColor: '#00ffc3',
            borderWidth: 1,
            backgroundColor: 'rgba(0, 255, 195, 0.08)',
            boxShadow: '0 0 15px rgba(0, 255, 195, 0.15), inset 0 0 15px rgba(0, 255, 195, 0.05)',
          },
        },
        outlinedSecondary: {
          borderColor: 'rgba(128, 132, 238, 0.3)',
          color: '#8084ee',
          '&:hover': {
            borderColor: '#8084ee',
            backgroundColor: 'rgba(128, 132, 238, 0.08)',
            boxShadow: '0 0 15px rgba(128, 132, 238, 0.15)',
          },
        },
        text: {
          color: '#e0e6ed',
          '&:hover': {
            backgroundColor: 'rgba(0, 255, 195, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(11, 25, 42, 0.8) 0%, rgba(7, 5, 17, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 195, 0.08)',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 255, 195, 0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(0, 255, 195, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 195, 0.08), inset 0 1px 0 rgba(0, 255, 195, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'linear-gradient(135deg, rgba(11, 25, 42, 0.85) 0%, rgba(7, 5, 17, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 195, 0.08)',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.3)',
        },
        elevation1: {
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.3)',
        },
        elevation2: {
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(180deg, rgba(7, 5, 17, 0.95) 0%, rgba(11, 25, 42, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 255, 195, 0.15)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 195, 0.03)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontFamily: '"Rajdhani", sans-serif',
          letterSpacing: '0.04em',
        },
        filled: {
          background: 'rgba(0, 255, 195, 0.1)',
          color: '#00ffc3',
          border: '1px solid rgba(0, 255, 195, 0.15)',
        },
        outlined: {
          borderColor: 'rgba(0, 255, 195, 0.3)',
          color: '#00ffc3',
        },
        colorSuccess: {
          background: 'rgba(0, 255, 195, 0.12)',
          color: '#00ffc3',
          borderColor: 'rgba(0, 255, 195, 0.3)',
        },
        colorError: {
          background: 'rgba(255, 0, 255, 0.12)',
          color: '#ff55ff',
          borderColor: 'rgba(255, 0, 255, 0.3)',
        },
        colorWarning: {
          background: 'rgba(224, 77, 1, 0.12)',
          color: '#ff7033',
          borderColor: 'rgba(224, 77, 1, 0.3)',
        },
        colorInfo: {
          background: 'rgba(128, 132, 238, 0.12)',
          color: '#a5a8f3',
          borderColor: 'rgba(128, 132, 238, 0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: '"Rajdhani", sans-serif',
            '& fieldset': {
              borderColor: 'rgba(0, 255, 195, 0.15)',
              borderWidth: 1,
              transition: 'all 0.3s ease',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 255, 195, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00ffc3',
              boxShadow: '0 0 12px rgba(0, 255, 195, 0.15), inset 0 0 12px rgba(0, 255, 195, 0.05)',
            },
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Rajdhani", sans-serif',
            letterSpacing: '0.04em',
            '&.Mui-focused': {
              color: '#00ffc3',
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
          backgroundColor: 'rgba(0, 255, 195, 0.08)',
        },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #00ffc3 0%, #8084ee 50%, #ff00ff 100%)',
          boxShadow: '0 0 10px rgba(0, 255, 195, 0.3)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(135deg, rgba(11, 25, 42, 0.95) 0%, rgba(7, 5, 17, 0.98) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(0, 255, 195, 0.15)',
          boxShadow: '0 8px 48px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 195, 0.05)',
        },
        root: {
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(7, 5, 17, 0.8)',
            backdropFilter: 'blur(8px)',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 255, 195, 0.1)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#00ffc3',
          height: 2,
          boxShadow: '0 0 8px rgba(0, 255, 195, 0.5)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: 'rgba(224, 230, 237, 0.5)',
          transition: 'all 0.3s ease',
          '&.Mui-selected': {
            color: '#00ffc3',
          },
          '&:hover': {
            color: '#00ffc3',
            backgroundColor: 'rgba(0, 255, 195, 0.05)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid',
          backdropFilter: 'blur(10px)',
          fontFamily: '"Rajdhani", sans-serif',
        },
        standardSuccess: {
          backgroundColor: 'rgba(0, 255, 195, 0.08)',
          borderColor: 'rgba(0, 255, 195, 0.2)',
          color: '#00ffc3',
          '& .MuiAlert-icon': {
            color: '#00ffc3',
          },
        },
        standardError: {
          backgroundColor: 'rgba(255, 0, 255, 0.08)',
          borderColor: 'rgba(255, 0, 255, 0.2)',
          color: '#ff55ff',
          '& .MuiAlert-icon': {
            color: '#ff00ff',
          },
        },
        standardWarning: {
          backgroundColor: 'rgba(224, 77, 1, 0.08)',
          borderColor: 'rgba(224, 77, 1, 0.2)',
          color: '#ff7033',
          '& .MuiAlert-icon': {
            color: '#e04d01',
          },
        },
        standardInfo: {
          backgroundColor: 'rgba(128, 132, 238, 0.08)',
          borderColor: 'rgba(128, 132, 238, 0.2)',
          color: '#a5a8f3',
          '& .MuiAlert-icon': {
            color: '#8084ee',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          background: 'rgba(11, 25, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 255, 195, 0.15)',
          borderRadius: 6,
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 500,
          letterSpacing: '0.02em',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        },
        arrow: {
          color: 'rgba(11, 25, 42, 0.95)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, rgba(7, 5, 17, 0.98) 0%, rgba(11, 25, 42, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(0, 255, 195, 0.1)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(0, 255, 195, 0.2)',
          background: 'linear-gradient(135deg, rgba(0, 255, 195, 0.15) 0%, rgba(128, 132, 238, 0.15) 100%)',
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(0, 255, 195, 0.08)',
            boxShadow: '0 0 12px rgba(0, 255, 195, 0.15)',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#00ffc3',
            '& + .MuiSwitch-track': {
              backgroundColor: 'rgba(0, 255, 195, 0.3)',
            },
          },
        },
        track: {
          backgroundColor: 'rgba(224, 230, 237, 0.2)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: 'rgba(0, 255, 195, 0.08)',
          fontFamily: '"Rajdhani", sans-serif',
        },
        head: {
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 600,
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'rgba(0, 255, 195, 0.7)',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        colorPrimary: {
          color: '#00ffc3',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 255, 195, 0.05)',
        },
      },
    },
  },
})
