/**
 * Admin Dashboard Page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  CircularProgress,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  InputBase,
  Paper,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Collapse,
  Zoom,
  Fab,
  Snackbar,
  FormControl,
  Select,
  InputLabel,
  InputAdornment,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import FilterListIcon from '@mui/icons-material/FilterList';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ReceiptTable from '../components/ReceiptTable';
import AdminManagement from '../components/AdminManagement';
import api from '../api';
import { formatReceiptAmount, formatReceiptDate } from '../utils/receiptFormatting';

const drawerWidth = 256;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(true);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Receipts');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const [fabVisible, setFabVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'admin-management'
  const [loggedInUsername, setLoggedInUsername] = useState('Admin');
  const [darkMode, setDarkMode] = useState(false);

  const parseIsSuperuser = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  };

  const getSuperuserFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const payload = token.split('.')[1];
      if (!payload) return false;
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return parseIsSuperuser(decoded?.is_superuser);
    } catch (error) {
      return false;
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const categories = [
    { name: 'All Receipts', icon: <ReceiptIcon /> },
    { name: 'Pending', icon: <FolderIcon /> },
    { name: 'Approved', icon: <FolderIcon /> },
    { name: 'Recent', icon: <FolderIcon /> },
  ];

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    const savedSuperuser = parseIsSuperuser(localStorage.getItem('is_superuser'));
    const savedUsername = localStorage.getItem('username');
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (token) {
      setIsAuthenticated(true);
      const superuserFromToken = getSuperuserFromToken();
      const resolvedSuperuser = savedSuperuser || superuserFromToken;
      setIsSuperuser(resolvedSuperuser);
      localStorage.setItem('is_superuser', String(resolvedSuperuser));
      // Only set username if it exists and is not null/undefined
      setLoggedInUsername(savedUsername && savedUsername !== 'null' && savedUsername !== 'undefined' ? savedUsername : 'Admin');
      setDarkMode(savedDarkMode);
      setLoginOpen(false);
      fetchReceipts();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const formData = new FormData();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);

      const response = await api.post('/login', formData);
      
      const username = response.data.username || credentials.username || 'Admin';
      const isSuperuser = parseIsSuperuser(response.data.is_superuser);
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('is_superuser', String(Boolean(isSuperuser)));
      localStorage.setItem('username', username);
      
      console.log('Login response:', {
        username: username,
        is_superuser: isSuperuser,
        stored_username: localStorage.getItem('username'),
        stored_superuser: localStorage.getItem('is_superuser')
      });
      
      setIsSuperuser(isSuperuser);
      setLoggedInUsername(username);
      setIsAuthenticated(true);
      setLoginOpen(false);
      fetchReceipts();
    } catch (error) {
      setLoginError(error.response?.data?.detail || 'Login failed');
    }
  };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      console.log('Fetching receipts from API...');
      const response = await api.get('/receipts');
      console.log('Receipts response:', response.data);

      const apiReceipts = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.receipts)
        ? response.data.receipts
        : [];

      if (apiReceipts.length > 0) {
        setReceipts(apiReceipts);
        console.log(`✅ Successfully loaded ${apiReceipts.length} receipts`);
        setSnackbar({ open: true, message: `Loaded ${apiReceipts.length} receipts successfully`, severity: 'success' });
      } else {
        console.warn('⚠️ No receipts data in response');
        setReceipts([]);
        setSnackbar({ open: true, message: 'No receipts found', severity: 'info' });
      }
    } catch (error) {
      console.error('❌ Failed to fetch receipts:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setReceipts([]);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || 'Failed to load receipts. Please check your connection.', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('is_superuser');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setIsSuperuser(false);
    setLoginOpen(true);
    setCurrentView('dashboard');
    navigate('/admin');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const exportToCSV = () => {
    // Prepare CSV data
    const headers = ['ID', 'Date', 'Time', 'Item/Description', 'Amount', 'Submitted By', 'Phone', 'Status', 'Approved By', 'Created At'];
    
    const csvData = filteredReceipts.map(receipt => [
      receipt.id,
      receipt.ocr_date || '',
      receipt.ocr_time || '',
      receipt.item_bought || '',
      receipt.ocr_price ?? '',
      receipt.user_name || '',
      receipt.user_phone || '',
      receipt.approved_by ? 'Approved' : 'Pending',
      receipt.approved_by || '',
      new Date(receipt.created_at).toLocaleDateString('en-US'),
    ]);

    // Calculate totals
    const totalAmount = filteredReceipts.reduce((sum, r) => sum + (parseFloat(r.ocr_price) || 0), 0);
    const totalReceipts = filteredReceipts.length;
    const approvedCount = filteredReceipts.filter(r => r.approved_by && r.approved_by !== 'Pending').length;

    // Convert to CSV string with summary
    const csvContent = [
      '# NECF Treasury System - Receipt Export',
      `# Generated: ${new Date().toLocaleString('en-US')}`,
      `# Total Receipts: ${totalReceipts}`,
      `# Approved Receipts: ${approvedCount}`,
      `# Total Amount: ₺${totalAmount.toFixed(2)}`,
      '',
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      '# Summary',
      `"Total Receipts","","","","${totalReceipts}","","","","",""`,
      `"Total Amount","","","","₺${totalAmount.toFixed(2)}","","","","",""`,
      `"Approved","","","","${approvedCount}","","","","",""`,
      `"Pending","","","","${totalReceipts - approvedCount}","","","","",""`,
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `NECF_Treasury_Receipts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSnackbar({ open: true, message: 'CSV exported successfully', severity: 'success' });
  };

  const exportToPDF = () => {
    setSnackbar({ open: true, message: 'Generating PDF report...', severity: 'info' });
    
    // Calculate totals
    const totalAmount = filteredReceipts.reduce((sum, r) => sum + (parseFloat(r.ocr_price) || 0), 0);
    const totalReceipts = filteredReceipts.length;
    const approvedCount = filteredReceipts.filter(r => r.approved_by && r.approved_by !== 'Pending').length;
    const pendingCount = totalReceipts - approvedCount;

    // Get the logo as base64 or use the public path
    const logoPath = window.location.origin + '/necf-logo.png';

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>NECF Treasury Report - ${new Date().toLocaleDateString()}</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #6B1C23;
          }
          .header img {
            width: 100px;
            height: 100px;
            margin-bottom: 15px;
            object-fit: contain;
          }
          .header h1 {
            color: #6B1C23;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header h2 {
            color: #666;
            margin: 5px 0;
            font-size: 18px;
            font-weight: normal;
          }
          .meta-info {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-bottom: 30px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #6B1C23;
          }
          .summary-card h3 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #666;
            font-weight: normal;
          }
          .summary-card p {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background: #6B1C23;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 13px;
          }
          tr:hover {
            background: #f8f9fa;
          }
          .status-approved {
            background: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          .status-pending {
            background: #f8d7da;
            color: #721c24;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          .total-row {
            background: #f8f9fa;
            font-weight: bold;
            border-top: 3px solid #6B1C23;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoPath}" alt="NECF Logo" />
          <h1>Near East Christian Fellowship</h1>
          <h2>Treasury Management System</h2>
        </div>
        
        <div class="meta-info">
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString('en-US')}</p>
          <p><strong>Report Type:</strong> Receipt Summary</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Receipts</h3>
            <p>${totalReceipts}</p>
          </div>
          <div class="summary-card">
            <h3>Total Amount</h3>
            <p>₺${totalAmount.toFixed(2)}</p>
          </div>
          <div class="summary-card">
            <h3>Approved</h3>
            <p style="color: #2e7d32;">${approvedCount}</p>
          </div>
          <div class="summary-card">
            <h3>Pending</h3>
            <p style="color: #d32f2f;">${pendingCount}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>DATE</th>
              <th>ITEM/DESCRIPTION</th>
              <th>AMOUNT</th>
              <th>SUBMITTED BY</th>
              <th>PHONE</th>
              <th>STATUS</th>
              <th>APPROVED BY</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReceipts.map(receipt => `
              <tr>
                <td>#${receipt.id}</td>
                <td>${receipt.ocr_date ? formatReceiptDate(receipt.ocr_date) : 'Not detected'}</td>
                <td>${receipt.item_bought || '-'}</td>
                <td>${formatReceiptAmount(receipt.ocr_price)}</td>
                <td>${receipt.user_name || '-'}</td>
                <td>${receipt.user_phone || '-'}</td>
                <td>
                  <span class="${receipt.approved_by ? 'status-approved' : 'status-pending'}">
                    ${receipt.approved_by ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td>${receipt.approved_by || '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3"><strong>TOTAL</strong></td>
              <td><strong>₺${totalAmount.toFixed(2)}</strong></td>
              <td colspan="4"><strong>${totalReceipts} Receipt(s)</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>© 2025 Near East Christian Fellowship • Treasury Management System</p>
          <p>This is an official financial document. Please retain for your records.</p>
        </div>

        <script>
          window.onload = function() {
            // Wait a bit for the image to load before printing
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Ensure receipts is always an array before filtering to avoid runtime errors
  const safeReceipts = Array.isArray(receipts) ? receipts : [];
  const hasRecognizedAmount = safeReceipts.some(
    (receipt) =>
      receipt &&
      receipt.ocr_price !== null &&
      receipt.ocr_price !== undefined &&
      receipt.ocr_price !== '' &&
      Number.isFinite(Number(receipt.ocr_price)),
  );
  const filteredReceipts = safeReceipts.filter((receipt = {}) => {
    // Defensive extraction with defaults
    const userName = String(receipt.user_name || '').toLowerCase();
    const itemBought = String(receipt.item_bought || '').toLowerCase();
    const phone = String(receipt.user_phone || '');
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !query ||
      userName.includes(query) ||
      itemBought.includes(query) ||
      phone.includes(searchQuery);

    // Status filter logic with defensive checks
    const approved = !!(receipt.approved_by && receipt.approved_by !== 'Pending');
    const pending = !receipt.approved_by || receipt.approved_by === 'Pending';
    const categoryStatus =
      selectedCategory === 'Approved'
        ? 'approved'
        : selectedCategory === 'Pending'
        ? 'pending'
        : 'all';
    const matchesStatus =
      (statusFilter === 'all' ||
        (statusFilter === 'approved' && approved) ||
        (statusFilter === 'pending' && pending)) &&
      (categoryStatus === 'all' ||
        (categoryStatus === 'approved' && approved) ||
        (categoryStatus === 'pending' && pending));

    return matchesSearch && matchesStatus;
  }).sort((left, right) => {
    if (selectedCategory !== 'Recent') return 0;
    const timestamp = (receipt) =>
      Date.parse(receipt.created_at || '') || Number(receipt.id) || 0;
    return timestamp(right) - timestamp(left);
  });

  // Calculate statistics
  const stats = {
    total: safeReceipts.length,
    totalAmount: safeReceipts.reduce((sum, r = {}) => sum + (parseFloat(r.ocr_price) || 0), 0),
    approved: safeReceipts.filter(r => r && r.approved_by && r.approved_by !== 'Pending').length,
    pending: safeReceipts.filter(r => !r || !r.approved_by || r.approved_by === 'Pending').length,
  };

  // Animated counter effect
  const [displayStats, setDisplayStats] = useState({ total: 0, totalAmount: 0, approved: 0, pending: 0 });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const duration = 1000; // 1 second animation
      const steps = 30;
      const interval = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        setDisplayStats({
          total: Math.floor(stats.total * progress),
          totalAmount: stats.totalAmount * progress,
          approved: Math.floor(stats.approved * progress),
          pending: Math.floor(stats.pending * progress),
        });

        if (currentStep >= steps) {
          clearInterval(timer);
          setDisplayStats(stats);
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [loading, isAuthenticated, stats.total, stats.totalAmount, stats.approved, stats.pending]);

  if (!isAuthenticated) {
    return (
      <Box
        component="main"
        sx={{
          position: 'relative',
          minHeight: '100svh',
          overflow: 'hidden',
          bgcolor: '#f6f4f0',
          color: '#211c19',
        }}
      >
        <Box
          component="header"
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            maxWidth: 1440,
            mx: 'auto',
            px: { xs: 2.5, sm: 5, lg: 9 },
            py: { xs: 2, sm: 3 },
            borderBottom: '1px solid rgba(33,28,25,0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src="/necf-logo.png"
              alt="NECF logo"
              sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, objectFit: 'contain' }}
            />
            <Box>
              <Typography sx={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                Near East Christian Fellowship
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  color: '#6b1c23',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.17em',
                  textTransform: 'uppercase',
                }}
              >
                Treasury management
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={() => navigate('/')}
            startIcon={<ArrowBackRounded />}
            sx={{
              flexShrink: 0,
              minWidth: 0,
              border: '1px solid rgba(33,28,25,0.15)',
              borderRadius: 999,
              px: { xs: 1.5, sm: 2.25 },
              py: 1,
              color: '#211c19',
              bgcolor: 'rgba(255,255,255,0.7)',
              textTransform: 'none',
              '&:hover': { borderColor: 'rgba(107,28,35,0.4)', bgcolor: '#fffdfa' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Back to home</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Home</Box>
          </Button>
        </Box>

        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.1fr) minmax(360px,0.72fr)' },
            alignItems: 'center',
            gap: { xs: 5, md: 8, lg: 12 },
            gridTemplateAreas: { xs: '"login" "intro"', lg: '"intro login"' },
            maxWidth: 1440,
            minHeight: { lg: 'calc(100svh - 105px)' },
            mx: 'auto',
            px: { xs: 2.5, sm: 5, lg: 9 },
            py: { xs: 6, sm: 8, lg: 10 },
          }}
        >
          <Typography
            aria-hidden="true"
            sx={{
              position: 'absolute',
              right: { xs: '-0.03em', lg: '36%' },
              bottom: '-0.2em',
              color: '#6b1c23',
              fontSize: 'clamp(14rem, 34vw, 36rem)',
              fontWeight: 600,
              lineHeight: 0.8,
              letterSpacing: '-0.09em',
              opacity: 0.055,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            03
          </Typography>

          <Box sx={{ gridArea: 'intro', position: 'relative', zIndex: 1, maxWidth: 700 }}>
            <Typography
              sx={{
                mb: 2.5,
                color: '#6b1c23',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              NECF / Treasury / Administration
            </Typography>
            <Typography
              component="h1"
              sx={{
                maxWidth: 700,
                fontSize: 'clamp(3.2rem, 7.4vw, 7.2rem)',
                fontWeight: 500,
                lineHeight: 0.94,
                letterSpacing: '-0.075em',
              }}
            >
              Stewardship,
              <br />
              made clear.
            </Typography>
            <Typography
              sx={{
                mt: 3,
                maxWidth: 540,
                color: '#514a45',
                fontSize: { xs: '1rem', sm: '1.15rem' },
                lineHeight: 1.75,
              }}
            >
              A considered workspace for reviewing receipt submissions and caring
              for church treasury records.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 2.5, sm: 4 },
                mt: { xs: 4, sm: 6 },
                pt: 2.5,
                borderTop: '1px solid rgba(33,28,25,0.12)',
              }}
            >
              {[
                ['01', 'Review submissions'],
                ['02', 'Verify details'],
                ['03', 'Keep records clear'],
              ].map(([number, label]) => (
                <Box key={number}>
                  <Typography sx={{ color: '#6b1c23', fontSize: '0.68rem', fontWeight: 700 }}>
                    {number}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: '0.82rem', fontWeight: 600 }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Paper
            component="form"
            onSubmit={handleLogin}
            elevation={0}
            sx={{
              gridArea: 'login',
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: 480,
              justifySelf: { lg: 'end' },
              p: { xs: 3, sm: 4.5 },
              border: '1px solid rgba(33,28,25,0.1)',
              borderRadius: { xs: 3, sm: 4 },
              bgcolor: '#fffdfa',
              boxShadow: '0 28px 80px rgba(33,28,25,0.09)',
            }}
          >
            <Box
              component="img"
              src="/necf-logo.png"
              alt=""
              sx={{
                width: 52,
                height: 52,
                mb: 3,
                objectFit: 'contain',
              }}
            />
            <Typography
              sx={{
                color: '#6b1c23',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.19em',
                textTransform: 'uppercase',
              }}
            >
              Authorized administrators
            </Typography>
            <Typography
              component="h2"
              sx={{
                mt: 1,
                fontSize: { xs: '1.8rem', sm: '2.1rem' },
                fontWeight: 600,
                letterSpacing: '-0.055em',
              }}
            >
              Treasury access
            </Typography>
            <Typography sx={{ mt: 1, mb: 3, color: '#746b64', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Sign in to review receipts and manage records.
            </Typography>

            {loginError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {loginError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              margin="normal"
              required
              autoComplete="username"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#fff',
                  '& fieldset': { borderColor: 'rgba(33,28,25,0.16)' },
                  '&:hover fieldset': { borderColor: 'rgba(107,28,35,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#6b1c23' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#6b1c23' },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              margin="normal"
              required
              autoComplete="current-password"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#fff',
                  '& fieldset': { borderColor: 'rgba(33,28,25,0.16)' },
                  '&:hover fieldset': { borderColor: 'rgba(107,28,35,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#6b1c23' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#6b1c23' },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 2.5,
                py: 1.5,
                borderRadius: 999,
                bgcolor: '#6b1c23',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#4a0e13', boxShadow: '0 10px 24px rgba(107,28,35,0.18)' },
              }}
            >
              Sign in to dashboard
            </Button>
            <Typography
              sx={{
                mt: 2.5,
                pt: 2,
                borderTop: '1px solid rgba(33,28,25,0.09)',
                color: '#827a73',
                fontSize: '0.73rem',
                lineHeight: 1.6,
              }}
            >
              Access is limited to authorized treasury administrators.
            </Typography>
          </Paper>
        </Box>

        <Box
          component="footer"
          sx={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1440,
            mx: 'auto',
            px: { xs: 2.5, sm: 5, lg: 9 },
            py: 2,
            borderTop: '1px solid rgba(33,28,25,0.1)',
            color: '#746b64',
            fontSize: '0.72rem',
          }}
        >
          Near East Christian Fellowship · Treasury management
        </Box>
      </Box>
    );
  }

  // Drawer content to be reused in both mobile and desktop drawers
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <img
            src="/necf-logo.png"
            alt="NECF Logo"
            style={{
              width: 38,
              height: 38,
              objectFit: 'contain',
            }}
          />
        </div>
        <Box>
          <Typography variant="body2" fontWeight={700} sx={{ color: 'white', letterSpacing: '-0.02em' }}>
            NECF Treasury
          </Typography>
          <Typography sx={{ mt: 0.25, color: 'rgba(255,255,255,0.62)', fontSize: '0.65rem' }}>
            Administration
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

      {/* Navigation */}
      <List sx={{ px: 2, py: 3 }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            selected={currentView === 'dashboard'}
            onClick={() => { setCurrentView('dashboard'); setMobileOpen(false); }}
            sx={{
              borderRadius: 2,
                '&.Mui-selected': {
                background: 'linear-gradient(90deg, #6b1c23, #4a0e13)',
                boxShadow: '0 8px 22px rgba(75,14,19,0.28)',
                transform: 'translateX(-2px)',
                '&:hover': { background: 'linear-gradient(90deg, #5a181e, #3c0c0f)' },
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            onClick={() => { navigate('/upload'); setMobileOpen(false); }}
            sx={{
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <UploadFileIcon />
            </ListItemIcon>
            <ListItemText primary="Upload" />
          </ListItemButton>
        </ListItem>

        {/* Admin Management - Only visible to superusers */}
        {isSuperuser && (
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              selected={currentView === 'admin-management'}
              onClick={() => { setCurrentView('admin-management'); setMobileOpen(false); }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: '#6B1C23',
                  '&:hover': { bgcolor: '#4A0E13' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                <SupervisorAccountIcon />
              </ListItemIcon>
              <ListItemText primary="Admin Management" />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Categories */}
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', px: 2, mb: 1, display: 'block' }}>
          CATEGORIES
        </Typography>
        <List>
          {categories.map((category) => (
            <ListItem key={category.name} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={selectedCategory === category.name}
                onClick={() => { setSelectedCategory(category.name); setMobileOpen(false); }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {category.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={category.name}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Bottom Actions */}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }} />
        
        {/* Dark Mode Toggle */}
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            onClick={toggleDarkMode}
            sx={{
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText primary={darkMode ? 'Light Mode' : 'Dark Mode'} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => { handleLogout(); setMobileOpen(false); }}
            sx={{
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        height: '100svh',
        minHeight: '100svh',
        width: '100%',
        margin: 0,
        padding: 0,
        bgcolor: '#f6f4f0',
        color: '#211c19',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Treasury sign-in canvas */}
      {!isAuthenticated && (
        <Box
          component="main"
          sx={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            px: { xs: 2.5, sm: 5, lg: 10 },
            py: { xs: 2.5, sm: 4 },
            bgcolor: '#f6f4f0',
          }}
        >
          <Box
            component="header"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                component="img"
                src="/necf-logo.png"
                alt="NECF logo"
                sx={{ width: 44, height: 44, objectFit: 'contain' }}
              />
              <Box>
                <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Near East Christian Fellowship
                </Typography>
                <Typography
                  sx={{
                    mt: 0.25,
                    color: '#6b1c23',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.17em',
                    textTransform: 'uppercase',
                  }}
                >
                  Treasury management
                </Typography>
              </Box>
            </Box>
            <Button
              onClick={() => navigate('/')}
              startIcon={<ArrowBackRounded />}
              sx={{
                border: '1px solid rgba(33,28,25,0.15)',
                borderRadius: 999,
                px: 2,
                color: '#211c19',
                bgcolor: 'rgba(255,255,255,0.72)',
                textTransform: 'none',
                '&:hover': { borderColor: 'rgba(107,28,35,0.4)', bgcolor: '#fff' },
              }}
            >
              Back to home
            </Button>
          </Box>

          <Box
            sx={{
              position: 'relative',
              mt: { xs: 8, sm: 11, lg: 13 },
              maxWidth: 850,
            }}
          >
            <Typography
              sx={{
                mb: 2,
                color: '#6b1c23',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              NECF / Treasury / Administration
            </Typography>
            <Typography
              component="h1"
              sx={{
                maxWidth: 800,
                fontSize: 'clamp(3rem, 8vw, 7.5rem)',
                fontWeight: 500,
                lineHeight: 0.94,
                letterSpacing: '-0.075em',
              }}
            >
              Stewardship,
              <br />
              made clear.
            </Typography>
            <Typography
              sx={{
                mt: 3,
                maxWidth: 550,
                color: '#514a45',
                fontSize: { xs: '1rem', sm: '1.15rem' },
                lineHeight: 1.7,
              }}
            >
              Review receipt submissions and treasury records with care,
              clarity, and confidence.
            </Typography>
          </Box>

          <Typography
            aria-hidden="true"
            sx={{
              position: 'absolute',
              right: '-0.04em',
              bottom: '-0.2em',
              color: '#6b1c23',
              fontSize: 'clamp(12rem, 34vw, 34rem)',
              fontWeight: 600,
              lineHeight: 0.8,
              letterSpacing: '-0.09em',
              opacity: 0.06,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            03
          </Typography>
        </Box>
      )}
      
      {/* Content wrapper with higher z-index */}
      <Box sx={{ display: 'flex', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
        {/* Sidebar - Responsive Drawer */}
        {isAuthenticated && (
          <>
            {/* Mobile Drawer */}
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile
              }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                  background: 'linear-gradient(180deg, #4a0e13 0%, #211c19 100%)',
                  color: 'white',
                  borderRight: 'none',
                  height: '100svh',
                  top: 0,
                },
              }}
            >
              {drawerContent}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', md: 'block' },
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                  background: 'linear-gradient(180deg, #4a0e13 0%, #211c19 100%)',
                  color: 'white',
                  borderRight: 'none',
                  height: '100svh',
                },
              }}
            >
              {drawerContent}
            </Drawer>
          </>
        )}

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flex: '1 1 0%',
          minWidth: 0,
          display: 'flex', 
          flexDirection: 'column', 
          width: 0,
          height: '100svh',
          overflow: 'hidden',
          bgcolor: isAuthenticated
            ? darkMode ? '#121212' : '#f6f4f0'
            : 'transparent',
        }}
      >
        {/* Top Bar - Fixed */}
        {isAuthenticated && (
          <Box 
            sx={{ 
              bgcolor: darkMode ? '#171a21' : 'rgba(246,244,240,0.94)',
              borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(33,28,25,0.1)',
              p: { xs: 2, sm: 2.5 },
              backdropFilter: 'blur(18px)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              flexShrink: 0,
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: { xs: 2, sm: 2.5 }, 
              flexWrap: 'wrap', 
              gap: { xs: 1.5, sm: 2 },
              rowGap: { xs: 1.5, sm: 2 }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ display: { md: 'none' }, color: darkMode ? 'white' : 'inherit' }}
                >
                  <MenuIcon />
                </IconButton>
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    sx={{
                      fontSize: { xs: '1.2rem', sm: '1.55rem' },
                      letterSpacing: '-0.045em',
                      lineHeight: 1.15,
                      color: darkMode ? 'white' : '#211c19',
                    }}
                  >
                    Treasury receipts
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: darkMode ? '#aaa' : '#746b64', letterSpacing: '0.02em' }}
                  >
                    Review submissions and keep records moving
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchReceipts}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 999,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1.5, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    minWidth: { xs: 'auto', sm: '100px' },
                    whiteSpace: 'nowrap',
                    color: darkMode ? 'white' : 'inherit',
                    borderColor: darkMode ? '#555' : 'rgba(0, 0, 0, 0.23)',
                    '&:hover': {
                      borderColor: darkMode ? '#777' : 'rgba(0, 0, 0, 0.23)',
                      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: '4px', sm: '8px' }
                    }
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportToCSV}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 999,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1.5, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    minWidth: { xs: 'auto', sm: '90px' },
                    whiteSpace: 'nowrap',
                    color: darkMode ? '#e5d7d2' : '#6b1c23',
                    borderColor: darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(107,28,35,0.24)',
                    '&:hover': {
                      borderColor: '#6b1c23',
                      bgcolor: 'rgba(107, 28, 35, 0.05)',
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: '4px', sm: '8px' }
                    }
                  }}
                >
                  CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={exportToPDF}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 999,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1.5, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    minWidth: { xs: 'auto', sm: '90px' },
                    whiteSpace: 'nowrap',
                    color: darkMode ? '#e5d7d2' : '#6b1c23',
                    borderColor: darkMode ? 'rgba(255,255,255,0.22)' : 'rgba(107,28,35,0.24)',
                    '&:hover': {
                      borderColor: '#6b1c23',
                      bgcolor: 'rgba(107, 28, 35, 0.05)',
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: '4px', sm: '8px' }
                    }
                  }}
                >
                  PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => navigate('/upload')}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1.5, sm: 2.5 },
                    py: { xs: 0.75, sm: 1 },
                    minWidth: { xs: 'auto', sm: '130px' },
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4A0E13 0%, #6B1C23 100%)',
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: '4px', sm: '8px' }
                    }
                  }}
                >
                  New Upload
                </Button>
              </Box>
            </Box>

            {/* Search Bar and Filter */}
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 1.5, sm: 2 }, 
              flexWrap: 'wrap', 
              alignItems: 'center',
              mt: { xs: 0.5, sm: 0 }
            }}>
              <Paper
                sx={{
                  p: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  flex: { xs: '1 1 100%', sm: '1 1 auto' },
                  minWidth: { xs: 'auto', sm: 320 },
                  maxWidth: { xs: '100%', sm: 430 },
                  boxShadow: '0 8px 24px rgba(33, 28, 25, 0.04)',
                  border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(33,28,25,0.10)',
                  bgcolor: darkMode ? '#20242d' : '#ffffff',
                }}
              >
                <IconButton sx={{ p: { xs: '8px', sm: '10px' }, color: darkMode ? 'white' : 'inherit' }}>
                  <SearchIcon />
                </IconButton>
                <InputBase
                  sx={{ 
                    ml: 1, 
                    flex: 1, 
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    color: darkMode ? 'white' : 'inherit',
                  }}
                  placeholder="Search receipts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Paper>
              
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: { xs: '100%', sm: 180 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    bgcolor: darkMode ? '#2a2a2a' : 'white',
                    '& fieldset': {
                      borderColor: darkMode ? '#333' : '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: darkMode ? '#555' : '#6B1C23',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#6B1C23',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: darkMode ? '#999' : 'rgba(0, 0, 0, 0.6)',
                    '&.Mui-focused': {
                      color: '#6B1C23',
                    },
                  },
                  '& .MuiSelect-select': {
                    color: darkMode ? 'white' : 'inherit',
                  },
                }}
              >
                <InputLabel id="status-filter-label">Status Filter</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterListIcon sx={{ color: '#6B1C23', fontSize: 20 }} />
                    </InputAdornment>
                  }
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: darkMode ? '#2a2a2a' : 'white',
                        '& .MuiMenuItem-root': {
                          color: darkMode ? 'white' : 'inherit',
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="all">All Receipts</MenuItem>
                  <MenuItem value="approved">Approved Only</MenuItem>
                  <MenuItem value="pending">Pending Only</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}

        {/* Content Area - Scrollable */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            minWidth: 0,
            p: { xs: 2, sm: 3, md: 4 },
            overflow: 'auto', 
            bgcolor: isAuthenticated
              ? darkMode ? '#0f1115' : '#f6f4f0'
              : 'transparent',
            height: '100%',
            '&::-webkit-scrollbar': {
              width: '10px',
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: darkMode ? '#1e1e1e' : '#e0e0e0',
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: darkMode ? '#555' : '#9e9e9e',
              borderRadius: '5px',
              '&:hover': {
                bgcolor: darkMode ? '#777' : '#757575',
              },
            },
          }}
        >
          {isAuthenticated ? (
            <>
              {currentView === 'dashboard' ? (
                <>
              {/* Statistics Cards */}
              {loading ? (
                <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
                  {[1, 2, 3, 4].map((i) => (
                        <Grid item xs={12} sm={6} lg={3} key={i}>
                      <Card elevation={2}>
                        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                          <Skeleton variant="circular" width={48} height={48} sx={{ mb: 2 }} />
                          <Skeleton variant="text" width="60%" height={32} />
                          <Skeleton variant="text" width="80%" />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
                  {/* Total Receipts */}
                  <Grid 
                    item 
                    xs={12}
                    sm={6}
                    lg={3}
                    sx={{
                      animation: 'slideInUp 0.6s ease-out',
                      '@keyframes slideInUp': {
                        from: { opacity: 0, transform: 'translateY(30px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <Card 
                      elevation={3}
                      sx={{ 
                        background: darkMode ? '#201b1a' : '#fffdfa',
                        color: darkMode ? '#fff' : '#211c19',
                        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(107,28,35,0.14)',
                        borderRadius: 3,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        boxShadow: '0 12px 32px rgba(33,28,25,0.045)',
                        '&:hover': {
                          transform: { xs: 'translateY(-4px) scale(1.01)', md: 'translateY(-8px) scale(1.02)' },
                        boxShadow: '0 18px 36px rgba(33,28,25,0.09)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
                          <Box
                            sx={{
                              bgcolor: 'rgba(107,28,35,0.08)',
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              display: 'flex',
                            }}
                          >
                            <ReceiptIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#6b1c23' }} />
                          </Box>
                        </Box>
                        <Typography 
                          variant="h4" 
                          fontWeight="bold" 
                          sx={{ 
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                          }}
                        >
                          {displayStats.total}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          Total Receipts
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Total Amount */}
                  <Grid 
                    item 
                    xs={12}
                    sm={6}
                    lg={3}
                    sx={{
                      animation: 'slideInUp 0.6s ease-out 0.1s both',
                      '@keyframes slideInUp': {
                        from: { opacity: 0, transform: 'translateY(30px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <Card 
                      elevation={3}
                      sx={{ 
                        background: darkMode ? '#201b1a' : '#fffdfa',
                        color: darkMode ? 'white' : '#211c19',
                        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(107,28,35,0.14)',
                        borderRadius: 3,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        boxShadow: '0 12px 32px rgba(33,28,25,0.045)',
                        '&:hover': {
                          transform: { xs: 'translateY(-4px) scale(1.01)', md: 'translateY(-8px) scale(1.02)' },
                          boxShadow: '0 18px 36px rgba(33,28,25,0.09)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
                          <Box
                            sx={{
                              bgcolor: 'rgba(107,28,35,0.08)',
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              display: 'flex',
                            }}
                          >
                            <AttachMoneyIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#6b1c23' }} />
                          </Box>
                        </Box>
                        <Typography 
                          variant="h4" 
                          fontWeight="bold" 
                          sx={{ 
                            mb: 0.5,
                            fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' },
                          }}
                        >
                          {hasRecognizedAmount
                            ? formatReceiptAmount(displayStats.totalAmount)
                            : 'Not detected'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          Total Amount
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Approved */}
                  <Grid 
                    item 
                    xs={12}
                    sm={6}
                    lg={3}
                    sx={{
                      animation: 'slideInUp 0.6s ease-out 0.2s both',
                      '@keyframes slideInUp': {
                        from: { opacity: 0, transform: 'translateY(30px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <Card 
                      elevation={3}
                      sx={{ 
                        background: darkMode ? '#201b1a' : '#fffdfa',
                        color: darkMode ? 'white' : '#211c19',
                        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(107,28,35,0.14)',
                        borderRadius: 3,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        boxShadow: '0 12px 32px rgba(33,28,25,0.045)',
                        '&:hover': {
                          transform: { xs: 'translateY(-4px) scale(1.01)', md: 'translateY(-8px) scale(1.02)' },
                          boxShadow: '0 18px 36px rgba(33,28,25,0.09)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
                          <Box
                            sx={{
                              bgcolor: 'rgba(107,28,35,0.08)',
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              display: 'flex',
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#6b1c23' }} />
                          </Box>
                        </Box>
                        <Typography 
                          variant="h4" 
                          fontWeight="bold" 
                          sx={{ 
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                          }}
                        >
                          {displayStats.approved}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          Approved
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Pending */}
                  <Grid 
                    item 
                    xs={12}
                    sm={6}
                    lg={3}
                    sx={{
                      animation: 'slideInUp 0.6s ease-out 0.3s both',
                      '@keyframes slideInUp': {
                        from: { opacity: 0, transform: 'translateY(30px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <Card 
                      elevation={3}
                      sx={{ 
                        background: darkMode ? '#201b1a' : '#fffdfa',
                        color: darkMode ? 'white' : '#211c19',
                        borderRadius: 3,
                        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(107,28,35,0.14)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        boxShadow: '0 12px 32px rgba(33,28,25,0.045)',
                        '&:hover': {
                          transform: { xs: 'translateY(-4px) scale(1.01)', md: 'translateY(-8px) scale(1.02)' },
                          boxShadow: '0 18px 36px rgba(33,28,25,0.09)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
                          <Box
                            sx={{
                              bgcolor: 'rgba(107,28,35,0.08)',
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              display: 'flex',
                            }}
                          >
                            <PendingActionsIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: '#6b1c23' }} />
                          </Box>
                        </Box>
                        <Typography 
                          variant="h4" 
                          fontWeight="bold" 
                          sx={{ 
                            mb: 0.5,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                          }}
                        >
                          {displayStats.pending}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            opacity: 0.9,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        >
                          Pending
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Welcome Banner */}
              <Collapse in={showWelcomeBanner}>
                <Card 
                  elevation={0}
                  sx={{ 
                    mb: { xs: 2, sm: 3, md: 4 },
                    background: darkMode
                      ? 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)'
                      : 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.8s ease-out',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(-20px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold" 
                          sx={{ 
                            mb: 1,
                            fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                          }}
                        >
                          Welcome back, {loggedInUsername}! 👋
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            opacity: 0.95, 
                            mb: 2,
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                          }}
                        >
                          Here's your treasury overview for today
                        </Typography>
                        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography 
                              variant="h6" 
                              fontWeight="bold"
                              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                            >
                              {stats.total}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                opacity: 0.9,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              }}
                            >
                              Total Receipts
                            </Typography>
                          </Box>
                          <Box>
                            <Typography 
                              variant="h6" 
                              fontWeight="bold"
                              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                            >
                              {hasRecognizedAmount
                                ? formatReceiptAmount(stats.totalAmount)
                                : 'Not detected'}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                opacity: 0.9,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              }}
                            >
                              Total Value
                            </Typography>
                          </Box>
                          <Box>
                            <Typography 
                              variant="h6" 
                              fontWeight="bold"
                              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                            >
                              {stats.pending}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                opacity: 0.9,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              }}
                            >
                              Needs Review
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <IconButton 
                        onClick={() => setShowWelcomeBanner(false)}
                        sx={{ 
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                          alignSelf: 'flex-start',
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                  {/* Decorative elements */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: { xs: 150, sm: 200 },
                      height: { xs: 150, sm: 200 },
                      borderRadius: '50%',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      display: { xs: 'none', sm: 'block' },
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: -30,
                      width: { xs: 100, sm: 150 },
                      height: { xs: 100, sm: 150 },
                      borderRadius: '50%',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      display: { xs: 'none', sm: 'block' },
                    }}
                  />
                </Card>
              </Collapse>

              {/* Table or Loading Skeletons or Empty State */}
              {loading ? (
                <Box>
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : filteredReceipts.length === 0 ? (
                <Card 
                  elevation={0}
                  sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    border: darkMode ? '2px dashed #333' : '2px dashed #e0e0e0',
                    borderRadius: 3,
                    bgcolor: darkMode ? '#2a2a2a' : '#fafafa',
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <ReceiptIcon sx={{ fontSize: 80, color: darkMode ? '#666' : '#bdbdbd' }} />
                  </Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: darkMode ? '#aaa' : '#757575' }}>
                    No Receipts Found
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3, color: darkMode ? '#888' : 'text.secondary' }}>
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Get started by uploading your first receipt'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<UploadFileIcon />}
                    onClick={() => navigate('/upload')}
                    sx={{
                      background: 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontSize: '1rem',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4A0E13 0%, #6B1C23 100%)',
                      }
                    }}
                  >
                    Upload Receipt
                  </Button>
                </Card>
              ) : (
                <ReceiptTable 
                  receipts={filteredReceipts} 
                  onUpdate={fetchReceipts}
                  darkMode={darkMode}
                />
              )}
                </>
              ) : currentView === 'admin-management' ? (
                <AdminManagement />
              ) : null}
            </>
          ) : null}
        </Box>
      </Box>
    </Box>

      {/* Login Dialog */}
      <Dialog 
        open={loginOpen} 
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
        fullScreen={false}
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            overflow: 'hidden',
            border: '1px solid rgba(33,28,25,0.12)',
            boxShadow: '0 28px 80px rgba(33,28,25,0.18)',
            m: { xs: 2, sm: 3 },
            maxWidth: { xs: 'calc(100% - 32px)', sm: 444 },
            maxHeight: 'calc(100% - 32px)',
            bgcolor: darkMode ? '#2a2a2a' : '#fffdfa',
          }
        }}
        BackdropProps={{
          sx: {
            background: 'rgba(33,28,25,0.25)',
            backdropFilter: 'blur(5px)',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: darkMode ? '#211c19' : '#f6f4f0',
            color: darkMode ? 'white' : '#211c19',
            textAlign: 'center',
            py: { xs: 2, sm: 2.5 },
            px: { xs: 2, sm: 3 },
            borderBottom: '1px solid rgba(33,28,25,0.1)',
          }}
        >
          <img 
            src="/necf-logo.png" 
            alt="NECF Logo" 
            style={{ 
              width: window.innerWidth < 600 ? '64px' : '72px',
              height: window.innerWidth < 600 ? '64px' : '72px',
              objectFit: 'contain',
              marginBottom: '8px'
            }} 
          />
          <Typography
            component="div"
            sx={{
              mb: 0.75,
              color: '#6b1c23',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            NECF / Treasury / Administration
          </Typography>
          <Typography 
            component="div"
            variant="h5" 
            fontWeight={600}
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.45rem' },
              letterSpacing: '-0.04em',
            }}
          >
            Treasury access
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, color: '#514a45' }}>
            Sign in to review receipts and records
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pt: 2.5, pb: 1.5 }}>
          {loginError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {loginError}
            </Alert>
          )}
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              margin="normal"
              required
              autoFocus
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: darkMode ? '#1e1e1e' : 'white',
                  '& input': {
                    color: darkMode ? 'white' : 'inherit',
                  },
                  '& fieldset': { borderColor: 'rgba(33,28,25,0.16)' },
                  '&:hover fieldset': { borderColor: 'rgba(107,28,35,0.5)' },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B1C23',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#aaa' : 'inherit',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#6B1C23',
                },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              margin="normal"
              required
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: darkMode ? '#1e1e1e' : 'white',
                  '& input': {
                    color: darkMode ? 'white' : 'inherit',
                  },
                  '& fieldset': { borderColor: 'rgba(33,28,25,0.16)' },
                  '&:hover fieldset': { borderColor: 'rgba(107,28,35,0.5)' },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B1C23',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: darkMode ? '#aaa' : 'inherit',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#6B1C23',
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 2.5,
            gap: 1.5,
            borderTop: '1px solid rgba(33,28,25,0.1)',
            bgcolor: darkMode ? '#1e1e1e' : '#fffdfa',
          }}
        >
          <Button 
            onClick={() => navigate('/')}
            sx={{ 
              textTransform: 'none',
              borderRadius: 999,
              px: 3,
              color: darkMode ? '#aaa' : 'inherit',
              border: '1px solid rgba(33,28,25,0.15)',
              '&:hover': {
                bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleLogin}
            size="large"
            sx={{
              background: '#6B1C23',
              textTransform: 'none',
              borderRadius: 999,
              px: 4,
              boxShadow: 'none',
              '&:hover': {
                background: '#4A0E13',
                boxShadow: '0 8px 20px rgba(107, 28, 35, 0.2)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Login
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      {isAuthenticated && (
        <Zoom in={fabVisible}>
          <Fab
            color="primary"
            aria-label="add receipt"
            onClick={() => navigate('/upload')}
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              background: 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
              color: 'white',
              width: 64,
              height: 64,
              boxShadow: '0 6px 20px rgba(107, 28, 35, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #4A0E13 0%, #6B1C23 100%)',
                transform: 'scale(1.08)',
                boxShadow: '0 8px 25px rgba(107, 28, 35, 0.36)',
              },
            }}
          >
            <AddIcon sx={{ fontSize: 32 }} />
          </Fab>
        </Zoom>
      )}
    </Box>
  );
}
