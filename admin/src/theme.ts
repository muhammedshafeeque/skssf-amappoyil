import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    primary: { main: '#0b6e4f' },
    secondary: { main: '#c0392b' },
    background: { default: '#f5f7f6' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none' } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #e3e8e6' } } },
    MuiAppBar: { styleOverrides: { root: { border: 'none' } } },
    MuiDrawer: { styleOverrides: { paper: { border: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
});
