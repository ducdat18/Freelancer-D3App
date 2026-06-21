import { ThemeOptions } from '@mui/material/styles'

export const getThemeConfig = (mode: 'light' | 'dark'): ThemeOptions => {
  const isDark = mode === 'dark';
  
  // Neon colors
  const primaryMain = isDark ? '#00ffc3' : '#059669'; // Darker emerald for light mode
  const primaryLight = isDark ? '#5cffda' : '#10b981';
  const primaryDark = isDark ? '#00c896' : '#047857';
  
  const secondaryMain = isDark ? '#8084ee' : '#4f46e5'; // Stronger indigo for light mode
  const secondaryLight = isDark ? '#a5a8f3' : '#6366f1';
  const secondaryDark = isDark ? '#5c60c9' : '#3730a3';

  return {
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: isDark ? '#070511' : '#ffffff',
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: '#FFFFFF',
      },
      background: {
        default: isDark ? '#070511' : '#f1f5f9', // Slightly darker slate for better card contrast
        paper: isDark ? '#0b192a' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e0e6ed' : '#0f172a',
        secondary: isDark ? 'rgba(224, 230, 237, 0.6)' : '#475569', // Solid slate for better contrast
      },
      success: {
        main: primaryMain,
        dark: primaryDark,
        light: primaryLight,
      },
      error: {
        main: '#ff00ff',
        dark: '#cc00cc',
        light: '#ff55ff',
      },
      warning: {
        main: '#e04d01',
        dark: '#b33d00',
        light: '#ff7033',
      },
      info: {
        main: secondaryMain,
        dark: secondaryDark,
        light: secondaryLight,
      },
      divider: isDark ? 'rgba(0, 255, 195, 0.1)' : 'rgba(0, 166, 128, 0.1)',
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
            background: isDark 
              ? `
                radial-gradient(circle, rgba(0,255,195,0.045) 1px, transparent 1px) 0 0 / 30px 30px,
                radial-gradient(ellipse at 15% 35%, rgba(0, 255, 195, 0.07) 0%, transparent 45%),
                radial-gradient(ellipse at 85% 15%, rgba(128, 132, 238, 0.07) 0%, transparent 45%),
                radial-gradient(ellipse at 50% 90%, rgba(255, 0, 255, 0.04) 0%, transparent 40%),
                radial-gradient(ellipse at 70% 60%, rgba(0, 255, 195, 0.03) 0%, transparent 35%),
                #070511
              `
              : `
                radial-gradient(circle, rgba(0,166,128,0.03) 1px, transparent 1px) 0 0 / 30px 30px,
                radial-gradient(ellipse at 15% 35%, rgba(0, 166, 128, 0.05) 0%, transparent 45%),
                radial-gradient(ellipse at 85% 15%, rgba(99, 102, 241, 0.05) 0%, transparent 45%),
                radial-gradient(ellipse at 50% 90%, rgba(255, 0, 255, 0.02) 0%, transparent 40%),
                #f8fafc
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
            background: isDark ? 'rgba(0, 255, 195, 0.2)' : 'rgba(0, 166, 128, 0.2)',
            borderRadius: '3px',
            '&:hover': {
              background: isDark ? 'rgba(0, 255, 195, 0.4)' : 'rgba(0, 166, 128, 0.4)',
            },
          },
          '::selection': {
            background: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)',
            color: isDark ? '#e0e6ed' : '#0f172a',
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
            background: `linear-gradient(135deg, ${primaryMain} 0%, ${primaryDark} 100%)`,
            color: isDark ? '#070511' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)'}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryMain} 100%)`,
              boxShadow: isDark 
                ? '0 0 20px rgba(0, 255, 195, 0.3), 0 0 40px rgba(0, 255, 195, 0.1)'
                : '0 4px 12px rgba(0, 166, 128, 0.2)',
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${secondaryMain} 0%, ${secondaryDark} 100%)`,
            color: '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(128, 132, 238, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${secondaryLight} 0%, ${secondaryMain} 100%)`,
              boxShadow: isDark
                ? '0 0 20px rgba(128, 132, 238, 0.3), 0 0 40px rgba(128, 132, 238, 0.1)'
                : '0 4px 12px rgba(99, 102, 241, 0.2)',
            },
          },
          containedError: {
            background: 'linear-gradient(135deg, #ff00ff 0%, #cc00cc 100%)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 0, 255, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ff55ff 0%, #ff00ff 100%)',
              boxShadow: isDark
                ? '0 0 20px rgba(255, 0, 255, 0.3), 0 0 40px rgba(255, 0, 255, 0.1)'
                : '0 4px 12px rgba(255, 0, 255, 0.2)',
            },
          },
          containedSuccess: {
            background: `linear-gradient(135deg, ${primaryMain} 0%, ${primaryDark} 100%)`,
            color: isDark ? '#070511' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)'}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryMain} 100%)`,
              boxShadow: isDark
                ? '0 0 20px rgba(0, 255, 195, 0.3), 0 0 40px rgba(0, 255, 195, 0.1)'
                : '0 4px 12px rgba(0, 166, 128, 0.2)',
            },
          },
          containedWarning: {
            background: 'linear-gradient(135deg, #e04d01 0%, #b33d00 100%)',
            color: '#FFFFFF',
            border: '1px solid rgba(224, 77, 1, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ff7033 0%, #e04d01 100%)',
              boxShadow: isDark
                ? '0 0 20px rgba(224, 77, 1, 0.3), 0 0 40px rgba(224, 77, 1, 0.1)'
                : '0 4px 12px rgba(224, 77, 1, 0.2)',
            },
          },
          outlined: {
            borderColor: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)',
            color: primaryMain,
            borderWidth: 1,
            '&:hover': {
              borderColor: primaryMain,
              borderWidth: 1,
              backgroundColor: isDark ? 'rgba(0, 255, 195, 0.08)' : 'rgba(0, 166, 128, 0.08)',
              boxShadow: isDark
                ? '0 0 15px rgba(0, 255, 195, 0.15), inset 0 0 15px rgba(0, 255, 195, 0.05)'
                : '0 0 8px rgba(0, 166, 128, 0.1)',
            },
          },
          outlinedSecondary: {
            borderColor: isDark ? 'rgba(128, 132, 238, 0.3)' : 'rgba(99, 102, 241, 0.3)',
            color: secondaryMain,
            '&:hover': {
              borderColor: secondaryMain,
              backgroundColor: isDark ? 'rgba(128, 132, 238, 0.08)' : 'rgba(99, 102, 241, 0.08)',
              boxShadow: isDark ? '0 0 15px rgba(128, 132, 238, 0.15)' : '0 0 8px rgba(99, 102, 241, 0.1)',
            },
          },
          text: {
            color: isDark ? '#e0e6ed' : '#0f172a',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(0, 255, 195, 0.05)' : 'rgba(0, 166, 128, 0.05)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: isDark
              ? 'linear-gradient(135deg, rgba(11, 25, 42, 0.8) 0%, rgba(7, 5, 17, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(0, 255, 195, 0.08)' : '1px solid rgba(0, 166, 128, 0.1)',
            borderRadius: 12,
            boxShadow: isDark
              ? '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 255, 195, 0.05)'
              : '0 4px 20px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: isDark ? 'rgba(0, 255, 195, 0.25)' : 'rgba(0, 166, 128, 0.25)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 195, 0.08), inset 0 1px 0 rgba(0, 255, 195, 0.1)'
                : '0 8px 30px rgba(0, 0, 0, 0.1), 0 0 15px rgba(0, 166, 128, 0.05)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: isDark
              ? 'linear-gradient(135deg, rgba(11, 25, 42, 0.85) 0%, rgba(7, 5, 17, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(0, 255, 195, 0.08)' : '1px solid rgba(0, 166, 128, 0.1)',
            boxShadow: isDark ? '0 2px 16px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(0, 0, 0, 0.05)',
          },
          elevation1: {
            boxShadow: isDark ? '0 2px 16px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(0, 0, 0, 0.05)',
          },
          elevation2: {
            boxShadow: isDark ? '0 4px 24px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDark
              ? 'linear-gradient(180deg, rgba(7, 5, 17, 0.95) 0%, rgba(11, 25, 42, 0.9) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            borderBottom: isDark ? '1px solid rgba(0, 255, 195, 0.15)' : '1px solid rgba(0, 166, 128, 0.15)',
            boxShadow: isDark
              ? '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 195, 0.03)'
              : '0 4px 20px rgba(0, 0, 0, 0.05)',
            color: isDark ? '#e0e6ed' : '#0f172a',
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
            background: isDark ? 'rgba(0, 255, 195, 0.1)' : 'rgba(0, 166, 128, 0.1)',
            color: primaryMain,
            border: `1px solid ${isDark ? 'rgba(0, 255, 195, 0.15)' : 'rgba(0, 166, 128, 0.15)'}`,
          },
          outlined: {
            borderColor: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)',
            color: primaryMain,
          },
          colorSuccess: {
            background: isDark ? 'rgba(0, 255, 195, 0.12)' : 'rgba(0, 166, 128, 0.12)',
            color: primaryMain,
            borderColor: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)',
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
            background: isDark ? 'rgba(128, 132, 238, 0.12)' : 'rgba(99, 102, 241, 0.12)',
            color: isDark ? '#a5a8f3' : '#6366f1',
            borderColor: isDark ? 'rgba(128, 132, 238, 0.3)' : 'rgba(99, 102, 241, 0.3)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              fontFamily: '"Rajdhani", sans-serif',
              '& fieldset': {
                borderColor: isDark ? 'rgba(0, 255, 195, 0.15)' : 'rgba(0, 166, 128, 0.15)',
                borderWidth: 1,
                transition: 'all 0.3s ease',
              },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)',
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryMain,
                boxShadow: isDark
                  ? '0 0 12px rgba(0, 255, 195, 0.15), inset 0 0 12px rgba(0, 255, 195, 0.05)'
                  : '0 0 8px rgba(0, 166, 128, 0.1)',
              },
              '& input': {
                color: isDark ? '#e0e6ed' : '#0f172a',
              }
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Rajdhani", sans-serif',
              letterSpacing: '0.04em',
              color: isDark ? 'rgba(224, 230, 237, 0.6)' : 'rgba(15, 23, 42, 0.6)',
              '&.Mui-focused': {
                color: primaryMain,
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
            backgroundColor: isDark ? 'rgba(0, 255, 195, 0.08)' : 'rgba(0, 166, 128, 0.08)',
          },
          bar: {
            borderRadius: 4,
            background: isDark
              ? 'linear-gradient(90deg, #00ffc3 0%, #8084ee 50%, #ff00ff 100%)'
              : 'linear-gradient(90deg, #00a680 0%, #6366f1 50%, #ff00ff 100%)',
            boxShadow: isDark ? '0 0 10px rgba(0, 255, 195, 0.3)' : 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: isDark
              ? 'linear-gradient(135deg, rgba(11, 25, 42, 0.95) 0%, rgba(7, 5, 17, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.99) 100%)',
            backdropFilter: 'blur(30px)',
            border: isDark ? '1px solid rgba(0, 255, 195, 0.15)' : '1px solid rgba(0, 166, 128, 0.15)',
            boxShadow: isDark
              ? '0 8px 48px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 195, 0.05)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            color: isDark ? '#e0e6ed' : '#0f172a',
          },
          root: {
            '& .MuiBackdrop-root': {
              backgroundColor: isDark ? 'rgba(7, 5, 17, 0.8)' : 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(0, 255, 195, 0.1)' : 'rgba(0, 166, 128, 0.1)',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: primaryMain,
            height: 2,
            boxShadow: isDark ? `0 0 8px ${primaryMain}80` : 'none',
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
            color: isDark ? 'rgba(224, 230, 237, 0.5)' : 'rgba(15, 23, 42, 0.5)',
            transition: 'all 0.3s ease',
            '&.Mui-selected': {
              color: primaryMain,
            },
            '&:hover': {
              color: primaryMain,
              backgroundColor: isDark ? 'rgba(0, 255, 195, 0.05)' : 'rgba(0, 166, 128, 0.05)',
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
            backgroundColor: isDark ? 'rgba(0, 255, 195, 0.08)' : 'rgba(0, 166, 128, 0.08)',
            borderColor: isDark ? 'rgba(0, 255, 195, 0.2)' : 'rgba(0, 166, 128, 0.2)',
            color: isDark ? '#00ffc3' : '#007459',
            '& .MuiAlert-icon': {
              color: isDark ? '#00ffc3' : '#007459',
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
            backgroundColor: isDark ? 'rgba(128, 132, 238, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            borderColor: isDark ? 'rgba(128, 132, 238, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            color: isDark ? '#a5a8f3' : '#4f46e5',
            '& .MuiAlert-icon': {
              color: isDark ? '#8084ee' : '#4f46e5',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: isDark ? 'rgba(11, 25, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: isDark ? '1px solid rgba(0, 255, 195, 0.15)' : '1px solid rgba(0, 166, 128, 0.15)',
            color: isDark ? '#e0e6ed' : '#0f172a',
            borderRadius: 6,
            fontFamily: '"Rajdhani", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.02em',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          },
          arrow: {
            color: isDark ? 'rgba(11, 25, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDark
              ? 'linear-gradient(180deg, rgba(7, 5, 17, 0.98) 0%, rgba(11, 25, 42, 0.95) 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderRight: isDark ? '1px solid rgba(0, 255, 195, 0.1)' : '1px solid rgba(0, 166, 128, 0.1)',
            color: isDark ? '#e0e6ed' : '#0f172a',
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            border: `1px solid ${isDark ? 'rgba(0, 255, 195, 0.2)' : 'rgba(0, 166, 128, 0.2)'}`,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(0, 255, 195, 0.15) 0%, rgba(128, 132, 238, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(0, 166, 128, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: isDark ? primaryMain : primaryDark,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'all 0.3s ease',
            color: isDark ? 'rgba(224, 230, 237, 0.7)' : 'rgba(15, 23, 42, 0.7)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(0, 255, 195, 0.08)' : 'rgba(0, 166, 128, 0.08)',
              boxShadow: isDark ? '0 0 12px rgba(0, 255, 195, 0.15)' : 'none',
              color: primaryMain,
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: primaryMain,
              '& + .MuiSwitch-track': {
                backgroundColor: isDark ? 'rgba(0, 255, 195, 0.3)' : 'rgba(0, 166, 128, 0.3)',
              },
            },
          },
          track: {
            backgroundColor: isDark ? 'rgba(224, 230, 237, 0.2)' : 'rgba(15, 23, 42, 0.2)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: isDark ? 'rgba(0, 255, 195, 0.08)' : 'rgba(0, 166, 128, 0.08)',
            fontFamily: '"Rajdhani", sans-serif',
            color: isDark ? '#e0e6ed' : '#0f172a',
          },
          head: {
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: isDark ? 'rgba(0, 255, 195, 0.7)' : 'rgba(0, 166, 128, 0.7)',
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          colorPrimary: {
            color: primaryMain,
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(0, 255, 195, 0.05)' : 'rgba(0, 166, 128, 0.05)',
          },
        },
      },
    },
  }
}

// Deprecated: use getThemeConfig(mode) instead
import { createTheme } from '@mui/material/styles'
export const cryptoTheme = createTheme(getThemeConfig('dark'))
