# daima 项目模块化重构方案

> **一句话**：把 167 个文件从 2 个平铺目录，按业务域分到 13 个模块目录。  
> **不改逻辑、不改文件名、不改 API。只搬文件 + 改 import 路径。**  
> **工期**：半天  
> **风险**：低（git 可回滚）

---

## 一、为什么要做？

### 现状

```
backend/src/
├── routes/      66 个文件 ← 平铺
├── services/   101 个文件 ← 平铺
```

AI 编程工具（TraeCN / Cursor / Copilot）看到的是：

> 167 个文件混在一起 → 不知道哪些是相关的 → **不敢改**

### 目标

```
backend/src/modules/
├── auth/        10 文件  ← 认证相关
├── servers/     12 文件  ← 服务器相关
├── network/     22 文件  ← 网络相关
├── alerts/      20 文件  ← 告警相关
├── ai/          24 文件  ← AI 相关
├── dc/          14 文件  ← 数据中心
├── workflow/    15 文件  ← 工作流
├── containers/  16 文件  ← 容器/VM
├── infra/       22 文件  ← 基础设施
├── monitor/     10 文件  ← 监控
├── database/     3 文件  ← 数据库
├── auto/         7 文件  ← 自动化
└── kubernetes/   2 文件  ← K8s
```

AI 看到的是：

> 打开 `modules/alerts/` → 全是告警 → **放心改**

---

## 二、核心原则

### ✅ 做的

| 原则 | 说明 |
|------|------|
| **按业务域分组** | 每个目录对应一个业务概念（auth / servers / alerts / ai ...） |
| **一个目录一个职责** | AI 看到目录名就知道里面是干什么的 |
| **文件名保持不变** | `alertRoutes.ts` 还是 `alertRoutes.ts`，只是位置变了 |
| **每个模块加 README.md** | 告诉 AI 这个模块的职责、依赖、关键文件 |

### ❌ 不做的

| 不要做 | 原因 |
|--------|------|
| **不设文件数上限** | 20+ 文件对 AI 完全 OK，关键是一个目录里都是相关的 |
| **不拆分 infra** | 22 文件一个目录即可，拆成子目录反而难找 |
| **不改文件名** | `alertRoutes.ts` → `modules/alerts/routes/alertRoutes.ts`，仅此而已 |
| **不改代码逻辑** | 搬文件已经够多，再加逻辑改错无法排查 |
| **不改数据库** | 纯代码重组 |
| **不改 API 签名** | 增加回归风险 |
| **不拆微服务** | 服务间通信让 AI 调试更困难 |
| **不改部署架构** | docker-compose.yml 不变 |

---

## 三、最终目录结构

```
backend/src/
├── modules/
│   ├── auth/                           # 🔐 认证
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   └── userRoutes.ts
│   │   ├── services/
│   │   │   ├── credentialService.ts
│   │   │   ├── encryptionService.ts
│   │   │   ├── loginThrottler.ts
│   │   │   └── tokenBlacklist.ts
│   │   │   └── *.test.ts
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   └── README.md
│   │
│   ├── servers/                        # 🖥️ 服务器管理
│   │   ├── routes/
│   │   │   ├── serverRoutes.ts
│   │   │   ├── serverGroupRoutes.ts
│   │   │   ├── serverManagementRoutes.ts
│   │   │   ├── serverCommandRoutes.ts
│   │   │   └── sshKeyRoutes.ts
│   │   ├── services/
│   │   │   ├── sshService.ts
│   │   │   ├── serverImportService.ts
│   │   │   └── serverInfoCollector.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   ├── network/                        # 🌐 网络管理
│   │   ├── routes/
│   │   │   ├── networkDeviceRoutes.ts
│   │   │   ├── networkDiscoveryRoutes.ts
│   │   │   ├── networkSubnetRoutes.ts
│   │   │   ├── networkAdvancedRoutes.ts
│   │   │   ├── topologyRoutes.ts
│   │   │   ├── snmpRoutes.ts
│   │   │   └── vncRoutes.ts
│   │   ├── services/
│   │   │   ├── networkDeviceService.ts
│   │   │   ├── networkDiscoveryService.ts
│   │   │   ├── networkInspectionService.ts
│   │   │   ├── networkCommandGenerator.ts
│   │   │   ├── networkResultParser.ts
│   │   │   ├── lldpDiscoveryService.ts
│   │   │   ├── topologyService.ts
│   │   │   ├── snmpService.ts
│   │   │   ├── snmpPollingService.ts
│   │   │   ├── snmpTrapService.ts
│   │   │   ├── snmpOidRegistry.ts
│   │   │   └── vendorAdapter.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   ├── alerts/                         # 🚨 告警系统
│   │   ├── routes/
│   │   │   ├── alertRoutes.ts
│   │   │   ├── alertMappingRoutes.ts
│   │   │   ├── alertCorrelationRoutes.ts
│   │   │   ├── alertNoiseRoutes.ts
│   │   │   ├── alertAutoRoutes.ts
│   │   │   └── alertAutoResponseRoutes.ts
│   │   ├── services/
│   │   │   ├── alertService.ts
│   │   │   ├── alertNotificationService.ts
│   │   │   ├── alertCorrelationService.ts
│   │   │   ├── alertNoiseReductionService.ts
│   │   │   ├── alertAutoAnalyzer.ts
│   │   │   ├── alertDeviceResolver.ts
│   │   │   ├── alertProviderRegistry.ts
│   │   │   ├── alertSourceAdapters.ts
│   │   │   └── alertWorkflowMappingService.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   ├── ai/                             # 🤖 AI / Agent
│   │   ├── routes/
│   │   │   ├── agentRoutes.ts
│   │   │   ├── multiAgentRoutes.ts
│   │   │   ├── aiModelRoutes.ts
│   │   │   ├── copilotRoutes.ts
│   │   │   ├── knowledgeRoutes.ts
│   │   │   ├── knowledgeQAnythingRoutes.ts
│   │   │   ├── rootCauseAnalysisRoutes.ts
│   │   │   └── aiRemediationRoutes.ts
│   │   ├── services/
│   │   │   ├── agentExecutor.ts
│   │   │   ├── agentToolRegistry.ts
│   │   │   ├── llmService.ts
│   │   │   ├── multiAgentCollaboration.ts
│   │   │   ├── copilotService.ts
│   │   │   ├── enhancedRAGService.ts
│   │   │   ├── qanythingService.ts
│   │   │   ├── rootCauseAnalysisService.ts
│   │   │   ├── aiRemediationService.ts
│   │   │   ├── localRuleEngine.ts
│   │   │   └── aiModelService.ts
│   │   │   └── *.test.ts
│   │   ├── prompts/                    # ← 从 prompts/ 移入
│   │   └── README.md
│   │
│   ├── dc/                             # 🏗️ 数据中心 (已重构)
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── rooms.ts
│   │   │   ├── racks.ts
│   │   │   ├── slots.ts
│   │   │   ├── overview.ts
│   │   │   ├── devices.ts
│   │   │   ├── pdus.ts
│   │   │   ├── lifecycle.ts
│   │   │   ├── exportImport.ts
│   │   │   ├── manufacturers.ts
│   │   │   ├── deviceTypes.ts
│   │   │   ├── powerPanels.ts
│   │   │   ├── powerFeeds.ts
│   │   │   └── cables.ts
│   │   ├── services/
│   │   │   └── dcStatusService.ts
│   │   └── README.md
│   │
│   ├── workflow/                       # ⚙️ 工作流
│   │   ├── routes/
│   │   │   ├── workflowRoutes.ts
│   │   │   ├── taskRoutes.ts
│   │   │   └── scheduledTaskRoutes.ts
│   │   ├── services/
│   │   │   ├── workflowExecutor.ts
│   │   │   ├── workflowExpressionEvaluator.ts
│   │   │   ├── workflowProviderRegistry.ts
│   │   │   ├── queueService.ts
│   │   │   ├── queueBullAdapter.ts
│   │   │   └── schedulerService.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   ├── containers/                     # 📦 容器 / 虚拟化
│   │   ├── routes/
│   │   │   ├── containerRoutes.ts
│   │   │   ├── dockerRoutes.ts
│   │   │   ├── imageRoutes.ts
│   │   │   ├── volumeRoutes.ts
│   │   │   ├── registryRoutes.ts
│   │   │   ├── virtualMachineRoutes.ts
│   │   │   ├── vmManagementRoutes.ts
│   │   │   └── vmMigrationRoutes.ts
│   │   ├── services/
│   │   │   ├── dockerService.ts
│   │   │   ├── containerLogService.ts
│   │   │   ├── containerMonitorService.ts
│   │   │   ├── multiHostDockerService.ts
│   │   │   ├── vmMigrationService.ts
│   │   │   └── vmSnapshotSchedulerService.ts
│   │   └── README.md
│   │
│   ├── infra/                          # 🔧 基础设施
│   │   ├── routes/
│   │   │   ├── settingsRoutes.ts
│   │   │   ├── auditRoutes.ts
│   │   │   ├── backupRoutes.ts
│   │   │   ├── snapshotPolicyRoutes.ts
│   │   │   ├── configTemplateRoutes.ts
│   │   │   ├── configRepairRoutes.ts
│   │   │   ├── scriptRoutes.ts
│   │   │   ├── composeRoutes.ts
│   │   │   ├── webhookRoutes.ts
│   │   │   ├── toolLinkRoutes.ts
│   │   │   ├── approvalRoutes.ts
│   │   │   ├── notificationRoutes.ts
│   │   │   ├── notificationConfigRoutes.ts
│   │   │   └── importExportRoutes.ts
│   │   ├── services/
│   │   │   ├── backupService.ts
│   │   │   ├── configBackupService.ts
│   │   │   ├── configParser.ts
│   │   │   ├── configRepairService.ts
│   │   │   ├── configTemplateService.ts
│   │   │   ├── changeService.ts
│   │   │   ├── composeService.ts
│   │   │   ├── notificationService.ts
│   │   │   ├── notificationChannels.ts
│   │   │   ├── commandDispatcher.ts
│   │   │   ├── terminalService.ts
│   │   │   ├── auditService.ts
│   │   │   ├── reportService.ts
│   │   │   └── importExportService.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   ├── monitor/                        # 📊 监控 / 仪表盘
│   │   ├── routes/
│   │   │   ├── monitorRoutes.ts
│   │   │   ├── dashboardRoutes.ts
│   │   │   ├── costAnalysisRoutes.ts
│   │   │   └── reportRoutes.ts
│   │   ├── services/
│   │   │   ├── selfMonitorService.ts
│   │   │   ├── costAnalysisService.ts
│   │   │   └── healthService.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   ├── database/                       # 🗄️ 数据库管理
│   │   ├── routes/
│   │   │   ├── databaseRoutes.ts
│   │   │   └── dbConnectionsRoutes.ts
│   │   ├── services/
│   │   │   └── dbskiterService.ts
│   │   └── README.md
│   │
│   ├── auto/                           # 🤖 自动化
│   │   ├── routes/
│   │   │   ├── autoScaleRoutes.ts
│   │   │   ├── remediationPolicyRoutes.ts
│   │   │   ├── remediationExecutionRoutes.ts
│   │   │   └── remediationAuditRoutes.ts
│   │   ├── services/
│   │   │   ├── autoScaleService.ts
│   │   │   └── remediationService.ts
│   │   │   └── *.test.ts
│   │   └── README.md
│   │
│   └── kubernetes/                     # ☸️ K8s
│       ├── routes/
│       │   └── kubernetesRoutes.ts
│       ├── services/
│       │   └── kubernetesService.ts
│       └── README.md
│
├── shared/                             # 共享库
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── cors.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── requestLogger.middleware.ts
│   │   └── validate.middleware.ts
│   ├── utils/
│   │   ├── response.ts
│   │   ├── logger.ts
│   │   ├── helpers.ts
│   │   └── validators.ts
│   ├── websocket/
│   │   ├── handler.ts
│   │   └── index.ts
│   ├── types/
│   ├── constants/
│   ├── schemas/
│   ├── database.ts
│   └── index.ts
│
├── models/
│   └── migrations/                     # 数据库迁移（保持原位）
│       ├── index.ts
│       ├── migrationFramework.ts
│       ├── v001_initial_schema.ts
│       └── ...（36 个迁移文件，全部保持不动）
│
├── app.ts                              # 只改 import 路径
├── index.ts
└── data/                               # SQLite 数据文件
```

### 前端也对应拆分

```
frontend/src/
├── features/
│   ├── auth/             Login, ForcePasswordChange, Users
│   ├── servers/          Servers, ServerGroups, SSHKeys
│   ├── network/          NetworkDevices, Networks, Discovery, Topology, SNMP
│   ├── alerts/           Alerts, Mappings, Correlation, Noise, Auto, Providers
│   ├── ai/               Agents, AIInsights, AIModels, Knowledge, RootCause, Tools
│   ├── dcim/             DataRoom, DataCenterManage（已重构）
│   ├── workflow/         Workflows, Editor, Tasks, Scheduled
│   ├── containers/       Containers, Monitor, Logs, Images, VM, ...
│   ├── infra/            Settings, Audit, Backup, Config, Webhook, ...
│   ├── monitor/          Dashboard, BigScreen, CostAnalysis
│   ├── database/         Databases, DbConnections
│   ├── auto/             AutoScale, Remediation*
│   └── kubernetes/       Kubernetes
├── components/            全局共享组件
├── config/navigation.ts   导航配置（已提取）
├── lib/
└── hooks/
```

---

## 四、实施步骤

### 4.1 准备

```bash
git checkout -b refactor/module-architecture
```

### 4.2 运行自动化脚本

```powershell
powershell -ExecutionPolicy Bypass -File scripts\reorganize.ps1
```

脚本会：
1. 创建所有模块目录
2. 用 `git mv` 搬文件（保留 git 历史）
3. 输出 `IMPORT_CHANGES.txt` 列出需改 import 的文件

### 4.3 改 import 路径

**A. app.ts 中的路由注册（66 处）**

```typescript
// 改前
import alertRoutes from './routes/alertRoutes';
// 改后
import alertRoutes from './modules/alerts/routes/alertRoutes';
```

**B. 各文件内部引用**

| 旧路径 | 新路径 |
|--------|--------|
| `from '../services/xxx'` | `from './services/xxx'`（同模块）|
| `from '../../services/xxx'` | `from '../modules/xxx/services/xxx'`（跨模块）|
| `from '../models/database'` | `from '../shared/database'` |
| `from '../utils/response'` | `from '../shared/utils/response'` |
| `from '../middleware/xxx'` | `from '../shared/middleware/xxx'` |
| `from '../websocket/xxx'` | `from '../shared/websocket/xxx'` |

### 4.4 每个模块加 README.md

每个 `modules/*/README.md` 包含：

```markdown
# [模块名]

## 职责
（一句话描述这个模块干什么）

## 路由
- `GET /api/xxx` — 干什么

## 依赖
- 依赖 shared/database.ts
- 依赖 modules/xxx/services/xxx

## 关键文件
- `xxxService.ts` — 核心业务逻辑
```

**示例——alerts/README.md：**

```markdown
# alerts — 告警系统

## 职责
告警的接收、处理、关联分析、降噪、通知、自动修复。

## 路由文件
- `alertRoutes.ts` — 告警 CRUD、统计、状态变更
- `alertMappingRoutes.ts` — 告警源映射规则
- `alertCorrelationRoutes.ts` — 告警关联分析
- `alertNoiseRoutes.ts` — 告警降噪规则
- `alertAutoRoutes.ts` — 自动分析
- `alertAutoResponseRoutes.ts` — 自动响应

## 关键服务
- `alertService.ts` — 告警 CRUD，核心入口
- `alertNotificationService.ts` — 通知发送
- `alertCorrelationService.ts` — 关联分析引擎
- `alertNoiseReductionService.ts` — 降噪引擎
- `alertAutoAnalyzer.ts` — 自动分析
- `alertProviderRegistry.ts` — 告警源注册

## 依赖
- shared/database.ts
- shared/utils/response.ts
- modules/infra/services/notificationService.ts
- modules/auto/services/remediationService.ts
```

### 4.5 验证

```bash
# 每改完一个模块，立刻验证
cd backend
npx tsc --noEmit        # 编译检查
npx vitest run          # 跑测试

# 全部改完后
cd frontend
npm run build           # 前端编译
```

---

## 五、回滚策略

```bash
# 还没 commit
git reset --hard HEAD

# 已 commit 某个模块
git revert <commit-hash>

# 生产环境出问题，保留新目录同时还原旧目录
git checkout <safe-commit> -- backend/src/routes/ backend/src/services/
```

---

## 六、AI 使用指南

改完后再开新功能时，把这段告诉 AI：

```
该项目代码按业务域分组：

modules/auth/       → 认证
modules/servers/    → 服务器管理
modules/network/    → 网络设备
modules/alerts/     → 告警系统    ← 改告警去这
modules/ai/         → AI/Agent   ← 改 AI 去这
modules/dc/         → 数据中心
modules/workflow/   → 工作流
modules/containers/ → 容器/VM
modules/infra/      → 基础设施
modules/monitor/    → 监控仪表盘
modules/database/   → 数据库
modules/auto/       → 自动化
modules/kubernetes/ → K8s

shared/              → 共享工具/中间件
```

---

## 七、检查清单

- [ ] `git checkout -b refactor/module-architecture`
- [ ] 运行 `scripts\reorganize.ps1`
- [ ] 改 `app.ts` 路由 import
- [ ] 按 `IMPORT_CHANGES.txt` 改各文件内部 import
- [ ] 改前端 lazy import
- [ ] 改 `config/navigation.ts`
- [ ] 每个模块加 `README.md`
- [ ] `npx tsc --noEmit` 通过
- [ ] `npx vitest run` 通过
- [ ] `npm run build` 通过
- [ ] 提交：`git commit -m "refactor: module architecture"`
