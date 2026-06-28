"""Update app.ts import paths to match the new module structure"""
import re

path = r'F:\自开发代码\多Agent运维平台\ITops agent\daima\backend\src\app.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Map of import prefix -> new prefix for routes
route_mappings = {
    './routes/agentRoutes': './modules/ai/routes/agentRoutes',
    './routes/workflowRoutes': './modules/workflow/routes/workflowRoutes',
    './routes/taskRoutes': './modules/workflow/routes/taskRoutes',
    './routes/alertRoutes': './modules/alerts/routes/alertRoutes',
    './routes/knowledgeRoutes': './modules/ai/routes/knowledgeRoutes',
    './routes/reportRoutes': './modules/monitor/routes/reportRoutes',
    './routes/settingsRoutes': './modules/infra/routes/settingsRoutes',
    './routes/serverRoutes': './modules/servers/routes/serverRoutes',
    './routes/serverCommandRoutes': './modules/servers/routes/serverCommandRoutes',
    './routes/scriptRoutes': './modules/infra/routes/scriptRoutes',
    './routes/auditRoutes': './modules/infra/routes/auditRoutes',
    './routes/notificationRoutes': './modules/infra/routes/notificationRoutes',
    './routes/webhookRoutes': './modules/infra/routes/webhookRoutes',
    './routes/userRoutes': './modules/auth/routes/userRoutes',
    './routes/scheduledTaskRoutes': './modules/workflow/routes/scheduledTaskRoutes',
    './routes/alertMappingRoutes': './modules/alerts/routes/alertMappingRoutes',
    './routes/notificationConfigRoutes': './modules/infra/routes/notificationConfigRoutes',
    './routes/authRoutes': './modules/auth/routes/authRoutes',
    './routes/copilotRoutes': './modules/ai/routes/copilotRoutes',
    './routes/alertNoiseRoutes': './modules/alerts/routes/alertNoiseRoutes',
    './routes/rootCauseAnalysisRoutes': './modules/ai/routes/rootCauseAnalysisRoutes',
    './routes/multiAgentRoutes': './modules/ai/routes/multiAgentRoutes',
    './routes/serverGroupRoutes': './modules/servers/routes/serverGroupRoutes',
    './routes/serverManagementRoutes': './modules/servers/routes/serverManagementRoutes',
    './routes/dashboardRoutes': './modules/monitor/routes/dashboardRoutes',
    './routes/remediationPolicyRoutes': './modules/auto/routes/remediationPolicyRoutes',
    './routes/remediationExecutionRoutes': './modules/auto/routes/remediationExecutionRoutes',
    './routes/remediationAuditRoutes': './modules/auto/routes/remediationAuditRoutes',
    './routes/backupRoutes': './modules/infra/routes/backupRoutes',
    './routes/databaseRoutes': './modules/database/routes/databaseRoutes',
    './routes/dbConnectionsRoutes': './modules/database/routes/dbConnectionsRoutes',
    './routes/knowledgeQAnythingRoutes': './modules/ai/routes/knowledgeQAnythingRoutes',
    './routes/vncRoutes': './modules/network/routes/vncRoutes',
    './routes/networkDeviceRoutes': './modules/network/routes/networkDeviceRoutes',
    './routes/networkAdvancedRoutes': './modules/network/routes/networkAdvancedRoutes',
    './routes/snmpRoutes': './modules/network/routes/snmpRoutes',
    './routes/sshKeyRoutes': './modules/servers/routes/sshKeyRoutes',
    './routes/topologyRoutes': './modules/network/routes/topologyRoutes',
    './routes/changeRoutes': './modules/infra/routes/changeRoutes',
    './routes/aiModelRoutes': './modules/ai/routes/aiModelRoutes',
    './routes/approvalRoutes': './modules/infra/routes/approvalRoutes',
    './routes/aiRemediationRoutes': './modules/ai/routes/aiRemediationRoutes',
    './routes/importExportRoutes': './modules/infra/routes/importExportRoutes',
    './routes/alertAutoRoutes': './modules/alerts/routes/alertAutoRoutes',
    './routes/alertAutoResponseRoutes': './modules/alerts/routes/alertAutoResponseRoutes',
    './routes/linkageRoutes': './modules/infra/routes/linkageRoutes',
    './routes/networkDiscoveryRoutes': './modules/network/routes/networkDiscoveryRoutes',
    './routes/alertCorrelationRoutes': './modules/alerts/routes/alertCorrelationRoutes',
    './routes/configRepairRoutes': './modules/infra/routes/configRepairRoutes',
    './routes/configTemplateRoutes': './modules/infra/routes/configTemplateRoutes',
    './routes/containerRoutes': './modules/containers/routes/containerRoutes',
    './routes/monitorRoutes': './modules/monitor/routes/monitorRoutes',
    './routes/dockerRoutes': './modules/containers/routes/dockerRoutes',
    './routes/imageRoutes': './modules/containers/routes/imageRoutes',
    './routes/toolLinkRoutes': './modules/infra/routes/toolLinkRoutes',
    './routes/virtualMachineRoutes': './modules/containers/routes/virtualMachineRoutes',
    './routes/vmManagementRoutes': './modules/containers/routes/vmManagementRoutes',
    './routes/volumeRoutes': './modules/containers/routes/volumeRoutes',
    './routes/composeRoutes': './modules/infra/routes/composeRoutes',
    './routes/snapshotPolicyRoutes': './modules/infra/routes/snapshotPolicyRoutes',
    './routes/registryRoutes': './modules/containers/routes/registryRoutes',
    './routes/kubernetesRoutes': './modules/kubernetes/routes/kubernetesRoutes',
    './routes/autoScaleRoutes': './modules/auto/routes/autoScaleRoutes',
    './routes/costAnalysisRoutes': './modules/monitor/routes/costAnalysisRoutes',
    './routes/vmMigrationRoutes': './modules/containers/routes/vmMigrationRoutes',
    './routes/networkSubnetRoutes': './modules/network/routes/networkSubnetRoutes',
}

service_mappings = {
    './services/schedulerService': './modules/workflow/services/schedulerService',
    './services/reportService': './modules/infra/services/reportService',
    './services/copilotService': './modules/ai/services/copilotService',
    './services/rootCauseAnalysisService': './modules/ai/services/rootCauseAnalysisService',
    './services/notificationService': './modules/infra/services/notificationService',
    './services/remediationService': './modules/auto/services/remediationService',
    './services/vncProxyService': './modules/network/services/vncProxyService',
    './services/tokenBlacklist': './modules/auth/services/tokenBlacklist',
    './services/llmService': './modules/ai/services/llmService',
    './services/credentialService': './modules/auth/services/credentialService',
    './services/healthService': './modules/monitor/services/healthService',
    './services/backupService': './modules/infra/services/backupService',
    './services/selfMonitorService': './modules/monitor/services/selfMonitorService',
    './services/snmpPollingService': './modules/network/services/snmpPollingService',
    './services/alertAutoAnalyzer': './modules/alerts/services/alertAutoAnalyzer',
    './services/alertCorrelationService': './modules/alerts/services/alertCorrelationService',
    './services/restartService': './modules/infra/services/restartService',
    './services/dbskiterService': './modules/database/services/dbskiterService',
    './services/workflowExecutor': './modules/workflow/services/workflowExecutor',
    './services/queueService': './modules/workflow/services/queueService',
    './services/alertAutoResponse/alertAutoResponseService': './modules/alerts/services/alertAutoResponse/alertAutoResponseService',
    './services/dockerService': './modules/containers/services/dockerService',
    './services/configTemplateService': './modules/infra/services/configTemplateService',
    './services/composeService': './modules/infra/services/composeService',
    './services/registryService': './modules/containers/services/registryService',
    './services/kubernetesService': './modules/kubernetes/services/kubernetesService',
    './services/autoScaleService': './modules/auto/services/autoScaleService',
    './services/vmMigrationService': './modules/containers/services/vmMigrationService',
    './services/vmSnapshotSchedulerService': './modules/containers/services/vmSnapshotSchedulerService',
    './services/multiHostDockerService': './modules/containers/services/multiHostDockerService',
    './services/alertService': './modules/alerts/services/alertService',
    './services/dcStatusService': './modules/dc/services/dcStatusService',
    './services/providers': './modules/ai/services/providers',
    './services/costAnalysisService': './modules/monitor/services/costAnalysisService',
}

shared_mappings = {
    './websocket/handler': './shared/websocket/handler',
    './middleware/errorHandler': './shared/middleware/errorHandler',
    './middleware/auth': './shared/middleware/auth',
    './middleware/rateLimiter': './shared/middleware/rateLimiter',
    './middleware/trace': './shared/middleware/trace',
}

count = 0
for old, new in {**route_mappings, **service_mappings, **shared_mappings}.items():
    if old in content:
        content = content.replace(old, new)
        count += 1

# Write back
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Updated {count} import paths in app.ts')

# Verify no old-style imports remain
old_patterns = ["'./routes/", "'./services/", "'./websocket/", "'./middleware/"]
for p in old_patterns:
    remaining = [l.strip() for l in content.split('\n') if p in l and 'import' in l]
    if remaining:
        print(f'WARNING: Still has {p} imports:')
        for r in remaining:
            print(f'  {r}')
