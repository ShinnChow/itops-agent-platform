# daima 项目 Git pre-commit hook
# 在每次 commit 之前自动运行架构检查
#
# 安装方式（Windows PowerShell 以管理员身份运行）：
#   Copy-Item scripts\pre-commit.ps1 .git\hooks\pre-commit.ps1
#
# 或使用 Git Bash：
#   cp scripts/pre-commit.ps1 .git/hooks/pre-commit

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  daima Architecture Pre-Commit Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 只检查已暂存的文件中有没有架构违规
# 运行架构检查脚本
$result = node scripts/check-architecture.js 2>&1
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "  PASSED - Architecture check passed" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-Host "  FAILED - Architecture check found violations!" -ForegroundColor Red
    Write-Host "  Please fix the issues above before committing." -ForegroundColor Red
    Write-Host "  To skip this check (NOT recommended): git commit --no-verify" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
