param(
    [string]$RemoteUrl = "https://github.com/Tkapesa/NECF-OFFICIAL-church-TREASURY.git",
    [string]$Branch = "main",
    [string]$CommitMessage = "ui: polish admin dashboard and receipt table styles"
)

Set-Location (Split-Path -Path $MyInvocation.MyCommand.Path -Parent)
Write-Output "Repository: $PWD"

# Ensure git available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git not found in PATH"
    exit 1
}

# Add remote (remove existing origin first)
try { git remote remove origin 2>$null } catch {}

git remote add origin $RemoteUrl

# Stage and commit
git add -A
$commit = git commit -m $CommitMessage 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "No new commit created (maybe no changes): $commit"
} else {
    Write-Output "Committed: $commit"
}

# Ensure branch name and push
git branch -M $Branch
Write-Output "Pushing to $RemoteUrl ($Branch)"

# Perform push
git push -u origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push failed. Check credentials or remote history conflicts.";
    exit 2
}

Write-Output "Push completed successfully."