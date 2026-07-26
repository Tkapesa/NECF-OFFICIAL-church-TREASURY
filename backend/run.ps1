# Backend Setup and Run (Windows)
# Church Treasury System

Write-Host "🏗️  Setting up Church Treasury Backend..." -ForegroundColor Cyan

# Select compatible Python interpreter (prefer 3.12, then 3.11, then 3.10)
$PythonExe = $null
$PreferredVersions = @('3.12', '3.11', '3.10')

foreach ($ver in $PreferredVersions) {
    $candidate = Get-Command "py" -ErrorAction SilentlyContinue
    if ($candidate) {
        $path = (& py -$ver -c "import sys; print(sys.executable)" 2>$null)
        if ($LASTEXITCODE -eq 0 -and $path) {
            $PythonExe = $path.Trim()
            break
        }
    }
}

if (-not $PythonExe) {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd) {
        $version = (& python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null)
        if ($LASTEXITCODE -eq 0 -and $version) {
            $version = $version.Trim()
            if ($version -in @('3.10', '3.11', '3.12', '3.13')) {
                $PythonExe = (& python -c "import sys; print(sys.executable)" 2>$null).Trim()
            }
        }
    }
}

if (-not $PythonExe) {
    Write-Host "❌ Compatible Python not found." -ForegroundColor Red
    Write-Host "This backend requires Python 3.10-3.13 (3.14 is not compatible with current dependencies)." -ForegroundColor Yellow
    Write-Host "Install Python 3.12, then rerun this script." -ForegroundColor Yellow
    Write-Host "Download: https://www.python.org/downloads/release/python-31210/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Using Python: $PythonExe" -ForegroundColor Green

# Check if Tesseract is installed
if (!(Get-Command tesseract -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Tesseract OCR is not installed. Backend will start, but OCR extraction will be limited." -ForegroundColor Yellow
    Write-Host "Install from: https://github.com/UB-Mannheim/tesseract/wiki" -ForegroundColor Yellow
} else {
    Write-Host "✅ Tesseract found" -ForegroundColor Green
}

Write-Host "✅ Python runtime ready" -ForegroundColor Green

# Create virtual environment if it doesn't exist
if (!(Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Cyan
    & "$PythonExe" -m venv venv
}

# Activate virtual environment
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "📥 Installing Python dependencies..." -ForegroundColor Cyan
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Create uploads directory if it doesn't exist
if (!(Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" | Out-Null
}

Write-Host ""
Write-Host "✅ Backend setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting FastAPI server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "📝 Default admin credentials: username=admin, password=admin123" -ForegroundColor Yellow
Write-Host ""

# Run the server
python main.py
