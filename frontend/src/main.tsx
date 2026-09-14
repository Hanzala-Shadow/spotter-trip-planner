import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';

const theme = createTheme({
  palette: {
    primary: { main: '#11665c' },
    background: { default: '#f2f5f4' },
    text: { primary: '#183634', secondary: '#708178' },
  },
  typography: { fontFamily: 'Inter, system-ui, sans-serif', button: { textTransform: 'none' } },
  shape: { borderRadius: 7 },
  components: {
    MuiInputBase: { styleOverrides: { root: { fontSize: 13 } } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 13 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: 11, lineHeight: 1.6 } } },
  },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
