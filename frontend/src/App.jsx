/**
 * Main App component with routing
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Loading component
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)'
    }}
  >
    <CircularProgress sx={{ color: 'white' }} size={60} />
  </Box>
);

// Maroon-White-Black theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#800000', // Maroon
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#000000', // Black
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    h4: { fontSize: '2.125rem' },
    h6: { fontSize: '1.25rem' },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.9rem' },
    subtitle1: { fontSize: '1.25rem' },
    subtitle2: { fontSize: '0.9rem' },
    button: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  },
  components: {
    MuiInputBase: {
      styleOverrides: {
        root: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
