<#
.SYNOPSIS
  daima 模块化重构 —— 自动建目录 + 搬文件 + 输出 import 改动清单
.DESCRIPTION
  用法:
    1. cd daima
    2. powershell -ExecutionPolicy Bypass -File scripts\reorganize.ps1
  执行后:
    - 创建所有模块目录
    - 把路由/服务/中间件/工具搬到对应的模块目录下
    - 输出一份 IMPORT_CHANGES.txt，列出所有需要改 import 路径的文件
    - 不改任何文件内容，只搬文件
#>

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"
$CHANGES = Join-Path $ROOT "IMPORT_CHANGES.txt"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  daima 模块化重构 - 文件迁移工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 第一步：创建目录结构
# ============================================================
Write-Host "[1/4] 创建目录结构..." -ForegroundColor Yellow

# 后端模块
$BACKEND_MODULES = @(
    "auth", "servers", "network", "alerts", "ai", "dc",
    "workflow", "containers", "infra",
    "monitor", "database", "auto", "kubernetes"
)
$BACKEND_SUBDIRS = @("routes", "services", "middleware")

foreach ($mod in $BACKEND_MODULES) {
    foreach ($sub in $BACKEND_SUBDIRS) {
        $dir = Join-Path $BACKEND "src\modules\$mod\$sub"
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    }
}

# 共享目录
$SHARED_DIRS = @("middleware", "types", "utils", "constants", "websocket", "schemas")
foreach ($sdir in $SHARED_DIRS) {
    $dir = Join-Path $BACKEND "src\shared\$sdir"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

# AI prompts 目录
$promptDir = Join-Path $BACKEND "src\modules\ai\prompts"
if (-not (Test-Path $promptDir)) { New-Item -ItemType Directory -Path $promptDir -Force | Out-Null }

# 前端特性目录
$FRONTEND_FEATURES = @(
    "auth", "servers", "network", "alerts", "ai", "dcim",
    "workflow", "containers", "infra", "monitor", "database", "auto", "kubernetes"
)
foreach ($feat in $FRONTEND_FEATURES) {
    foreach ($sub in @("pages", "components", "hooks")) {
        $dir = Join-Path $FRONTEND "src\features\$feat\$sub"
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    }
}

Write-Host "     目录创建完成" -ForegroundColor Green

# ============================================================
# 第二步：定义文件映射
# ============================================================
Write-Host "[2/4] 定义文件映射..." -ForegroundColor Yellow

$MAPPINGS = @(
    # --- auth ---
    @{s="routes\authRoutes.ts"; d="modules\auth\routes\authRoutes.ts"}
    @{s="routes\userRoutes.ts"; d="modules\auth\routes\userRoutes.ts"}
    @{s="services\credentialService.ts"; d="modules\auth\services\credentialService.ts"}
    @{s="services\credentialService.test.ts"; d="modules\auth\services\credentialService.test.ts"}
    @{s="services\encryptionService.ts"; d="modules\auth\services\encryptionService.ts"}
    @{s="services\encryptionService.test.ts"; d="modules\auth\services\encryptionService.test.ts"}
    @{s="services\loginThrottler.ts"; d="modules\auth\services\loginThrottler.ts"}
    @{s="services\loginThrottler.test.ts"; d="modules\auth\services\loginThrottler.test.ts"}
    @{s="services\tokenBlacklist.ts"; d="modules\auth\services\tokenBlacklist.ts"}
    @{s="services\tokenBlacklist.test.ts"; d="modules\auth\services\tokenBlacklist.test.ts"}

    # --- servers ---
    @{s="routes\serverRoutes.ts"; d="modules\servers\routes\serverRoutes.ts"}
    @{s="routes\serverGroupRoutes.ts"; d="modules\servers\routes\serverGroupRoutes.ts"}
    @{s="routes\serverManagementRoutes.ts"; d="modules\servers\routes\serverManagementRoutes.ts"}
    @{s="routes\serverCommandRoutes.ts"; d="modules\servers\routes\serverCommandRoutes.ts"}
    @{s="routes\sshKeyRoutes.ts"; d="modules\servers\routes\sshKeyRoutes.ts"}
    @{s="services\sshService.ts"; d="modules\servers\services\sshService.ts"}
    @{s="services\sshService.test.ts"; d="modules\servers\services\sshService.test.ts"}
    @{s="services\serverImportService.ts"; d="modules\servers\services\serverImportService.ts"}
    @{s="services\serverImportService.test.ts"; d="modules\servers\services\serverImportService.test.ts"}
    @{s="services\serverInfoCollector.ts"; d="modules\servers\services\serverInfoCollector.ts"}
    @{s="services\serverInfoCollector.test.ts"; d="modules\servers\services\serverInfoCollector.test.ts"}

    # --- network ---
    @{s="routes\networkDeviceRoutes.ts"; d="modules\network\routes\networkDeviceRoutes.ts"}
    @{s="routes\networkDiscoveryRoutes.ts"; d="modules\network\routes\networkDiscoveryRoutes.ts"}
    @{s="routes\networkSubnetRoutes.ts"; d="modules\network\routes\networkSubnetRoutes.ts"}
    @{s="routes\networkAdvancedRoutes.ts"; d="modules\network\routes\networkAdvancedRoutes.ts"}
    @{s="routes\topologyRoutes.ts"; d="modules\network\routes\topologyRoutes.ts"}
    @{s="routes\snmpRoutes.ts"; d="modules\network\routes\snmpRoutes.ts"}
    @{s="routes\vncRoutes.ts"; d="modules\network\routes\vncRoutes.ts"}
    @{s="services\networkDeviceService.ts"; d="modules\network\services\networkDeviceService.ts"}
    @{s="services\networkDiscoveryService.ts"; d="modules\network\services\networkDiscoveryService.ts"}
    @{s="services\networkInspectionService.ts"; d="modules\network\services\networkInspectionService.ts"}
    @{s="services\networkCommandGenerator.ts"; d="modules\network\services\networkCommandGenerator.ts"}
    @{s="services\networkResultParser.ts"; d="modules\network\services\networkResultParser.ts"}
    @{s="services\networkResultParser.test.ts"; d="modules\network\services\networkResultParser.test.ts"}
    @{s="services\lldpDiscoveryService.ts"; d="modules\network\services\lldpDiscoveryService.ts"}
    @{s="services\topologyService.ts"; d="modules\network\services\topologyService.ts"}
    @{s="services\snmpService.ts"; d="modules\network\services\snmpService.ts"}
    @{s="services\snmpPollingService.ts"; d="modules\network\services\snmpPollingService.ts"}
    @{s="services\snmpTrapService.ts"; d="modules\network\services\snmpTrapService.ts"}
    @{s="services\snmpOidRegistry.ts"; d="modules\network\services\snmpOidRegistry.ts"}
    @{s="services\vendorAdapter.ts"; d="modules\network\services\vendorAdapter.ts"}
    @{s="services\vendorAdapter.test.ts"; d="modules\network\services\vendorAdapter.test.ts"}

    # --- alerts ---
    @{s="routes\alertRoutes.ts"; d="modules\alerts\routes\alertRoutes.ts"}
    @{s="routes\alertMappingRoutes.ts"; d="modules\alerts\routes\alertMappingRoutes.ts"}
    @{s="routes\alertCorrelationRoutes.ts"; d="modules\alerts\routes\alertCorrelationRoutes.ts"}
    @{s="routes\alertNoiseRoutes.ts"; d="modules\alerts\routes\alertNoiseRoutes.ts"}
    @{s="routes\alertAutoRoutes.ts"; d="modules\alerts\routes\alertAutoRoutes.ts"}
    @{s="routes\alertAutoResponseRoutes.ts"; d="modules\alerts\routes\alertAutoResponseRoutes.ts"}
    @{s="services\alertService.ts"; d="modules\alerts\services\alertService.ts"}
    @{s="services\alertService.test.ts"; d="modules\alerts\services\alertService.test.ts"}
    @{s="services\alertNotificationService.ts"; d="modules\alerts\services\alertNotificationService.ts"}
    @{s="services\alertNotificationService.test.ts"; d="modules\alerts\services\alertNotificationService.test.ts"}
    @{s="services\alertCorrelationService.ts"; d="modules\alerts\services\alertCorrelationService.ts"}
    @{s="services\alertNoiseReductionService.ts"; d="modules\alerts\services\alertNoiseReductionService.ts"}
    @{s="services\alertAutoAnalyzer.ts"; d="modules\alerts\services\alertAutoAnalyzer.ts"}
    @{s="services\alertDeviceResolver.ts"; d="modules\alerts\services\alertDeviceResolver.ts"}
    @{s="services\alertProviderRegistry.ts"; d="modules\alerts\services\alertProviderRegistry.ts"}
    @{s="services\alertSourceAdapters.ts"; d="modules\alerts\services\alertSourceAdapters.ts"}
    @{s="services\alertWorkflowMappingService.ts"; d="modules\alerts\services\alertWorkflowMappingService.ts"}

    # --- ai ---
    @{s="routes\agentRoutes.ts"; d="modules\ai\routes\agentRoutes.ts"}
    @{s="routes\multiAgentRoutes.ts"; d="modules\ai\routes\multiAgentRoutes.ts"}
    @{s="routes\aiModelRoutes.ts"; d="modules\ai\routes\aiModelRoutes.ts"}
    @{s="routes\copilotRoutes.ts"; d="modules\ai\routes\copilotRoutes.ts"}
    @{s="routes\knowledgeRoutes.ts"; d="modules\ai\routes\knowledgeRoutes.ts"}
    @{s="routes\knowledgeQAnythingRoutes.ts"; d="modules\ai\routes\knowledgeQAnythingRoutes.ts"}
    @{s="routes\rootCauseAnalysisRoutes.ts"; d="modules\ai\routes\rootCauseAnalysisRoutes.ts"}
    @{s="routes\aiRemediationRoutes.ts"; d="modules\ai\routes\aiRemediationRoutes.ts"}
    @{s="services\agentExecutor.ts"; d="modules\ai\services\agentExecutor.ts"}
    @{s="services\agentExecutor.test.ts"; d="modules\ai\services\agentExecutor.test.ts"}
    @{s="services\agentToolRegistry.ts"; d="modules\ai\services\agentToolRegistry.ts"}
    @{s="services\llmService.ts"; d="modules\ai\services\llmService.ts"}
    @{s="services\llmService.test.ts"; d="modules\ai\services\llmService.test.ts"}
    @{s="services\multiAgentCollaboration.ts"; d="modules\ai\services\multiAgentCollaboration.ts"}
    @{s="services\multiAgentCollaboration.test.ts"; d="modules\ai\services\multiAgentCollaboration.test.ts"}
    @{s="services\copilotService.ts"; d="modules\ai\services\copilotService.ts"}
    @{s="services\enhancedRAGService.ts"; d="modules\ai\services\enhancedRAGService.ts"}
    @{s="services\qanythingService.ts"; d="modules\ai\services\qanythingService.ts"}
    @{s="services\rootCauseAnalysisService.ts"; d="modules\ai\services\rootCauseAnalysisService.ts"}
    @{s="services\rootCauseAnalysisService.test.ts"; d="modules\ai\services\rootCauseAnalysisService.test.ts"}
    @{s="services\aiRemediationService.ts"; d="modules\ai\services\aiRemediationService.ts"}
    @{s="services\localRuleEngine.ts"; d="modules\ai\services\localRuleEngine.ts"}
    @{s="services\localRuleEngine.test.ts"; d="modules\ai\services\localRuleEngine.test.ts"}
    @{s="services\aiModelService.ts"; d="modules\ai\services\aiModelService.ts"}
    @{s="services\aiModelService.test.ts"; d="modules\ai\services\aiModelService.test.ts"}

    # --- dc ---
    @{s="services\dcStatusService.ts"; d="modules\dc\services\dcStatusService.ts"}

    # --- containers ---
    @{s="routes\containerRoutes.ts"; d="modules\containers\routes\containerRoutes.ts"}
    @{s="routes\dockerRoutes.ts"; d="modules\containers\routes\dockerRoutes.ts"}
    @{s="routes\imageRoutes.ts"; d="modules\containers\routes\imageRoutes.ts"}
    @{s="routes\volumeRoutes.ts"; d="modules\containers\routes\volumeRoutes.ts"}
    @{s="routes\registryRoutes.ts"; d="modules\containers\routes\registryRoutes.ts"}
    @{s="routes\virtualMachineRoutes.ts"; d="modules\containers\routes\virtualMachineRoutes.ts"}
    @{s="routes\vmManagementRoutes.ts"; d="modules\containers\routes\vmManagementRoutes.ts"}
    @{s="routes\vmMigrationRoutes.ts"; d="modules\containers\routes\vmMigrationRoutes.ts"}
    @{s="services\dockerService.ts"; d="modules\containers\services\dockerService.ts"}
    @{s="services\containerLogService.ts"; d="modules\containers\services\containerLogService.ts"}
    @{s="services\containerMonitorService.ts"; d="modules\containers\services\containerMonitorService.ts"}
    @{s="services\multiHostDockerService.ts"; d="modules\containers\services\multiHostDockerService.ts"}
    @{s="services\vmMigrationService.ts"; d="modules\containers\services\vmMigrationService.ts"}
    @{s="services\vmSnapshotSchedulerService.ts"; d="modules\containers\services\vmSnapshotSchedulerService.ts"}

    # --- workflow ---
    @{s="routes\workflowRoutes.ts"; d="modules\workflow\routes\workflowRoutes.ts"}
    @{s="routes\taskRoutes.ts"; d="modules\workflow\routes\taskRoutes.ts"}
    @{s="routes\scheduledTaskRoutes.ts"; d="modules\workflow\routes\scheduledTaskRoutes.ts"}
    @{s="services\workflowExecutor.ts"; d="modules\workflow\services\workflowExecutor.ts"}
    @{s="services\workflowExecutor.test.ts"; d="modules\workflow\services\workflowExecutor.test.ts"}
    @{s="services\workflowExpressionEvaluator.ts"; d="modules\workflow\services\workflowExpressionEvaluator.ts"}
    @{s="services\workflowProviderRegistry.ts"; d="modules\workflow\services\workflowProviderRegistry.ts"}
    @{s="services\queueService.ts"; d="modules\workflow\services\queueService.ts"}
    @{s="services\queueService.test.ts"; d="modules\workflow\services\queueService.test.ts"}
    @{s="services\queueBullAdapter.ts"; d="modules\workflow\services\queueBullAdapter.ts"}
    @{s="services\schedulerService.ts"; d="modules\workflow\services\schedulerService.ts"}
    @{s="services\schedulerService.test.ts"; d="modules\workflow\services\schedulerService.test.ts"}

    # --- infra ---
    @{s="routes\settingsRoutes.ts"; d="modules\infra\routes\settingsRoutes.ts"}
    @{s="routes\configTemplateRoutes.ts"; d="modules\infra\routes\configTemplateRoutes.ts"}
    @{s="routes\configRepairRoutes.ts"; d="modules\infra\routes\configRepairRoutes.ts"}
    @{s="routes\scriptRoutes.ts"; d="modules\infra\routes\scriptRoutes.ts"}
    @{s="services\configBackupService.ts"; d="modules\infra\services\configBackupService.ts"}
    @{s="services\configParser.ts"; d="modules\infra\services\configParser.ts"}
    @{s="services\configRepairService.ts"; d="modules\infra\services\configRepairService.ts"}
    @{s="services\configTemplateService.ts"; d="modules\infra\services\configTemplateService.ts"}
    @{s="routes\backupRoutes.ts"; d="modules\infra\routes\backupRoutes.ts"}
    @{s="routes\snapshotPolicyRoutes.ts"; d="modules\infra\routes\snapshotPolicyRoutes.ts"}
    @{s="services\backupService.ts"; d="modules\infra\services\backupService.ts"}
    @{s="services\backupService.test.ts"; d="modules\infra\services\backupService.test.ts"}
    @{s="routes\webhookRoutes.ts"; d="modules\infra\routes\webhookRoutes.ts"}
    @{s="routes\toolLinkRoutes.ts"; d="modules\infra\routes\toolLinkRoutes.ts"}
    @{s="routes\notificationRoutes.ts"; d="modules\infra\routes\notificationRoutes.ts"}
    @{s="routes\notificationConfigRoutes.ts"; d="modules\infra\routes\notificationConfigRoutes.ts"}
    @{s="services\notificationService.ts"; d="modules\infra\services\notificationService.ts"}
    @{s="services\notificationChannels.ts"; d="modules\infra\services\notificationChannels.ts"}
    @{s="services\notificationChannels.test.ts"; d="modules\infra\services\notificationChannels.test.ts"}
    @{s="routes\approvalRoutes.ts"; d="modules\infra\routes\approvalRoutes.ts"}
    @{s="routes\auditRoutes.ts"; d="modules\infra\routes\auditRoutes.ts"}
    @{s="services\changeService.ts"; d="modules\infra\services\changeService.ts"}
    @{s="services\auditService.ts"; d="modules\infra\services\auditService.ts"}
    @{s="routes\composeRoutes.ts"; d="modules\infra\routes\composeRoutes.ts"}
    @{s="routes\importExportRoutes.ts"; d="modules\infra\routes\importExportRoutes.ts"}
    @{s="services\composeService.ts"; d="modules\infra\services\composeService.ts"}
    @{s="services\commandDispatcher.ts"; d="modules\infra\services\commandDispatcher.ts"}
    @{s="services\terminalService.ts"; d="modules\infra\services\terminalService.ts"}
    @{s="services\reportService.ts"; d="modules\infra\services\reportService.ts"}
    @{s="services\importExportService.ts"; d="modules\infra\services\importExportService.ts"}
    @{s="services\importExportService.test.ts"; d="modules\infra\services\importExportService.test.ts"}

    # --- monitor ---
    @{s="routes\monitorRoutes.ts"; d="modules\monitor\routes\monitorRoutes.ts"}
    @{s="routes\dashboardRoutes.ts"; d="modules\monitor\routes\dashboardRoutes.ts"}
    @{s="routes\costAnalysisRoutes.ts"; d="modules\monitor\routes\costAnalysisRoutes.ts"}
    @{s="routes\reportRoutes.ts"; d="modules\monitor\routes\reportRoutes.ts"}
    @{s="services\selfMonitorService.ts"; d="modules\monitor\services\selfMonitorService.ts"}
    @{s="services\costAnalysisService.ts"; d="modules\monitor\services\costAnalysisService.ts"}
    @{s="services\healthService.ts"; d="modules\monitor\services\healthService.ts"}
    @{s="services\healthService.test.ts"; d="modules\monitor\services\healthService.test.ts"}

    # --- database ---
    @{s="routes\databaseRoutes.ts"; d="modules\database\routes\databaseRoutes.ts"}
    @{s="routes\dbConnectionsRoutes.ts"; d="modules\database\routes\dbConnectionsRoutes.ts"}
    @{s="services\dbskiterService.ts"; d="modules\database\services\dbskiterService.ts"}

    # --- auto ---
    @{s="routes\autoScaleRoutes.ts"; d="modules\auto\routes\autoScaleRoutes.ts"}
    @{s="routes\remediationPolicyRoutes.ts"; d="modules\auto\routes\remediationPolicyRoutes.ts"}
    @{s="routes\remediationExecutionRoutes.ts"; d="modules\auto\routes\remediationExecutionRoutes.ts"}
    @{s="routes\remediationAuditRoutes.ts"; d="modules\auto\routes\remediationAuditRoutes.ts"}
    @{s="services\autoScaleService.ts"; d="modules\auto\services\autoScaleService.ts"}
    @{s="services\remediationService.ts"; d="modules\auto\services\remediationService.ts"}
    @{s="services\remediationService.test.ts"; d="modules\auto\services\remediationService.test.ts"}

    # --- kubernetes ---
    @{s="routes\kubernetesRoutes.ts"; d="modules\kubernetes\routes\kubernetesRoutes.ts"}
    @{s="services\kubernetesService.ts"; d="modules\kubernetes\services\kubernetesService.ts"}

    # --- shared/middleware ---
    @{s="middleware\auth.middleware.ts"; d="shared\middleware\auth.middleware.ts"}
    @{s="middleware\cors.middleware.ts"; d="shared\middleware\cors.middleware.ts"}
    @{s="middleware\error.middleware.ts"; d="shared\middleware\error.middleware.ts"}
    @{s="middleware\rateLimit.middleware.ts"; d="shared\middleware\rateLimit.middleware.ts"}
    @{s="middleware\requestLogger.middleware.ts"; d="shared\middleware\requestLogger.middleware.ts"}
    @{s="middleware\validate.middleware.ts"; d="shared\middleware\validate.middleware.ts"}

    # --- shared/websocket ---
    @{s="websocket\handler.ts"; d="shared\websocket\handler.ts"}
    @{s="websocket\index.ts"; d="shared\websocket\index.ts"}

    # --- shared/utils ---
    @{s="utils\response.ts"; d="shared\utils\response.ts"}
    @{s="utils\logger.ts"; d="shared\utils\logger.ts"}
    @{s="utils\helpers.ts"; d="shared\utils\helpers.ts"}
    @{s="utils\validators.ts"; d="shared\utils\validators.ts"}

    # --- shared/constants ---
    @{s="constants\index.ts"; d="shared\constants\index.ts"}

    # --- ai/edge (已在子目录中) ---
    @{s="services\edge\EdgeAgent.ts"; d="modules\ai\services\edge\EdgeAgent.ts"}
    @{s="services\edge\SystemCollector.ts"; d="modules\ai\services\edge\SystemCollector.ts"}
    @{s="services\edge\types.ts"; d="modules\ai\services\edge\types.ts"}

    # --- ai/multiAgent (已在子目录中) ---
    @{s="services\multiAgent\Coordinator.ts"; d="modules\ai\services\multiAgent\Coordinator.ts"}
    @{s="services\multiAgent\SpecialistBase.ts"; d="modules\ai\services\multiAgent\SpecialistBase.ts"}
    @{s="services\multiAgent\SpecialistRegistry.ts"; d="modules\ai\services\multiAgent\SpecialistRegistry.ts"}
    @{s="services\multiAgent\Specialists.ts"; d="modules\ai\services\multiAgent\Specialists.ts"}
    @{s="services\multiAgent\index.ts"; d="modules\ai\services\multiAgent\index.ts"}
    @{s="services\multiAgent\types.ts"; d="modules\ai\services\multiAgent\types.ts"}

    # --- ai/providers (已在子目录中) ---
    @{s="services\providers\ProviderRegistry.ts"; d="modules\ai\services\providers\ProviderRegistry.ts"}
    @{s="services\providers\builtins.ts"; d="modules\ai\services\providers\builtins.ts"}
    @{s="services\providers\extended.ts"; d="modules\ai\services\providers\extended.ts"}
    @{s="services\providers\index.ts"; d="modules\ai\services\providers\index.ts"}
    @{s="services\providers\types.ts"; d="modules\ai\services\providers\types.ts"}

    # --- workflow 引擎 (已在子目录中) ---
    @{s="services\workflow\WorkflowEngine.ts"; d="modules\workflow\services\WorkflowEngine.ts"}
    @{s="services\workflow\types.ts"; d="modules\workflow\services\types.ts"}
    @{s="services\workflowProviderRegistry.ts"; d="modules\workflow\services\workflowProviderRegistry.ts"}

    # --- containers (已在子目录中) ---
    @{s="services\vmManagement\index.ts"; d="modules\containers\services\vmManagement\index.ts"}
)

# schemas/*.ts 全部搬
$SCHEMA_FILES = Get-ChildItem (Join-Path $BACKEND "src\schemas") -Filter "*.ts" -ErrorAction SilentlyContinue
foreach ($sf in $SCHEMA_FILES) {
    $MAPPINGS += @{s="schemas\$($sf.Name)"; d="shared\schemas\$($sf.Name)"}
}

# prompts/* → modules/ai/prompts/
$PROMPT_SRC = Join-Path $BACKEND "src\prompts"
if (Test-Path $PROMPT_SRC) {
    $PROMPT_FILES = Get-ChildItem $PROMPT_SRC -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue
    foreach ($pf in $PROMPT_FILES) {
        $rel = $pf.FullName.Substring($PROMPT_SRC.Length + 1)
        $MAPPINGS += @{s="prompts\$rel"; d="modules\ai\prompts\$rel"}
    }
}

Write-Host "     共 $($MAPPINGS.Length) 个文件映射定义完成" -ForegroundColor Green

# ============================================================
# 第三步：执行文件迁移 (git mv)
# ============================================================
Write-Host "[3/4] 执行文件迁移..." -ForegroundColor Yellow

$SRC_BASE = Join-Path $BACKEND "src"
$MOVED = 0; $SKIPPED = 0; $ERRORS = @()
$CHANGE_LOG = @()

foreach ($m in $MAPPINGS) {
    $srcFile = Join-Path $SRC_BASE $m.s
    $dstFile = Join-Path $SRC_BASE $m.d

    if (-not (Test-Path $srcFile)) { $SKIPPED++; continue }

    $dstDir = Split-Path $dstFile -Parent
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }

    try {
        $relSrc = "backend/src/$($m.s)" -replace '/', '\'
        $relDst = "backend/src/$($m.d)" -replace '/', '\'
        git -C $ROOT mv $relSrc $relDst 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Copy-Item $srcFile $dstFile -Force
            Remove-Item $srcFile -Force
        }
        $MOVED++
        $CHANGE_LOG += "MOVE: $($m.s) -> $($m.d)"
    } catch {
        $ERRORS += "$($m.s): $_"
    }
}

Write-Host "     已迁移: $MOVED  跳过(不存在): $SKIPPED" -ForegroundColor Green
if ($ERRORS.Count -gt 0) {
    Write-Host "     错误: $($ERRORS.Count) 个" -ForegroundColor Red
    foreach ($e in $ERRORS) { Write-Host "       $e" -ForegroundColor Red }
}

# ============================================================
# 第四步：生成 import 改动清单
# ============================================================
Write-Host "[4/4] 扫描需要改 import 的文件..." -ForegroundColor Yellow

$ALL_TS = Get-ChildItem (Join-Path $BACKEND "src") -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue
$IMPORT_LOG = @()

$IMPORT_LOG += "# daima 模块化重构 - Import 路径变更清单"
$IMPORT_LOG += "# 生成时间: $(Get-Date)"
$IMPORT_LOG += "# 以下文件需要手动更新 import 路径"
$IMPORT_LOG += ""

$fileCount = 0
foreach ($tsFile in $ALL_TS) {
    $relPath = $tsFile.FullName.Substring($SRC_BASE.Length + 1)
    $content = Get-Content $tsFile.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    $hasOldRef = $false
    $oldRefs = @()

    # 检查常见的旧路径模式
    if ($content -match "from '\.\./\.\./services/|from '\.\./services/|from '\.\./\.\./\.\./services/|from '\.\./models/database|from '\.\./\.\./models/database|from '\.\./\.\./utils/|from '\.\./\.\./middleware/|from '\.\./websocket/") {
        $hasOldRef = $true
    }

    if ($hasOldRef) {
        $IMPORT_LOG += "- $relPath"
        $fileCount++
    }
}

$IMPORT_LOG += ""
$IMPORT_LOG += "共 $fileCount 个文件需要改 import 路径"
$IMPORT_LOG | Out-File -FilePath $CHANGES -Encoding UTF8

Write-Host "     共 $fileCount 个文件需要改 import 路径" -ForegroundColor Green
Write-Host "     清单已输出到: $CHANGES" -ForegroundColor Green

# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  文件迁移完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 打开 IMPORT_CHANGES.txt 查看需要改 import 的文件"
Write-Host "  2. 打开 app.ts 把所有 './routes/xxx' 改为 './modules/xxx/routes/xxx'"
Write-Host "  3. 按清单逐个改其他文件的 import 路径"
Write-Host "  4. cd backend && npx tsc --noEmit  验证编译"
Write-Host "  5. cd backend && npx vitest run   验证测试"
Write-Host "  6. 改前端: 将 pages/* 搬到 features/*/pages/"
Write-Host ""
Write-Host "回滚: git reset --hard HEAD  (如果还没 git commit)"
Write-Host "或 : git checkout HEAD -- backend/src/routes/ backend/src/services/ ..."
Write-Host ""
