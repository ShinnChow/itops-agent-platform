import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeDatabase, setIOInstance, db } from './models/database';
import { setupWebSocket } from './shared/websocket/handler';
import agentRoutes from './modules/ai/routes/agentRoutes';
import workflowRoutes from './modules/workflow/routes/workflowRoutes';
import taskRoutes from './modules/workflow/routes/taskRoutes';
import alertRoutes from './modules/alerts/routes/alertRoutes';
import knowledgeRoutes from './modules/ai/routes/knowledgeRoutes';
import reportRoutes from './modules/monitor/routes/reportRoutes';
import settingsRoutes from './modules/infra/routes/settingsRoutes';
import serverRoutes from './modules/servers/routes/serverRoutes';
import serverCommandRoutes from './modules/servers/routes/serverCommandRoutes';
import scriptRoutes from './modules/infra/routes/scriptRoutes';
import auditRoutes from './modules/infra/routes/auditRoutes';
import notificationRoutes from './modules/infra/routes/notificationRoutes';
import webhookRoutes from './modules/infra/routes/webhookRoutes';
import userRoutes from './modules/auth/routes/userRoutes';
import scheduledTaskRoutes from './modules/workflow/routes/scheduledTaskRoutes';
import alertMappingRoutes from './modules/alerts/routes/alertMappingRoutes';
import notificationConfigRoutes from './modules/infra/routes/notificationConfigRoutes';
import authRoutes from './modules/auth/routes/authRoutes';
import copilotRoutes from './modules/ai/routes/copilotRoutes';
import alertNoiseRoutes from './modules/alerts/routes/alertNoiseRoutes';
import rootCauseAnalysisRoutes from './modules/ai/routes/rootCauseAnalysisRoutes';
import multiAgentRoutes from './modules/ai/routes/multiAgentRoutes';
import serverGroupRoutes from './modules/servers/routes/serverGroupRoutes';
import serverManagementRoutes from './modules/servers/routes/serverManagementRoutes';
import dashboardRoutes from './modules/monitor/routes/dashboardRoutes';
import remediationPolicyRoutes from './modules/auto/routes/remediationPolicyRoutes';
import remediationExecutionRoutes from './modules/auto/routes/remediationExecutionRoutes';
import remediationAuditRoutes from './modules/auto/routes/remediationAuditRoutes';
import backupRoutes from './modules/infra/routes/backupRoutes';
import databaseRoutes from './modules/database/routes/databaseRoutes';
import dbConnectionsRoutes from './modules/database/routes/dbConnectionsRoutes';
import knowledgeQAnythingRoutes from './modules/ai/routes/knowledgeQAnythingRoutes';
import vncRoutes from './modules/network/routes/vncRoutes';
import networkDeviceRoutes from './modules/network/routes/networkDeviceRoutes';
import networkAdvancedRoutes from './modules/network/routes/networkAdvancedRoutes';
import snmpRoutes from './modules/network/routes/snmpRoutes';
import sshKeyRoutes from './modules/servers/routes/sshKeyRoutes';
import topologyRoutes from './modules/network/routes/topologyRoutes';
import changeRoutes from './modules/infra/routes/changeRoutes';
import aiModelRoutes from './modules/ai/routes/aiModelRoutes';
import approvalRoutes from './modules/infra/routes/approvalRoutes';
import aiRemediationRoutes from './modules/ai/routes/aiRemediationRoutes';
import { schedulerService } from './modules/workflow/services/schedulerService';
import { reportService } from './modules/infra/services/reportService';
import { copilotService } from './modules/ai/services/copilotService';
import { rootCauseAnalysisService } from './modules/ai/services/rootCauseAnalysisService';
import { notificationService } from './modules/infra/services/notificationService';
import { remediationService } from './modules/auto/services/remediationService';
import { vncProxyService } from './modules/network/services/vncProxyService';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authenticateToken, requirePasswordChange } from './middleware/auth';
import { rateLimiter, webhookIpFilter } from './middleware/rateLimiter';
import { traceMiddleware } from './middleware/trace';
import { env } from './utils/env';
import { logger } from './utils/logger';
import { initTokenBlacklist } from './modules/auth/services/tokenBlacklist';
import { startCircuitBreakerCleanup } from './modules/ai/services/llmService';
import { credentialService } from './modules/auth/services/credentialService';
import { healthService } from './modules/monitor/services/healthService';
import { backupService } from './modules/infra/services/backupService';
import { selfMonitorService } from './modules/monitor/services/selfMonitorService';
import { snmpPollingService } from './modules/network/services/snmpPollingService';
import { alertAutoAnalyzer } from './modules/alerts/services/alertAutoAnalyzer';
import { alertCorrelationService } from './modules/alerts/services/alertCorrelationService';
import { setServerInstances } from './modules/infra/services/restartService';
import { checkDbskiterAvailability } from './modules/database/services/dbskiterService';
import { timeoutApproval } from './modules/workflow/services/workflowExecutor';
import { queueService } from './modules/workflow/services/queueService';
import { alertAutoResponseService } from './modules/alerts/services/alertAutoResponse/alertAutoResponseService';
import { dockerService } from './modules/containers/services/dockerService';
import { configTemplateService } from './modules/infra/services/configTemplateService';
import { composeService } from './modules/infra/services/composeService';
import { registryService } from './modules/containers/services/registryService';
import { kubernetesService } from './modules/kubernetes/services/kubernetesService';
import { autoScaleService } from './modules/auto/services/autoScaleService';
import { vmMigrationService } from './modules/containers/services/vmMigrationService';
import { vmSnapshotSchedulerService } from './modules/containers/services/vmSnapshotSchedulerService';
import { multiHostDockerService } from './modules/containers/services/multiHostDockerService';
import importExportRouter from './modules/infra/routes/importExportRoutes';
import alertAutoRouter from './modules/alerts/routes/alertAutoRoutes';
import linkageRouter from './modules/infra/routes/linkageRoutes';
import networkDiscoveryRouter from './modules/network/routes/networkDiscoveryRoutes';
import alertCorrelationRouter from './modules/alerts/routes/alertCorrelationRoutes';
import alertAutoResponseRoutes from './modules/alerts/routes/alertAutoResponseRoutes';
import configRepairRoutes from './modules/infra/routes/configRepairRoutes';
import configTemplateRoutes from './modules/infra/routes/configTemplateRoutes';
import containerRoutes from './modules/containers/routes/containerRoutes';
import monitorRoutes from './modules/monitor/routes/monitorRoutes';
import dcInfrastructureRoutes from './routes/dc';
import dockerRoutes from './modules/containers/routes/dockerRoutes';
import imageRoutes from './modules/containers/routes/imageRoutes';
import toolLinkRoutes from './modules/infra/routes/toolLinkRoutes';
import virtualMachineRoutes from './modules/containers/routes/virtualMachineRoutes';
import vmManagementRoutes from './modules/containers/routes/vmManagementRoutes';
import volumeRoutes from './modules/containers/routes/volumeRoutes';
import composeRoutes from './modules/infra/routes/composeRoutes';
import snapshotPolicyRoutes from './modules/infra/routes/snapshotPolicyRoutes';
import registryRoutes from './modules/containers/routes/registryRoutes';
import kubernetesRoutes from './modules/kubernetes/routes/kubernetesRoutes';
import autoScaleRoutes from './modules/auto/routes/autoScaleRoutes';
import costAnalysisRoutes from './modules/monitor/routes/costAnalysisRoutes';
import vmMigrationRoutes from './modules/containers/routes/vmMigrationRoutes';

import networkSubnetRoutes from './modules/network/routes/networkSubnetRoutes';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e6, // 1MB max message size to prevent memory exhaustion
  pingTimeout: 60000,
  pingInterval: 25000
});

setServerInstances(httpServer, io);

app.use(helmet());
app.use(traceMiddleware);
app.use(morgan('combined'));
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

import { initAlertService } from './modules/alerts/services/alertService';
import { startDCStatusPush, stopDCStatusPush } from './modules/dc/services/dcStatusService';
import { initializeProviders } from './modules/ai/services/providers';

async function initializeApp() {
  // 启动时仅检测 dbskiter，不在运行期自动安装依赖
  checkDbskiterAvailability().catch(() => { /* 错误已在函数内部记录 */ });

  await initializeDatabase();

  // 初始化 Provider 生态系统
  initializeProviders();
  
  // 初始化各个服务
  initAlertService();
  reportService.init();
  copilotService.init();
  rootCauseAnalysisService.init();
  schedulerService.init();
  notificationService.init();
  remediationService.init();
  backupService.init();
  // Initialize credential service (encrypted storage for API keys)
  credentialService.init();
  
  // Migrate existing plaintext API keys from settings table to encrypted credentials
  try {
    const migrationResult = credentialService.migrateFromSettings();
    if (migrationResult.migrated > 0) {
      logger.warn(`⚠️ Migrated ${migrationResult.migrated} API keys from plaintext settings to encrypted credentials`);
      logger.warn('⚠️ Old plaintext keys remain in settings table for backwards compatibility');
      logger.warn('⚠️ It is recommended to remove them via admin/cleanup-settings endpoint once migration is verified');
    }
  } catch (migrationError) {
    logger.warn('Credential migration encountered errors (non-fatal)', migrationError as Error);
  }

  // Initialize queue service (async task execution)
  queueService.init();
  
  // Initialize self-monitor service (periodic health checks)
  selfMonitorService.init();
  
  // Initialize SNMP polling service (periodic device inspection)
  snmpPollingService.start();
  
  // Initialize alert auto-analyzer (AI-powered alert diagnosis)
  alertAutoAnalyzer.start();
  
  // Initialize alert correlation service
  alertCorrelationService.start();
  
  // Initialize alert auto-response service (adaptive alert handling)
  alertAutoResponseService.start();
  
  // Initialize Docker service connection
  dockerService.init().catch((err: Error) => {
    logger.warn('Docker service initialization failed (non-fatal)', err);
  });
  
  // Initialize config template service
  configTemplateService.init();

  // Initialize P0-P3 container & VM management services (ensure DB tables)
  composeService.ensureTables();
  registryService.ensureTables();
  kubernetesService.ensureTables();
  autoScaleService.ensureTables();
  vmMigrationService.ensureTables();
  vmSnapshotSchedulerService.ensureTables();
  multiHostDockerService.ensureTables();
  
  initTokenBlacklist();
  startCircuitBreakerCleanup();
  startApprovalTimeoutChecker();
  
  // DC 实时状态推送
  startDCStatusPush(io, 5000);
  
  logger.info('✅ Application initialization complete');
}

setupWebSocket(io);
setIOInstance(io);
vncProxyService.initialize(io);

// 公开路由 - 添加速率限制但不需要认证
app.use('/api/auth', rateLimiter, authRoutes);

// Webhook 路由不需要认证（外部系统推送告警）
app.use('/api/webhooks', webhookIpFilter, rateLimiter, webhookRoutes);

// 健康检查 - 不需要认证
app.get('/health', async (_req, res) => {
  const health = await healthService.checkHealth();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req, res) => {
  const health = await healthService.checkHealth();
  const isReady = health.status === 'healthy' || health.status === 'degraded';
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    status: health.status,
    checks: health.checks
  });
});

// 以下所有路由都需要认证
app.use(authenticateToken);

// 注意: /api/auth 路由已在公开路由中注册（line 118），此处不重复注册
// 已认证的用户通过公开路由的 authRoutes 访问

// 健康检查接口（已认证）- 无需强制改密码检查
app.get('/api/health/summary', (_req, res) => {
  const summary = healthService.getHealthSummary();
  res.json({ success: true, data: summary });
});
app.get('/api/health/history', (_req, res) => {
  const history = healthService.getHealthHistory();
  res.json({ success: true, data: history });
});
app.get('/api/health/monitor', async (_req, res) => {
  const report = selfMonitorService.getLastReport();
  if (!report) {
    res.json({ success: false, message: 'No monitor report yet, service still initializing' });
    return;
  }
  res.json({ success: true, data: report });
});
app.get('/api/health/monitor/alerts', (_req, res) => {
  const alerts = selfMonitorService.getAlertHistory();
  res.json({ success: true, data: alerts });
});

// 以下所有路由需要检查是否已修改初始密码
app.use(requirePasswordChange);

// 受保护的路由 - 也应用速率限制
app.use('/api/copilot', rateLimiter, copilotRoutes);
app.use('/api/agents', rateLimiter, agentRoutes);
app.use('/api/workflows', rateLimiter, workflowRoutes);
app.use('/api/tasks', rateLimiter, taskRoutes);
app.use('/api/alerts', rateLimiter, alertRoutes);
app.use('/api/knowledge', rateLimiter, knowledgeRoutes);
app.use('/api/reports', rateLimiter, reportRoutes);
app.use('/api/settings', rateLimiter, settingsRoutes);
app.use('/api/servers', rateLimiter, serverRoutes);
app.use('/api/server-commands', rateLimiter, serverCommandRoutes);
app.use('/api/server-groups', rateLimiter, serverGroupRoutes);
app.use('/api/server-management', rateLimiter, serverManagementRoutes);
app.use('/api/scripts', rateLimiter, scriptRoutes);
app.use('/api/audit', rateLimiter, auditRoutes);
app.use('/api/notifications', rateLimiter, notificationRoutes);
app.use('/api/users', rateLimiter, userRoutes);
app.use('/api/scheduled-tasks', rateLimiter, scheduledTaskRoutes);
app.use('/api/alert-mappings', rateLimiter, alertMappingRoutes);
app.use('/api/notification-config', rateLimiter, notificationConfigRoutes);
app.use('/api/alert-noise', rateLimiter, alertNoiseRoutes);
app.use('/api/root-cause-analysis', rateLimiter, rootCauseAnalysisRoutes);
app.use('/api/multi-agent', rateLimiter, multiAgentRoutes);
app.use('/api/dashboard', rateLimiter, dashboardRoutes);
app.use('/api/remediation-policies', rateLimiter, remediationPolicyRoutes);
app.use('/api/remediation-executions', rateLimiter, remediationExecutionRoutes);
app.use('/api/remediation-audits', rateLimiter, remediationAuditRoutes);
app.use('/api/backups', rateLimiter, backupRoutes);
app.use('/api/database', rateLimiter, databaseRoutes);
app.use('/api/db-connections', rateLimiter, dbConnectionsRoutes);
app.use('/api/knowledge/qanything', rateLimiter, knowledgeQAnythingRoutes);
app.use('/api/import-export', rateLimiter, importExportRouter);
app.use('/api/vnc', rateLimiter, vncRoutes);
app.use('/api/network-devices', rateLimiter, networkDeviceRoutes);
app.use('/api/network-advanced', rateLimiter, networkAdvancedRoutes);
app.use('/api/snmp', rateLimiter, snmpRoutes);
app.use('/api/ssh-keys', rateLimiter, sshKeyRoutes);
app.use('/api/topology', rateLimiter, topologyRoutes);
app.use('/api/changes', rateLimiter, changeRoutes);
app.use('/api/ai-models', rateLimiter, aiModelRoutes);
app.use('/api/approvals', rateLimiter, approvalRoutes);
app.use('/api/ai-remediations', rateLimiter, aiRemediationRoutes);
app.use('/api', rateLimiter, alertAutoRouter);
app.use('/api', rateLimiter, linkageRouter);
app.use('/api', rateLimiter, networkDiscoveryRouter);
app.use('/api', rateLimiter, alertCorrelationRouter);
app.use('/api/alert-auto-response', rateLimiter, alertAutoResponseRoutes);
app.use('/api/config-repair', rateLimiter, configRepairRoutes);
app.use('/api/config-templates', rateLimiter, configTemplateRoutes);
app.use('/api/containers', rateLimiter, containerRoutes);
app.use('/api/docker-monitor', rateLimiter, monitorRoutes);
app.use('/api/dc', rateLimiter, dcInfrastructureRoutes);
app.use('/api/dc-infrastructure', rateLimiter, dcInfrastructureRoutes);
app.use('/api/docker', rateLimiter, dockerRoutes);
app.use('/api/images', rateLimiter, imageRoutes);
app.use('/api/tool-links', rateLimiter, toolLinkRoutes);
app.use('/api/virtual-machines', rateLimiter, virtualMachineRoutes);
app.use('/api/vm-management', rateLimiter, vmManagementRoutes);
app.use('/api/volumes', rateLimiter, volumeRoutes);
app.use('/api/compose', rateLimiter, composeRoutes);
app.use('/api/snapshot-policies', rateLimiter, snapshotPolicyRoutes);
app.use('/api/registries', rateLimiter, registryRoutes);
app.use('/api/kubernetes', rateLimiter, kubernetesRoutes);
app.use('/api/auto-scale', rateLimiter, autoScaleRoutes);
app.use('/api/network-subnets', rateLimiter, networkSubnetRoutes);
app.use('/api/cost-analysis', rateLimiter, costAnalysisRoutes);
app.use('/api/vm-migrations', rateLimiter, vmMigrationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;
const HOST = process.env.HOST || '0.0.0.0';

// 审批超时检查器
let approvalTimeoutInterval: NodeJS.Timeout | null = null;

function startApprovalTimeoutChecker() {
  // 每 30 秒检查一次超时的审批请求
  approvalTimeoutInterval = setInterval(async () => {
    try {
      const expiredApprovals = db.prepare(`
        SELECT id FROM approval_requests
        WHERE status = 'pending'
        AND timeout_at IS NOT NULL
        AND timeout_at < datetime('now', 'localtime')
      `).all() as Array<{ id: string }>;

      for (const approval of expiredApprovals) {
        logger.info(`⏰ Approval ${approval.id} timed out, processing...`);
        await timeoutApproval(approval.id);
      }
    } catch (error) {
      logger.error('Error in approval timeout checker:', error);
    }
  }, 30000);

  logger.info('✅ Approval timeout checker started (checking every 30s)');
}

// 等待数据库初始化完成后再启动 HTTP 服务器，避免竞态
async function startServer() {
  await initializeApp();
  
  httpServer.listen(PORT, HOST, () => {
    logger.info(`🚀 ITOps Agent Platform Backend running on ${HOST}:${PORT}`);
    logger.info(`📡 WebSocket server ready`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  });
}

startServer().catch(error => {
  logger.error('❌ Failed to start server', error);
  process.exit(1);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);

  // 停止审批超时检查器
  if (approvalTimeoutInterval) {
    clearInterval(approvalTimeoutInterval);
  }

  try {
    await Promise.all([
      new Promise<void>((resolve) => httpServer.close(() => {
        logger.info('HTTP server closed');
        resolve();
      })),
      new Promise<void>((resolve) => io.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      }))
    ]);

    schedulerService.shutdown();
    logger.info('Scheduler service stopped');

    stopDCStatusPush();
    logger.info('DC status service stopped');

    backupService.stopAutoBackup();
    logger.info('Backup service stopped');

    await queueService.shutdown();
    logger.info('Queue service stopped');

    selfMonitorService.shutdown();
    logger.info('Self-monitor service stopped');

    alertCorrelationService.stop();
    logger.info('Alert correlation service stopped');

    db.close();
    logger.info('Database connection closed');

    logger.shutdown();
    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

export { app, io };
