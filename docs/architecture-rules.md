# daima 架构约束规则

> 参照 ongrid 的 `.go-arch-lint.yml` 模式，强制执行模块边界和依赖方向

---

## 核心原则

```
core/（基础设施层）
  ↑
  │  可以依赖
  │
modules/*/（业务模块层）
  ↑
  │  可以依赖（组装层）
  │
app.ts（组装层 / Composition Root）
```

1. **core/ 不得依赖 modules/** — 基础设施层必须业务无关
2. **modules/ 之间禁止 import 对方的 routes.ts** — 防止路由层耦合
3. **modules/ 之间通过 services/ 跨模块通信** — 控制依赖方向
4. **app.ts 是唯一的组装层** — 可以依赖所有模块
5. **禁止循环依赖** — 任何层级都不允许

---

## 架构分层图

```
┌─────────────────────────────────────────────────────────┐
│                      app.ts                             │
│                  （组装层 / 入口）                         │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ modules/ │ modules/ │ modules/ │ modules/ │  ... 13个   │
│   ai     │ alerts   │  auth    │ servers  │  业务模块    │
│  index   │ index    │ index    │ index    │             │
│  routes  │ routes   │ routes   │ routes   │             │
│ services │ services │ services │ services │             │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                      core/                               │
│  middleware/ │ models/ │ utils/ │ types/                 │
│  serviceContainer │ serviceRegistry                      │
└─────────────────────────────────────────────────────────┘
```

---

## 规则详解

### 规则 1: core/ 禁止依赖 modules/

```typescript
// ❌ 禁止 — core/ 不能依赖业务模块
// core/middleware/auth.ts
import { UserService } from '../modules/auth/services';  // 违规！

// ✅ 正确 — core/ 只依赖自身
// core/middleware/auth.ts
import { verifyToken } from '../utils/jwt';
```

### 规则 2: modules/ 禁止跨模块 import routes.ts

```typescript
// ❌ 禁止 — alerts 不能直接依赖 servers 的路由层
// modules/alerts/routes.ts
import { serverRoutes } from '../servers/routes';  // 违规！

// ✅ 正确 — 通过 services/ 通信
// modules/alerts/services/alertService.ts
import { getServerById } from '../../servers/services/serverService';  // 允许
```

### 规则 3: 禁止循环依赖

```typescript
// ❌ 禁止
// modules/a/services/foo.ts → modules/b/services/bar.ts → modules/a/services/foo.ts

// ✅ 正确 — 单向依赖
// modules/a/services/foo.ts → modules/b/services/bar.ts → core/utils/helper.ts
```

### 规则 4: app.ts 是唯一的组装层

```typescript
// ✅ 正确 — app.ts 可以依赖所有模块
// app.ts
import { registerAllModules } from './modules/_registry';
import { initializeMultiAgentSystem } from './modules/ai';
```

### 规则 5: 前端模块禁止跨模块引用页面

```typescript
// ❌ 禁止
// frontend/src/modules/alerts/pages/AlertsPage.tsx
import { ServersList } from '../../servers/components/ServersList';  // 违规！

// ✅ 正确 — 使用 shared/ 共享组件
import { DataTable } from '../../shared/components/DataTable';  // 允许
```

---

## 模块文件结构规范

每个 `modules/` 下的子模块必须包含：

```
modules/<模块名>/
├── index.ts         # 模块统一入口（export routes + services）
├── routes.ts        # 模块路由定义
├── services/        # 业务逻辑层
│   └── *.ts
└── ...              # 其他文件（模型、工具函数等）
```

core/ 必须包含：

```
core/
├── middleware/      # 中间件
├── models/         # 数据模型
├── utils/          # 工具函数
├── types/          # 共享类型
├── serviceContainer.ts   # 服务容器（DI）
└── serviceRegistry.ts    # 服务注册中心
```

---

## 检查方式

### 方式一：自动检查（推荐）

```bash
# 检查全部
node scripts/check-architecture.js

# 只检查后端
node scripts/check-architecture.js backend

# 只检查前端
node scripts/check-architecture.js frontend
```

### 方式二：dependency-cruiser（可选）

```bash
# 安装（首次）
npm install -D dependency-cruiser

# 运行
npx depcruise --config .dependency-cruiser.json backend/src

# 生成可视化图
npx depcruise --config .dependency-cruiser.json backend/src --output-type dot | dot -T svg > deps.svg
```

### 方式三：循环依赖检查（可选）

```bash
# 安装（首次）
npm install -D madge

# 运行
npx madge --circular --extensions ts backend/src
```

---

## CI 集成

在 `.github/workflows/` 中添加：

```yaml
- name: 架构约束检查
  run: node scripts/check-architecture.js
```

---

## 参考资料

- ongrid `.go-arch-lint.yml` — 本规则的直接参考来源
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — TypeScript 依赖检查工具
- [madge](https://github.com/pahen/madge) — 循环依赖检查工具
