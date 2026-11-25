/**
 * Receipt Upload Form Component (User Side)
 */
import { useState, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  InputAdornment,
  Fade,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../api';
import { formatReceiptAmount, formatReceiptDate } from '../utils/receiptFormatting';

const isPdfFile = (file) =>
  file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');

export default function ReceiptUploadForm() {
  const [formData, setFormData] = useState({
    user_name: '',
    user_phone: '',
    item_bought: '',
    approved_by: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});
  
  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation (at least 2 words)
    if (!formData.user_name.trim()) {
      newErrors.user_name = 'Name is required';
    } else if (formData.user_name.trim().split(' ').length < 2) {
      newErrors.user_name = 'Please enter your full name (first and last name)';
    }
    
    // Phone validation (at least 10 digits)
    const phoneDigits = formData.user_phone.replace(/\D/g, '');
    if (!formData.user_phone.trim()) {
      newErrors.user_phone = 'Phone number is required';
    } else if (phoneDigits.length < 10) {
      newErrors.user_phone = 'Phone number must be at least 10 digits';
    }
    
    // Item description validation
    if (!formData.item_bought.trim()) {
      newErrors.item_bought = 'Item description is required';
    } else if (formData.item_bought.trim().length < 3) {
      newErrors.item_bought = 'Please provide a more detailed description';
    }
    
    // Approved by validation
    if (!formData.approved_by.trim()) {
      newErrors.approved_by = 'Approver name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraOpen(true);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Camera access error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Unable to access camera. Please check permissions.' 
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(() => startCamera(), 100);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImage(file);
        setImagePreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isPdf = isPdfFile(file);

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Receipt files must be 5 MB or smaller' });
        return;
      }
      
      if (!isPdf && !file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please upload a valid image or PDF file' });
        return;
      }
      
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors below' });
      return;
    }
    
    if (!image) {
      setMessage({ type: 'error', text: 'Please upload or capture a receipt image first.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Create FormData for multipart upload
      const data = new FormData();
      data.append('image', image);
      data.append('user_name', formData.user_name);
      data.append('user_phone', formData.user_phone);
      data.append('item_bought', formData.item_bought);
      data.append('approved_by', formData.approved_by);

      const response = await api.post('/receipts/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const payload = response.data;
      if (!payload || typeof payload !== 'object' || !payload.receipt_id) {
        throw new Error(
          'Upload did not reach the backend API. Please refresh and try again, or contact support.'
        );
      }

      const ocr = payload.ocr_data || {};
      const ocrBits = [
        ocr.ocr_price !== null && ocr.ocr_price !== undefined
          ? formatReceiptAmount(ocr.ocr_price)
          : null,
        ocr.ocr_date ? formatReceiptDate(ocr.ocr_date) : null,
        ocr.ocr_time || null,
      ].filter(Boolean);
      const ocrNote = ocrBits.length
        ? ` OCR detected: ${ocrBits.join(', ')}.${ocrBits.length < 3 ? ' The treasury team can review any missing values.' : ''}`
        : String(ocr.ocr_raw_text || '').startsWith('OCR unavailable:')
          ? ' OCR is not available on the server. The image was saved for manual review.'
          : ' OCR could not detect price, date, or time. The image was saved for manual review.';

      setMessage({
        type: 'success',
        text: `${payload.message || 'Receipt uploaded successfully'} (Receipt #${payload.receipt_id}).${ocrNote}`,
      });
      
      // Reset form
      setFormData({ user_name: '', user_phone: '', item_bought: '', approved_by: '' });
      setImage(null);
      setImagePreview(null);
    } catch (error) {
      const isNetworkError = !error.response;
      setMessage({
        type: 'error',
        text: isNetworkError
          ? 'Cannot reach the backend server. Please start the backend service and try again.'
          : error.response?.data?.detail || 'Upload failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      elevation={0}
      sx={{ 
        maxWidth: 700, 
        mx: 'auto',
        borderRadius: { xs: 3, md: 4 },
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'rgba(33, 28, 25, 0.12)',
        background: '#ffffff',
        boxShadow: '0 20px 60px rgba(33, 28, 25, 0.08)',
        position: 'relative',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #6B1C23 0%, #8B2B35 50%, #6B1C23 100%)',
        },
      }}
    >
      {/* Header Section */}
      <Box 
        sx={{ 
          background: '#f1eee8',
          color: '#211c19',
          p: { xs: 3, sm: 3.5, md: 4 },
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(33, 28, 25, 0.08)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: { xs: 140, sm: 180 },
            height: { xs: 140, sm: 180 },
            borderRadius: '50%',
            bgcolor: 'rgba(107, 28, 35, 0.045)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: { xs: 100, sm: 130 },
            height: { xs: 100, sm: 130 },
            borderRadius: '50%',
            bgcolor: 'rgba(107, 28, 35, 0.035)',
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center" sx={{ mb: 1 }}>
            <Box 
              sx={{ 
                bgcolor: 'rgba(107, 28, 35, 0.09)',
                color: '#6B1C23',
                p: { xs: 1, sm: 1.5 },
                borderRadius: 2,
                display: 'flex'
              }}
            >
              <CloudUploadIcon sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} />
            </Box>
            <Box>
              <Typography 
                variant="h5" 
                fontWeight="bold"
                sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem', md: '1.5rem' } }}
              >
                Submit a receipt
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#625a54',
                  fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.875rem' },
                }}
              >
                Add your receipt and the details below.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      <CardContent sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
        {message.text && (
          <Zoom in={!!message.text}>
            <Alert 
              severity={message.type} 
              sx={{ 
                mb: { xs: 2.5, sm: 3 },
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: { xs: '0.85rem', sm: '0.875rem' },
              }}
              icon={message.type === 'success' ? <CheckCircleIcon /> : undefined}
            >
              {message.text}
            </Alert>
          </Zoom>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Image Upload Section */}
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 2, sm: 2.5, md: 3 },
              mb: { xs: 2.5, sm: 3 },
              border: '1px dashed',
              borderColor: image ? '#6B1C23' : 'rgba(107, 28, 35, 0.35)',
              borderRadius: { xs: 2, md: 3 },
              bgcolor: image ? 'rgba(107, 28, 35, 0.02)' : 'transparent',
              background: '#faf7f4',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#6B1C23',
                bgcolor: 'rgba(107, 28, 35, 0.02)',
                boxShadow: '0 8px 24px rgba(107, 28, 35, 0.12)',
              },
            }}
          >
            <Typography 
              component="h2"
              sx={{ 
                mb: 0.5,
                fontSize: '1.25rem',
                fontWeight: 600,
              }}
            >
              {image ? 'Receipt selected' : 'Add your receipt'}
            </Typography>
            <Typography sx={{ mb: 2.5, color: '#625a54', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Upload a file or take a clear photo of your receipt.
            </Typography>

            {/* Camera and Upload Buttons */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              sx={{ mb: imagePreview ? { xs: 1.5, sm: 2 } : 0 }}
            >
              <Button
                variant={image ? "outlined" : "contained"}
                component="label"
                fullWidth
                size="large"
                startIcon={<CloudUploadIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
                sx={{ 
                  py: { xs: 1.5, sm: 1.8, md: 2 },
                  background: image ? 'transparent' : 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
                  borderColor: '#6B1C23',
                  color: image ? '#6B1C23' : 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                  letterSpacing: '0.3px',
                  textTransform: 'none',
                  '&:hover': {
                    background: image ? 'rgba(107, 28, 35, 0.08)' : 'linear-gradient(135deg, #4A0E13 0%, #6B1C23 100%)',
                    borderColor: '#4A0E13',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(107, 28, 35, 0.3)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {image ? 'Change File' : 'Upload Image or PDF'}
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleImageChange}
                />
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<CameraAltIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
                onClick={startCamera}
                sx={{ 
                  py: { xs: 1.5, sm: 1.8, md: 2 },
                  background: 'transparent',
                  borderColor: '#6B1C23',
                  color: '#6B1C23',
                  fontWeight: 'bold',
                  fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                  letterSpacing: '0.3px',
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(107, 28, 35, 0.08)',
                    borderColor: '#4A0E13',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(107, 28, 35, 0.3)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Take Photo
              </Button>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 0.5, sm: 2 }}
              sx={{ mt: { xs: 1.5, sm: 2 }, color: '#625a54' }}
            >
              <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                Images or PDF, up to 5 MB. PDFs may contain up to 5 pages.
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                Tip: Use bright, even lighting.
              </Typography>
            </Stack>

            {image && (
              <Fade in={!!image}>
                <Box 
                  sx={{ 
                    textAlign: 'center',
                    position: 'relative',
                    mt: 2,
                    padding: 1,
                    borderRadius: 2,
                    border: '1px solid rgba(107, 28, 35, 0.15)',
                    background: 'rgba(255,255,255,0.7)',
                    '& img': {
                      transition: 'transform 0.3s ease',
                    },
                    '&:hover img': {
                      transform: 'scale(1.02)',
                    },
                  }}
                >
                  {isPdfFile(image) ? (
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <PictureAsPdfIcon color="error" />
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        {image.name}
                      </Typography>
                    </Stack>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Receipt Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 300,
                        borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      }}
                    />
                  )}
                  <Chip 
                    icon={isPdfFile(image) ? <PictureAsPdfIcon /> : <CheckCircleIcon />}
                    label={isPdfFile(image) ? 'PDF selected' : 'Image uploaded'}
                    color="success"
                    size="small"
                    sx={{ 
                      mt: 2,
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              </Fade>
            )}
          </Paper>

          <Box sx={{ mb: 3, pt: 1 }}>
            <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
              Purchase details
            </Typography>
            <Typography sx={{ mt: 0.5, color: '#625a54', fontSize: '0.9rem', lineHeight: 1.5 }}>
              All fields are required.
            </Typography>
          </Box>

          {/* Form Fields with Icons */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 2.5, sm: 3 } }}>
            <TextField
              fullWidth
              label="Your Full Name"
              name="user_name"
              autoComplete="name"
              value={formData.user_name}
              onChange={handleInputChange}
              required
              error={!!errors.user_name}
              helperText={errors.user_name || 'Enter your first and last name'}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: errors.user_name ? '#d32f2f' : '#6B1C23', fontSize: { xs: 20, sm: 24 } }} />
                  </InputAdornment>
                ),
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              InputLabelProps={{
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.1)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B1C23',
                    borderWidth: '2px',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Phone Number"
              name="user_phone"
              type="tel"
              autoComplete="tel"
              value={formData.user_phone}
              onChange={handleInputChange}
              required
              error={!!errors.user_phone}
              helperText={errors.user_phone || 'Example: +90 532 123 45 67'}
              variant="outlined"
              placeholder="+90 532 123 45 67"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon sx={{ color: errors.user_phone ? '#d32f2f' : '#6B1C23', fontSize: { xs: 20, sm: 24 } }} />
                  </InputAdornment>
                ),
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              InputLabelProps={{
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.1)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B1C23',
                    borderWidth: '2px',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Item(s) Bought / Description"
              name="item_bought"
              value={formData.item_bought}
              onChange={handleInputChange}
              required
              error={!!errors.item_bought}
              helperText={errors.item_bought || 'Describe what was purchased in detail'}
              multiline
              rows={3}
              variant="outlined"
              placeholder="Describe what was purchased"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                    <ShoppingCartIcon sx={{ color: errors.item_bought ? '#d32f2f' : '#6B1C23', fontSize: { xs: 20, sm: 24 } }} />
                  </InputAdornment>
                ),
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              InputLabelProps={{
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              sx={{
                gridColumn: { sm: '1 / -1' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.1)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B1C23',
                    borderWidth: '2px',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Approved By (Name)"
              name="approved_by"
              value={formData.approved_by}
              onChange={handleInputChange}
              required
              error={!!errors.approved_by}
              helperText={errors.approved_by || 'Name of person who approved purchase'}
              variant="outlined"
              placeholder="Name of person who approved purchase"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CheckCircleIcon sx={{ color: errors.approved_by ? '#d32f2f' : '#6B1C23', fontSize: { xs: 20, sm: 24 } }} />
                  </InputAdornment>
                ),
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              InputLabelProps={{
                sx: {
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }
              }}
              sx={{
                gridColumn: { sm: '1 / -1' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.1)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 12px rgba(107, 28, 35, 0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B1C23',
                    borderWidth: '2px',
                  },
                },
              }}
            />
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || !image}
            endIcon={loading ? null : <SendIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
            sx={{ 
              mt: { xs: 3, sm: 3.5, md: 4 },
              py: { xs: 1.8, sm: 2 },
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
              fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' },
              fontWeight: 'bold',
              textTransform: 'none',
              boxShadow: '0 6px 20px rgba(107, 28, 35, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              minHeight: { xs: 48, sm: 54 },
              '&:hover': {
                background: 'linear-gradient(135deg, #4A0E13 0%, #6B1C23 100%)',
                transform: 'translateY(-3px)',
                boxShadow: '0 8px 30px rgba(107, 28, 35, 0.4)',
              },
              '&:active': {
                transform: 'translateY(-1px)',
              },
              '&.Mui-disabled': {
                background: 'linear-gradient(135deg, #cccccc 0%, #999999 100%)',
                color: 'white',
              },
            }}
          >
            {loading ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress
                  color="inherit"
                  sx={{
                    width: { xs: 20, sm: 24 },
                    height: { xs: 20, sm: 24 },
                  }}
                />
                <span>Submitting...</span>
              </Stack>
            ) : (
              'Submit Receipt'
            )}
          </Button>

          {/* Helper Text */}
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              display: 'block', 
              textAlign: 'center', 
              mt: 2,
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
            }}
          >
            All fields are required. Your receipt will be reviewed by the treasury team.
          </Typography>
        </Box>
      </CardContent>

      {/* Camera Dialog */}
      <Dialog
        open={cameraOpen}
        onClose={stopCamera}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            overflow: 'hidden',
            bgcolor: '#000',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: '#1a1a1a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CameraAltIcon />
            <Typography variant="h6" fontWeight="bold">
              Take Photo
            </Typography>
          </Box>
          <IconButton 
            onClick={stopCamera}
            sx={{ 
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent 
          sx={{ 
            p: 0, 
            bgcolor: '#000',
            position: 'relative',
            aspectRatio: { xs: '3/4', sm: '4/3' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {/* Camera overlay guides */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '3px solid rgba(255,255,255,0.3)',
              borderRadius: 2,
              margin: { xs: 2, sm: 4 },
              pointerEvents: 'none',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -3,
                left: -3,
                right: -3,
                bottom: -3,
                border: '40px solid rgba(0,0,0,0.3)',
                borderRadius: 2,
              }
            }}
          />

          {/* Helper text */}
          <Typography
            sx={{
              position: 'absolute',
              top: { xs: 16, sm: 24 },
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 3,
              py: 1,
              borderRadius: 2,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Position receipt within frame
          </Typography>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>

        <DialogActions 
          sx={{ 
            bgcolor: '#1a1a1a',
            p: { xs: 2, sm: 3 },
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<FlipCameraAndroidIcon />}
            onClick={switchCamera}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              textTransform: 'none',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Switch Camera
          </Button>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<CameraAltIcon />}
            onClick={capturePhoto}
            sx={{
              background: 'linear-gradient(135deg, #6B1C23 0%, #4A0E13 100%)',
              px: 4,
              py: 1.5,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              fontWeight: 'bold',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #4A0E13 0%, #6B1C23 100%)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Capture
          </Button>

          <Button
            variant="outlined"
            onClick={stopCamera}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              textTransform: 'none',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
