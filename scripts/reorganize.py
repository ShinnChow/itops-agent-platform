"""daima 模块化重构 — 文件迁移脚本"""
import os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(r"F:\自开发代码\多Agent运维平台\ITops agent\daima")
BACKEND_SRC = ROOT / "backend" / "src"

# === 定义文件映射: (源路径相对 backend/src, 目标路径相对 backend/src) ===
MAPPINGS = [
    # auth
    (r"routes\authRoutes.ts", r"modules\auth\routes\authRoutes.ts"),
    (r"routes\userRoutes.ts", r"modules\auth\routes\userRoutes.ts"),
    (r"services\credentialService.ts", r"modules\auth\services\credentialService.ts"),
    (r"services\credentialService.test.ts", r"modules\auth\services\credentialService.test.ts"),
    (r"services\encryptionService.ts", r"modules\auth\services\encryptionService.ts"),
    (r"services\encryptionService.test.ts", r"modules\auth\services\encryptionService.test.ts"),
    (r"services\loginThrottler.ts", r"modules\auth\services\loginThrottler.ts"),
    (r"services\loginThrottler.test.ts", r"modules\auth\services\loginThrottler.test.ts"),
    (r"services\tokenBlacklist.ts", r"modules\auth\services\tokenBlacklist.ts"),
    (r"services\tokenBlacklist.test.ts", r"modules\auth\services\tokenBlacklist.test.ts"),

    # servers
    (r"routes\serverRoutes.ts", r"modules\servers\routes\serverRoutes.ts"),
    (r"routes\serverGroupRoutes.ts", r"modules\servers\routes\serverGroupRoutes.ts"),
    (r"routes\serverManagementRoutes.ts", r"modules\servers\routes\serverManagementRoutes.ts"),
    (r"routes\serverCommandRoutes.ts", r"modules\servers\routes\serverCommandRoutes.ts"),
    (r"routes\sshKeyRoutes.ts", r"modules\servers\routes\sshKeyRoutes.ts"),
    (r"services\sshService.ts", r"modules\servers\services\sshService.ts"),
    (r"services\sshService.test.ts", r"modules\servers\services\sshService.test.ts"),
    (r"services\serverImportService.ts", r"modules\servers\services\serverImportService.ts"),
    (r"services\serverImportService.test.ts", r"modules\servers\services\serverImportService.test.ts"),
    (r"services\serverInfoCollector.ts", r"modules\servers\services\serverInfoCollector.ts"),
    (r"services\serverInfoCollector.test.ts", r"modules\servers\services\serverInfoCollector.test.ts"),

    # network
    (r"routes\networkDeviceRoutes.ts", r"modules\network\routes\networkDeviceRoutes.ts"),
    (r"routes\networkDiscoveryRoutes.ts", r"modules\network\routes\networkDiscoveryRoutes.ts"),
    (r"routes\networkSubnetRoutes.ts", r"modules\network\routes\networkSubnetRoutes.ts"),
    (r"routes\networkAdvancedRoutes.ts", r"modules\network\routes\networkAdvancedRoutes.ts"),
    (r"routes\topologyRoutes.ts", r"modules\network\routes\topologyRoutes.ts"),
    (r"routes\snmpRoutes.ts", r"modules\network\routes\snmpRoutes.ts"),
    (r"routes\vncRoutes.ts", r"modules\network\routes\vncRoutes.ts"),
    (r"services\networkDeviceService.ts", r"modules\network\services\networkDeviceService.ts"),
    (r"services\networkDiscoveryService.ts", r"modules\network\services\networkDiscoveryService.ts"),
    (r"services\networkInspectionService.ts", r"modules\network\services\networkInspectionService.ts"),
    (r"services\networkCommandGenerator.ts", r"modules\network\services\networkCommandGenerator.ts"),
    (r"services\networkResultParser.ts", r"modules\network\services\networkResultParser.ts"),
    (r"services\networkResultParser.test.ts", r"modules\network\services\networkResultParser.test.ts"),
    (r"services\lldpDiscoveryService.ts", r"modules\network\services\lldpDiscoveryService.ts"),
    (r"services\topologyService.ts", r"modules\network\services\topologyService.ts"),
    (r"services\snmpService.ts", r"modules\network\services\snmpService.ts"),
    (r"services\snmpPollingService.ts", r"modules\network\services\snmpPollingService.ts"),
    (r"services\snmpTrapService.ts", r"modules\network\services\snmpTrapService.ts"),
    (r"services\snmpOidRegistry.ts", r"modules\network\services\snmpOidRegistry.ts"),
    (r"services\vendorAdapter.ts", r"modules\network\services\vendorAdapter.ts"),
    (r"services\vendorAdapter.test.ts", r"modules\network\services\vendorAdapter.test.ts"),

    # alerts
    (r"routes\alertRoutes.ts", r"modules\alerts\routes\alertRoutes.ts"),
    (r"routes\alertMappingRoutes.ts", r"modules\alerts\routes\alertMappingRoutes.ts"),
    (r"routes\alertCorrelationRoutes.ts", r"modules\alerts\routes\alertCorrelationRoutes.ts"),
    (r"routes\alertNoiseRoutes.ts", r"modules\alerts\routes\alertNoiseRoutes.ts"),
    (r"routes\alertAutoRoutes.ts", r"modules\alerts\routes\alertAutoRoutes.ts"),
    (r"routes\alertAutoResponseRoutes.ts", r"modules\alerts\routes\alertAutoResponseRoutes.ts"),
    (r"services\alertService.ts", r"modules\alerts\services\alertService.ts"),
    (r"services\alertService.test.ts", r"modules\alerts\services\alertService.test.ts"),
    (r"services\alertNotificationService.ts", r"modules\alerts\services\alertNotificationService.ts"),
    (r"services\alertNotificationService.test.ts", r"modules\alerts\services\alertNotificationService.test.ts"),
    (r"services\alertCorrelationService.ts", r"modules\alerts\services\alertCorrelationService.ts"),
    (r"services\alertNoiseReductionService.ts", r"modules\alerts\services\alertNoiseReductionService.ts"),
    (r"services\alertAutoAnalyzer.ts", r"modules\alerts\services\alertAutoAnalyzer.ts"),
    (r"services\alertDeviceResolver.ts", r"modules\alerts\services\alertDeviceResolver.ts"),
    (r"services\alertProviderRegistry.ts", r"modules\alerts\services\alertProviderRegistry.ts"),
    (r"services\alertSourceAdapters.ts", r"modules\alerts\services\alertSourceAdapters.ts"),
    (r"services\alertWorkflowMappingService.ts", r"modules\alerts\services\alertWorkflowMappingService.ts"),

    # ai
    (r"routes\agentRoutes.ts", r"modules\ai\routes\agentRoutes.ts"),
    (r"routes\multiAgentRoutes.ts", r"modules\ai\routes\multiAgentRoutes.ts"),
    (r"routes\aiModelRoutes.ts", r"modules\ai\routes\aiModelRoutes.ts"),
    (r"routes\copilotRoutes.ts", r"modules\ai\routes\copilotRoutes.ts"),
    (r"routes\knowledgeRoutes.ts", r"modules\ai\routes\knowledgeRoutes.ts"),
    (r"routes\knowledgeQAnythingRoutes.ts", r"modules\ai\routes\knowledgeQAnythingRoutes.ts"),
    (r"routes\rootCauseAnalysisRoutes.ts", r"modules\ai\routes\rootCauseAnalysisRoutes.ts"),
    (r"routes\aiRemediationRoutes.ts", r"modules\ai\routes\aiRemediationRoutes.ts"),
    (r"services\agentExecutor.ts", r"modules\ai\services\agentExecutor.ts"),
    (r"services\agentExecutor.test.ts", r"modules\ai\services\agentExecutor.test.ts"),
    (r"services\agentToolRegistry.ts", r"modules\ai\services\agentToolRegistry.ts"),
    (r"services\llmService.ts", r"modules\ai\services\llmService.ts"),
    (r"services\llmService.test.ts", r"modules\ai\services\llmService.test.ts"),
    (r"services\multiAgentCollaboration.ts", r"modules\ai\services\multiAgentCollaboration.ts"),
    (r"services\multiAgentCollaboration.test.ts", r"modules\ai\services\multiAgentCollaboration.test.ts"),
    (r"services\copilotService.ts", r"modules\ai\services\copilotService.ts"),
    (r"services\enhancedRAGService.ts", r"modules\ai\services\enhancedRAGService.ts"),
    (r"services\qanythingService.ts", r"modules\ai\services\qanythingService.ts"),
    (r"services\rootCauseAnalysisService.ts", r"modules\ai\services\rootCauseAnalysisService.ts"),
    (r"services\rootCauseAnalysisService.test.ts", r"modules\ai\services\rootCauseAnalysisService.test.ts"),
    (r"services\aiRemediationService.ts", r"modules\ai\services\aiRemediationService.ts"),
    (r"services\localRuleEngine.ts", r"modules\ai\services\localRuleEngine.ts"),
    (r"services\localRuleEngine.test.ts", r"modules\ai\services\localRuleEngine.test.ts"),
    (r"services\aiModelService.ts", r"modules\ai\services\aiModelService.ts"),
    (r"services\aiModelService.test.ts", r"modules\ai\services\aiModelService.test.ts"),

    # ai/edge
    (r"services\edge\EdgeAgent.ts", r"modules\ai\services\edge\EdgeAgent.ts"),
    (r"services\edge\SystemCollector.ts", r"modules\ai\services\edge\SystemCollector.ts"),
    (r"services\edge\types.ts", r"modules\ai\services\edge\types.ts"),

    # ai/multiAgent
    (r"services\multiAgent\Coordinator.ts", r"modules\ai\services\multiAgent\Coordinator.ts"),
    (r"services\multiAgent\SpecialistBase.ts", r"modules\ai\services\multiAgent\SpecialistBase.ts"),
    (r"services\multiAgent\SpecialistRegistry.ts", r"modules\ai\services\multiAgent\SpecialistRegistry.ts"),
    (r"services\multiAgent\Specialists.ts", r"modules\ai\services\multiAgent\Specialists.ts"),
    (r"services\multiAgent\index.ts", r"modules\ai\services\multiAgent\index.ts"),
    (r"services\multiAgent\types.ts", r"modules\ai\services\multiAgent\types.ts"),

    # ai/providers
    (r"services\providers\ProviderRegistry.ts", r"modules\ai\services\providers\ProviderRegistry.ts"),
    (r"services\providers\builtins.ts", r"modules\ai\services\providers\builtins.ts"),
    (r"services\providers\extended.ts", r"modules\ai\services\providers\extended.ts"),
    (r"services\providers\index.ts", r"modules\ai\services\providers\index.ts"),
    (r"services\providers\types.ts", r"modules\ai\services\providers\types.ts"),

    # dc
    (r"services\dcStatusService.ts", r"modules\dc\services\dcStatusService.ts"),

    # containers
    (r"routes\containerRoutes.ts", r"modules\containers\routes\containerRoutes.ts"),
    (r"routes\dockerRoutes.ts", r"modules\containers\routes\dockerRoutes.ts"),
    (r"routes\imageRoutes.ts", r"modules\containers\routes\imageRoutes.ts"),
    (r"routes\volumeRoutes.ts", r"modules\containers\routes\volumeRoutes.ts"),
    (r"routes\registryRoutes.ts", r"modules\containers\routes\registryRoutes.ts"),
    (r"routes\virtualMachineRoutes.ts", r"modules\containers\routes\virtualMachineRoutes.ts"),
    (r"routes\vmManagementRoutes.ts", r"modules\containers\routes\vmManagementRoutes.ts"),
    (r"routes\vmMigrationRoutes.ts", r"modules\containers\routes\vmMigrationRoutes.ts"),
    (r"services\dockerService.ts", r"modules\containers\services\dockerService.ts"),
    (r"services\containerLogService.ts", r"modules\containers\services\containerLogService.ts"),
    (r"services\containerMonitorService.ts", r"modules\containers\services\containerMonitorService.ts"),
    (r"services\multiHostDockerService.ts", r"modules\containers\services\multiHostDockerService.ts"),
    (r"services\vmMigrationService.ts", r"modules\containers\services\vmMigrationService.ts"),
    (r"services\vmSnapshotSchedulerService.ts", r"modules\containers\services\vmSnapshotSchedulerService.ts"),
    (r"services\vmManagement\index.ts", r"modules\containers\services\vmManagement\index.ts"),
    (r"services\vmManagement\kvmAdapter.ts", r"modules\containers\services\vmManagement\kvmAdapter.ts"),
    (r"services\vmManagement\proxmoxAdapter.ts", r"modules\containers\services\vmManagement\proxmoxAdapter.ts"),
    (r"services\vmManagement\vmAdapter.ts", r"modules\containers\services\vmManagement\vmAdapter.ts"),
    (r"services\vmManagement\vmwareAdapter.ts", r"modules\containers\services\vmManagement\vmwareAdapter.ts"),

    # workflow
    (r"routes\workflowRoutes.ts", r"modules\workflow\routes\workflowRoutes.ts"),
    (r"routes\taskRoutes.ts", r"modules\workflow\routes\taskRoutes.ts"),
    (r"routes\scheduledTaskRoutes.ts", r"modules\workflow\routes\scheduledTaskRoutes.ts"),
    (r"services\workflowExecutor.ts", r"modules\workflow\services\workflowExecutor.ts"),
    (r"services\workflowExecutor.test.ts", r"modules\workflow\services\workflowExecutor.test.ts"),
    (r"services\workflowExpressionEvaluator.ts", r"modules\workflow\services\workflowExpressionEvaluator.ts"),
    (r"services\workflowProviderRegistry.ts", r"modules\workflow\services\workflowProviderRegistry.ts"),
    (r"services\queueService.ts", r"modules\workflow\services\queueService.ts"),
    (r"services\queueService.test.ts", r"modules\workflow\services\queueService.test.ts"),
    (r"services\queueBullAdapter.ts", r"modules\workflow\services\queueBullAdapter.ts"),
    (r"services\schedulerService.ts", r"modules\workflow\services\schedulerService.ts"),
    (r"services\schedulerService.test.ts", r"modules\workflow\services\schedulerService.test.ts"),
    (r"services\workflow\WorkflowEngine.ts", r"modules\workflow\services\WorkflowEngine.ts"),
    (r"services\workflow\types.ts", r"modules\workflow\services\types.ts"),

    # infra
    (r"routes\settingsRoutes.ts", r"modules\infra\routes\settingsRoutes.ts"),
    (r"routes\configTemplateRoutes.ts", r"modules\infra\routes\configTemplateRoutes.ts"),
    (r"routes\configRepairRoutes.ts", r"modules\infra\routes\configRepairRoutes.ts"),
    (r"routes\scriptRoutes.ts", r"modules\infra\routes\scriptRoutes.ts"),
    (r"services\configBackupService.ts", r"modules\infra\services\configBackupService.ts"),
    (r"services\configParser.ts", r"modules\infra\services\configParser.ts"),
    (r"services\configRepairService.ts", r"modules\infra\services\configRepairService.ts"),
    (r"services\configTemplateService.ts", r"modules\infra\services\configTemplateService.ts"),
    (r"routes\backupRoutes.ts", r"modules\infra\routes\backupRoutes.ts"),
    (r"routes\snapshotPolicyRoutes.ts", r"modules\infra\routes\snapshotPolicyRoutes.ts"),
    (r"services\backupService.ts", r"modules\infra\services\backupService.ts"),
    (r"services\backupService.test.ts", r"modules\infra\services\backupService.test.ts"),
    (r"routes\webhookRoutes.ts", r"modules\infra\routes\webhookRoutes.ts"),
    (r"routes\toolLinkRoutes.ts", r"modules\infra\routes\toolLinkRoutes.ts"),
    (r"routes\notificationRoutes.ts", r"modules\infra\routes\notificationRoutes.ts"),
    (r"routes\notificationConfigRoutes.ts", r"modules\infra\routes\notificationConfigRoutes.ts"),
    (r"services\notificationService.ts", r"modules\infra\services\notificationService.ts"),
    (r"services\notificationChannels.ts", r"modules\infra\services\notificationChannels.ts"),
    (r"services\notificationChannels.test.ts", r"modules\infra\services\notificationChannels.test.ts"),
    (r"routes\approvalRoutes.ts", r"modules\infra\routes\approvalRoutes.ts"),
    (r"routes\auditRoutes.ts", r"modules\infra\routes\auditRoutes.ts"),
    (r"services\changeService.ts", r"modules\infra\services\changeService.ts"),
    (r"services\auditService.ts", r"modules\infra\services\auditService.ts"),
    (r"routes\composeRoutes.ts", r"modules\infra\routes\composeRoutes.ts"),
    (r"routes\importExportRoutes.ts", r"modules\infra\routes\importExportRoutes.ts"),
    (r"services\composeService.ts", r"modules\infra\services\composeService.ts"),
    (r"services\commandDispatcher.ts", r"modules\infra\services\commandDispatcher.ts"),
    (r"services\terminalService.ts", r"modules\infra\services\terminalService.ts"),
    (r"services\reportService.ts", r"modules\infra\services\reportService.ts"),
    (r"services\importExportService.ts", r"modules\infra\services\importExportService.ts"),
    (r"services\importExportService.test.ts", r"modules\infra\services\importExportService.test.ts"),

    # monitor
    (r"routes\monitorRoutes.ts", r"modules\monitor\routes\monitorRoutes.ts"),
    (r"routes\dashboardRoutes.ts", r"modules\monitor\routes\dashboardRoutes.ts"),
    (r"routes\costAnalysisRoutes.ts", r"modules\monitor\routes\costAnalysisRoutes.ts"),
    (r"routes\reportRoutes.ts", r"modules\monitor\routes\reportRoutes.ts"),
    (r"services\selfMonitorService.ts", r"modules\monitor\services\selfMonitorService.ts"),
    (r"services\costAnalysisService.ts", r"modules\monitor\services\costAnalysisService.ts"),
    (r"services\healthService.ts", r"modules\monitor\services\healthService.ts"),
    (r"services\healthService.test.ts", r"modules\monitor\services\healthService.test.ts"),

    # database
    (r"routes\databaseRoutes.ts", r"modules\database\routes\databaseRoutes.ts"),
    (r"routes\dbConnectionsRoutes.ts", r"modules\database\routes\dbConnectionsRoutes.ts"),
    (r"services\dbskiterService.ts", r"modules\database\services\dbskiterService.ts"),

    # auto
    (r"routes\autoScaleRoutes.ts", r"modules\auto\routes\autoScaleRoutes.ts"),
    (r"routes\remediationPolicyRoutes.ts", r"modules\auto\routes\remediationPolicyRoutes.ts"),
    (r"routes\remediationExecutionRoutes.ts", r"modules\auto\routes\remediationExecutionRoutes.ts"),
    (r"routes\remediationAuditRoutes.ts", r"modules\auto\routes\remediationAuditRoutes.ts"),
    (r"services\autoScaleService.ts", r"modules\auto\services\autoScaleService.ts"),
    (r"services\remediationService.ts", r"modules\auto\services\remediationService.ts"),
    (r"services\remediationService.test.ts", r"modules\auto\services\remediationService.test.ts"),

    # kubernetes
    (r"routes\kubernetesRoutes.ts", r"modules\kubernetes\routes\kubernetesRoutes.ts"),
    (r"services\kubernetesService.ts", r"modules\kubernetes\services\kubernetesService.ts"),

    # shared/middleware
    (r"middleware\auth.middleware.ts", r"shared\middleware\auth.middleware.ts"),
    (r"middleware\cors.middleware.ts", r"shared\middleware\cors.middleware.ts"),
    (r"middleware\error.middleware.ts", r"shared\middleware\error.middleware.ts"),
    (r"middleware\rateLimit.middleware.ts", r"shared\middleware\rateLimit.middleware.ts"),
    (r"middleware\requestLogger.middleware.ts", r"shared\middleware\requestLogger.middleware.ts"),
    (r"middleware\validate.middleware.ts", r"shared\middleware\validate.middleware.ts"),

    # shared/websocket
    (r"websocket\handler.ts", r"shared\websocket\handler.ts"),
    (r"websocket\index.ts", r"shared\websocket\index.ts"),

    # shared/utils
    (r"utils\response.ts", r"shared\utils\response.ts"),
    (r"utils\logger.ts", r"shared\utils\logger.ts"),
    (r"utils\helpers.ts", r"shared\utils\helpers.ts"),
    (r"utils\validators.ts", r"shared\utils\validators.ts"),

    # shared/constants
    (r"constants\index.ts", r"shared\constants\index.ts"),
]

# 额外: schemas
schemas_dir = BACKEND_SRC / "schemas"
if schemas_dir.exists():
    for f in schemas_dir.glob("*.ts"):
        MAPPINGS.append((f"schemas\\{f.name}", f"shared\\schemas\\{f.name}"))

# 额外: prompts
prompts_dir = BACKEND_SRC / "prompts"
if prompts_dir.exists():
    for f in prompts_dir.rglob("*.ts"):
        rel = f.relative_to(prompts_dir)
        MAPPINGS.append((f"prompts\\{rel}", f"modules\\ai\\prompts\\{rel}"))


def main():
    print("=" * 60)
    print("  daima 模块化重构 - 文件迁移")
    print("=" * 60)

    # 1. 创建目录结构
    print("\n[1/3] 创建目录结构...")
    created = set()
    for _, dst in MAPPINGS:
        d = BACKEND_SRC / dst
        parent = d.parent
        if parent not in created:
            parent.mkdir(parents=True, exist_ok=True)
            created.add(parent)
    print(f"      已创建 {len(created)} 个目录")

    # 2. 执行迁移
    print("\n[2/3] 执行文件迁移 (git mv)...")
    moved = 0
    skipped = 0
    for src_rel, dst_rel in MAPPINGS:
        src = BACKEND_SRC / src_rel
        dst = BACKEND_SRC / dst_rel
        if not src.exists():
            skipped += 1
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        try:
            # 先用 git mv，失败则 fallback 到 copy + delete
            result = subprocess.run(
                ["git", "mv", str(src), str(dst)],
                cwd=str(ROOT), capture_output=True, text=True, timeout=10
            )
            if result.returncode != 0:
                shutil.copy2(str(src), str(dst))
                src.unlink()
            moved += 1
            print(f"  MOVE: {src_rel} -> {dst_rel}")
        except Exception as e:
            print(f"  ERROR: {src_rel}: {e}")

    print(f"\n      已迁移: {moved}  跳过(不存在): {skipped}")

    # 3. 生成 import 改动清单
    print("\n[3/3] 扫描需要改 import 的文件...")
    change_log = ["# daima 模块化重构 - Import 路径变更清单",
                  f"# 以下文件需要手动更新 import 路径\n"]
    count = 0
    for ts_file in BACKEND_SRC.rglob("*.ts"):
        rel = ts_file.relative_to(BACKEND_SRC)
        content = ts_file.read_text(encoding="utf-8", errors="ignore")
        # 检查旧路径引用
        old_patterns = [
            "../services/", "../../services/", "../../../services/",
            "../models/database", "../../models/database",
            "../utils/", "../../utils/",
            "../middleware/", "../../middleware/",
            "../websocket/",
        ]
        if any(p in content for p in old_patterns):
            change_log.append(f"- {rel}")
            count += 1

    change_log.append(f"\n共 {count} 个文件需要改 import 路径")
    output_path = ROOT / "IMPORT_CHANGES.txt"
    output_path.write_text("\n".join(change_log), encoding="utf-8")
    print(f"      共 {count} 个文件需要改 import 路径")
    print(f"      清单已输出到: {output_path}")

    print("\n" + "=" * 60)
    print("  文件迁移完成！")
    print("=" * 60)
    print("\n下一步操作:")
    print("  1. 打开 IMPORT_CHANGES.txt 查看需要改 import 的文件")
    print("  2. 打开 app.ts 把所有 './routes/xxx' 改为 './modules/xxx/routes/xxx'")
    print("  3. 按清单逐个改其他文件的 import 路径")
    print("  4. cd backend && npx tsc --noEmit  验证编译")
    print("  5. cd backend && npx vitest run   验证测试")
    print("\n回滚: git reset --hard HEAD")


if __name__ == "__main__":
    main()
