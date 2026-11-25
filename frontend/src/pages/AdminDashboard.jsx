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
  Radio,
  RadioGroup,
  FormControlLabel,
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
import { selectReceiptsForExport } from '../utils/receiptExport';

const drawerWidth = 256;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));
const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

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
  const [showActivityTimeline, setShowActivityTimeline] = useState(true);
  const [fabVisible, setFabVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'admin-management'
  const [darkMode, setDarkMode] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportAttempted, setExportAttempted] = useState(false);

  useEffect(() => {
    setSelectedReceipts([]);
  }, [searchQuery, statusFilter, selectedCategory]);

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
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (token) {
      setIsAuthenticated(true);
      const superuserFromToken = getSuperuserFromToken();
      const resolvedSuperuser = savedSuperuser || superuserFromToken;
      setIsSuperuser(resolvedSuperuser);
      localStorage.setItem('is_superuser', String(resolvedSuperuser));
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
      setSelectedReceipts([]);

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

  const exportToCSV = (reportReceipts, exportDescription) => {
    // Prepare CSV data
    const headers = ['ID', 'Receipt Date', 'Receipt Time', 'Item/Description', 'Amount', 'Submitted By', 'Phone', 'Status', 'Approved By', 'Submission Date', 'Receipt File URL'];
    
    const csvData = reportReceipts.map(receipt => [
      receipt.id,
      receipt.ocr_date || '',
      receipt.ocr_time || '',
      receipt.item_bought || '',
      receipt.ocr_price ?? '',
      receipt.user_name || '',
      receipt.user_phone || '',
      receipt.approved_by && receipt.approved_by !== 'Pending' ? 'Approved' : 'Pending',
      receipt.approved_by || '',
      typeof receipt.created_at === 'string' ? receipt.created_at.slice(0, 10) : '',
      receipt.image_path || '',
    ]);

    // Calculate totals
    const totalAmount = reportReceipts.reduce((sum, r) => sum + (parseFloat(r.ocr_price) || 0), 0);
    const totalReceipts = reportReceipts.length;
    const approvedCount = reportReceipts.filter(r => r.approved_by && r.approved_by !== 'Pending').length;

    // Convert to CSV string with summary
    const csvContent = [
      '# NECF Treasury - Receipt Register',
      `# Generated: ${new Date().toLocaleString('tr-TR')}`,
      `# Selection: ${exportDescription}`,
      `# Total Receipts: ${totalReceipts}`,
      `# Approved Receipts: ${approvedCount}`,
      `# Total Amount: ₺${totalAmount.toFixed(2)}`,
      '# Receipt file links require access to the treasury server.',
      '',
      headers.join(','),
      ...csvData.map(row => row.map(csvCell).join(',')),
      '',
      '# Summary',
      `"Total Receipts","","","","${totalReceipts}","","","","","",""`,
      `"Total Amount","","","","₺${totalAmount.toFixed(2)}","","","","","",""`,
      `"Approved","","","","${approvedCount}","","","","","",""`,
      `"Pending","","","","${totalReceipts - approvedCount}","","","","","",""`,
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

  const exportToPDF = async (reportReceipts, exportDescription) => {
    setSnackbar({ open: true, message: 'Generating PDF report...', severity: 'info' });
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setSnackbar({ open: true, message: 'Allow pop-ups to generate the PDF report.', severity: 'error' });
      return;
    }

    printWindow.document.write('<!DOCTYPE html><title>Preparing report</title><p>Preparing receipt images...</p>');
    let receiptPages;
    try {
      receiptPages = await Promise.all(reportReceipts.map(async (receipt) => {
        const response = await api.get(`/receipts/${receipt.id}/pages`);
        if (!Array.isArray(response.data?.pages) || response.data.pages.length === 0 ||
            response.data.pages.some((url) => typeof url !== 'string' || !url)) {
          throw new Error(`Receipt #${receipt.id} has no printable pages.`);
        }
        return { receipt, pages: response.data.pages };
      }));
    } catch (error) {
      printWindow.close();
      console.error('Unable to prepare receipt pages:', error);
      setSnackbar({ open: true, message: 'Unable to load receipt pages. Check the receipts and try again.', severity: 'error' });
      return;
    }
    
    // Calculate totals
    const totalAmount = reportReceipts.reduce((sum, r) => sum + (parseFloat(r.ocr_price) || 0), 0);
    const totalReceipts = reportReceipts.length;
    const approvedCount = reportReceipts.filter(r => r.approved_by && r.approved_by !== 'Pending').length;
    const pendingCount = totalReceipts - approvedCount;

    // Get the logo as base64 or use the public path
    const logoPath = window.location.origin + '/necf-logo.png';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>NECF Treasury - Receipt Register</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            body { margin: 0; padding: 0; }
          }
          body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            padding: 20px;
            color: #242424;
            font-size: 11px;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 18px;
            margin-bottom: 18px;
            padding-bottom: 16px;
            border-bottom: 2px solid #6B1C23;
          }
          .header img {
            width: 64px;
            height: 64px;
            object-fit: contain;
          }
          .header h1 {
            color: #211c19;
            margin: 0 0 4px;
            font-size: 20px;
          }
          .header h2 {
            color: #625a54;
            margin: 0;
            font-size: 14px;
            font-weight: normal;
          }
          .meta-info {
            color: #625a54;
            font-size: 11px;
            margin-bottom: 20px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .summary-card {
            padding: 10px 0;
            border-top: 1px solid #b8aaa5;
          }
          .summary-card h3 {
            margin: 0 0 6px;
            font-size: 10px;
            color: #625a54;
            font-weight: normal;
          }
          .summary-card p {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            table-layout: fixed;
          }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          th {
            color: #6B1C23;
            padding: 8px 5px;
            border-bottom: 1px solid #6B1C23;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            overflow-wrap: anywhere;
          }
          td {
            padding: 8px 5px;
            border-bottom: 1px solid #e5dfdc;
            font-size: 10px;
            vertical-align: top;
            overflow-wrap: anywhere;
          }
          .status-approved {
            color: #285d38;
          }
          .status-pending {
            color: #77542f;
          }
          .total-row {
            font-weight: bold;
            border-top: 1px solid #6B1C23;
          }
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e5dfdc;
            color: #625a54;
            font-size: 10px;
          }
          .receipt-page {
            break-before: page;
            page-break-before: always;
            text-align: center;
          }
          .receipt-page h2 {
            color: #6B1C23;
            font-size: 13px;
            margin: 0 0 12px;
          }
          .receipt-page img {
            display: block;
            max-width: 100%;
            max-height: 9in;
            object-fit: contain;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoPath}" alt="NECF Logo" />
          <div>
            <h1>Near East Christian Fellowship</h1>
            <h2>Treasury receipt register</h2>
          </div>
        </div>
        
        <div class="meta-info">
          <strong>Generated:</strong> ${new Date().toLocaleString('tr-TR')}
          <br /><strong>Selection:</strong> ${escapeHtml(exportDescription)}
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Receipts</h3>
            <p>${totalReceipts}</p>
          </div>
          <div class="summary-card">
            <h3>Total Amount</h3>
            <p>${escapeHtml(formatReceiptAmount(totalAmount))}</p>
          </div>
          <div class="summary-card">
            <h3>Approved</h3>
            <p>${approvedCount}</p>
          </div>
          <div class="summary-card">
            <h3>Pending</h3>
            <p>${pendingCount}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Receipt date</th>
              <th>Submitted</th>
              <th>Item / description</th>
              <th>Amount</th>
              <th>Submitted by</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Approved by</th>
            </tr>
          </thead>
          <tbody>
            ${reportReceipts.map(receipt => `
              <tr>
                <td>#${escapeHtml(receipt.id)}</td>
                <td>${escapeHtml(receipt.ocr_date ? formatReceiptDate(receipt.ocr_date) : 'Not detected')}</td>
                <td>${escapeHtml(typeof receipt.created_at === 'string' ? receipt.created_at.slice(0, 10) : '-')}</td>
                <td>${escapeHtml(receipt.item_bought || '-')}</td>
                <td>${escapeHtml(formatReceiptAmount(receipt.ocr_price))}</td>
                <td>${escapeHtml(receipt.user_name || '-')}</td>
                <td>${escapeHtml(receipt.user_phone || '-')}</td>
                <td>
                  <span class="${receipt.approved_by && receipt.approved_by !== 'Pending' ? 'status-approved' : 'status-pending'}">
                    ${receipt.approved_by && receipt.approved_by !== 'Pending' ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td>${escapeHtml(receipt.approved_by || '-')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4"><strong>TOTAL</strong></td>
              <td><strong>${escapeHtml(formatReceiptAmount(totalAmount))}</strong></td>
              <td colspan="4"><strong>${totalReceipts} receipts</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Near East Christian Fellowship · Treasury</p>
          <p>Receipt images follow. Check extracted details against the originals.</p>
        </div>
        ${receiptPages.flatMap(({ receipt, pages }) => pages.map((url, index) => `
          <section class="receipt-page">
            <h2>Receipt #${escapeHtml(receipt.id)} — page ${index + 1} of ${pages.length}</h2>
            <img src="${escapeHtml(url)}" alt="Receipt #${escapeHtml(receipt.id)}, page ${index + 1}" />
          </section>
        `)).join('')}
      </body>
      </html>
    `;

    try {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      await Promise.all(Array.from(printWindow.document.images, (image) => image.decode()));
      await printWindow.document.fonts.ready;
      printWindow.focus();
      printWindow.print();
      setSnackbar({ open: true, message: 'Report ready. Choose Save as PDF in the print dialog.', severity: 'info' });
    } catch (error) {
      printWindow.close();
      console.error('Unable to load report images:', error);
      setSnackbar({ open: true, message: 'Unable to load all receipt images. The report was not printed.', severity: 'error' });
    }
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

  const exportSelection = selectReceiptsForExport(filteredReceipts, {
    scope: exportScope,
    selectedIds: selectedReceipts,
    startDate: exportStartDate,
    endDate: exportEndDate,
  });

  const openExportDialog = (format) => {
    setExportFormat(format);
    setExportScope(selectedReceipts.length ? 'selected' : 'all');
    setExportAttempted(false);
    setExportDialogOpen(true);
  };

  const handleExport = () => {
    setExportAttempted(true);
    if (exportSelection.error) return;
    setExportDialogOpen(false);
    const description = exportScope === 'date'
      ? `Submission dates ${exportStartDate} to ${exportEndDate} (inclusive)`
      : exportScope === 'selected' ? 'Selected receipts' : 'All visible receipts';
    if (exportFormat === 'csv') {
      exportToCSV(exportSelection.receipts, description);
    } else {
      exportToPDF(exportSelection.receipts, description);
    }
  };

  // Calculate statistics
  const stats = {
    total: safeReceipts.length,
    totalAmount: safeReceipts.reduce((sum, r = {}) => sum + (parseFloat(r.ocr_price) || 0), 0),
    approved: safeReceipts.filter(r => r && r.approved_by && r.approved_by !== 'Pending').length,
    pending: safeReceipts.filter(r => !r || !r.approved_by || r.approved_by === 'Pending').length,
  };
  const recentReceipts = [...safeReceipts]
    .sort((left, right) => {
      const timestamp = (receipt) =>
        Date.parse(receipt?.created_at || '') || Number(receipt?.id) || 0;
      return timestamp(right) - timestamp(left);
    })
    .slice(0, 5);

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

          <Box sx={{ gridArea: 'intro', position: 'relative', zIndex: 1, width: '100%', maxWidth: 700, justifySelf: { xs: 'center', lg: 'start' } }}>
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
                fontSize: 'clamp(2rem, 4vw, 2.125rem)',
                fontWeight: 500,
                lineHeight: 1.12,
                letterSpacing: '-0.025em',
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
              maxWidth: { xs: 640, lg: 480 },
              justifySelf: { xs: 'center', lg: 'end' },
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
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
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
              width: 32,
              height: 32,
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
      <List sx={{ px: 1.5, py: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.25 }}>
          <ListItemButton 
            selected={currentView === 'dashboard'}
            onClick={() => { setCurrentView('dashboard'); setMobileOpen(false); }}
            sx={{
              borderRadius: 2,
              py: 0.5,
              '&.Mui-selected': {
                background: 'linear-gradient(90deg, #6b1c23, #4a0e13)',
                '&:hover': { background: 'linear-gradient(90deg, #5a181e, #3c0c0f)' },
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 0.25 }}>
          <ListItemButton 
            onClick={() => { navigate('/upload'); setMobileOpen(false); }}
            sx={{
              borderRadius: 2,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
              <UploadFileIcon />
            </ListItemIcon>
            <ListItemText primary="Upload" primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        </ListItem>

        {/* Admin Management - Only visible to superusers */}
        {isSuperuser && (
          <ListItem disablePadding sx={{ mb: 0.25 }}>
            <ListItemButton 
              selected={currentView === 'admin-management'}
              onClick={() => { setCurrentView('admin-management'); setMobileOpen(false); }}
              sx={{
                borderRadius: 2,
                py: 0.5,
                '&.Mui-selected': {
                  bgcolor: '#6B1C23',
                  '&:hover': { bgcolor: '#4A0E13' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
                <SupervisorAccountIcon />
              </ListItemIcon>
              <ListItemText primary="Admin Management" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          </ListItem>
        )}
      </List>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      {/* Categories */}
      <Box sx={{ px: 1.5, py: 1 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', px: 2, mb: 0.5, display: 'block' }}>
          CATEGORIES
        </Typography>
        <List disablePadding>
          {categories.map((category) => (
            <ListItem key={category.name} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                selected={selectedCategory === category.name}
                onClick={() => { setSelectedCategory(category.name); setMobileOpen(false); }}
                sx={{
                  borderRadius: 2,
                  py: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
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
      <Box sx={{ mt: 'auto', px: 1.5, py: 1 }}>
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 1 }} />
        
        {/* Dark Mode Toggle */}
        <ListItem disablePadding sx={{ mb: 0.25 }}>
          <ListItemButton 
            onClick={toggleDarkMode}
            sx={{
              borderRadius: 2,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText primary={darkMode ? 'Light Mode' : 'Dark Mode'} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => { handleLogout(); setMobileOpen(false); }}
            sx={{
              borderRadius: 2,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ variant: 'body2' }} />
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
                fontSize: 'clamp(2rem, 4vw, 2.125rem)',
                fontWeight: 500,
                lineHeight: 1.12,
                letterSpacing: '-0.025em',
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
                  overscrollBehavior: 'contain',
                  scrollbarWidth: 'thin',
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
                  overscrollBehavior: 'contain',
                  scrollbarWidth: 'thin',
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
                    Treasury dashboard
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: darkMode ? '#aaa' : '#746b64', letterSpacing: '0.02em' }}
                  >
                    Overview of receipt status and recent activity
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
                  onClick={() => openExportDialog('csv')}
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
                  onClick={() => openExportDialog('pdf')}
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
            minHeight: 0,
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
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: darkMode ? '#c9a4a7' : '#6b1c23',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                  }}
                >
                  Current status
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: darkMode ? '#aaa' : '#746b64' }}
                >
                  At a glance, track submissions, approvals, and treasury value.
                </Typography>
              </Box>

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

              <Collapse in={showActivityTimeline}>
                <Card
                  elevation={0}
                  sx={{
                    mb: { xs: 2, sm: 3, md: 4 },
                    borderRadius: 3,
                    bgcolor: darkMode ? '#201b1a' : '#fffdfa',
                    color: darkMode ? '#fff' : '#211c19',
                    border: darkMode
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid rgba(107,28,35,0.12)',
                    boxShadow: '0 12px 32px rgba(33,28,25,0.045)',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Focus timeline
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: darkMode ? '#aaa' : '#746b64' }}
                        >
                          Recent receipt activity
                        </Typography>
                      </Box>
                      <IconButton
                        aria-label="Hide recent activity"
                        onClick={() => setShowActivityTimeline(false)}
                        sx={{ color: darkMode ? '#ddd' : '#6b1c23' }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>

                    {recentReceipts.length === 0 ? (
                      <Typography
                        variant="body2"
                        sx={{ py: 2, color: darkMode ? '#aaa' : '#746b64' }}
                      >
                        Receipt activity will appear here after the first upload.
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          ml: 1,
                          pl: 2.5,
                          borderLeft: `2px solid ${darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(107,28,35,0.16)'}`,
                        }}
                      >
                        {recentReceipts.map((receipt, index) => {
                          const approved = Boolean(
                            receipt?.approved_by && receipt.approved_by !== 'Pending',
                          );

                          return (
                            <Box
                              key={receipt?.id ?? `recent-${index}`}
                              sx={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                py: 1.25,
                                borderBottom:
                                  index < recentReceipts.length - 1
                                    ? `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(33,28,25,0.07)'}`
                                    : 'none',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  left: -31,
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  bgcolor: approved ? '#6b1c23' : (darkMode ? '#aaa' : '#b8a9a2'),
                                  border: `3px solid ${darkMode ? '#201b1a' : '#fffdfa'}`,
                                },
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                  {receipt?.item_bought || `Receipt #${receipt?.id ?? ''}`}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: darkMode ? '#aaa' : '#746b64' }}
                                >
                                  {receipt?.user_name || 'Unknown submitter'} ·{' '}
                                  {formatReceiptDate(receipt?.created_at || receipt?.ocr_date)}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatReceiptAmount(receipt?.ocr_price)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: approved ? '#6b1c23' : (darkMode ? '#c9a4a7' : '#746b64') }}
                                >
                                  {approved ? 'Approved' : 'Pending'}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </CardContent>
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
                  selectedReceipts={selectedReceipts}
                  setSelectedReceipts={setSelectedReceipts}
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

      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="export-dialog-title"
      >
        <DialogTitle id="export-dialog-title">
          Export {exportFormat.toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Choose from the receipts shown by the current search and filters. Changing filters clears your selection.
          </Typography>
          <RadioGroup
            aria-label="Receipts to export"
            value={exportScope}
            onChange={(event) => {
              setExportScope(event.target.value);
              setExportAttempted(false);
            }}
          >
            <FormControlLabel value="all" control={<Radio />} label={`All visible receipts (${filteredReceipts.length})`} />
            <FormControlLabel value="selected" control={<Radio />} label={`Selected receipts (${selectedReceipts.length})`} />
            <FormControlLabel value="date" control={<Radio />} label="Submission date range" />
          </RadioGroup>
          {exportScope === 'date' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
              <TextField
                label="From"
                type="date"
                value={exportStartDate}
                onChange={(event) => { setExportStartDate(event.target.value); setExportAttempted(false); }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="To"
                type="date"
                value={exportEndDate}
                onChange={(event) => { setExportEndDate(event.target.value); setExportAttempted(false); }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Typography variant="caption" sx={{ gridColumn: '1 / -1', color: 'text.secondary' }}>
                Both dates are included. Dates use the submission date recorded by the server.
              </Typography>
            </Box>
          )}
          {exportScope === 'date' && exportSelection.missingDates > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {exportSelection.missingDates} receipt(s) without a valid submission date will be excluded.
            </Alert>
          )}
          {exportAttempted && exportSelection.error ? (
            <Alert severity="error" sx={{ mt: 2 }}>{exportSelection.error}</Alert>
          ) : !exportSelection.error && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {exportSelection.receipts.length} receipt(s) will be exported.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleExport}>Export {exportFormat.toUpperCase()}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? null : 5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

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
