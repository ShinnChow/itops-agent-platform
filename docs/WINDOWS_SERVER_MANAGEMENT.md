# Windows 服务器管理开发指导

实现 Windows 服务器监控 + 远程桌面的完整企业级服务器管理方案。

## 目录

- [方案概述](#方案概述)
- [架构设计](#架构设计)
- [第一阶段：Windows 监控支持](#第一阶段windows-监控支持)
- [第二阶段：远程桌面基础](#第二阶段远程桌面基础)
- [第三阶段：高级功能](#第三阶段高级功能)
- [数据库变更](#数据库变更)
- [开发参考](#开发参考)

---

## 方案概述

### 核心价值

本方案通过 **SSH + PowerShell** 实现监控，**noVNC + VNC Server** 实现远程桌面，形成完整的闭环工作流：

```
📊 监控发现问题 → 🖥️ 远程桌面解决问题
```

| 维度 | 纯 SSH | 本方案（监控+远程桌面） |
|------|--------|--------------------------|
| 问题发现 | ❌ 需手动查看 | ✅ 自动监控 + 告警 |
| 问题处理 | ✅ 命令行操作 | ✅ 命令行 + 图形界面 |
| 适用场景 | 仅 Linux 熟练用户 | 所有运维人员 |
| 用户体验 | 单一 | 丰富、直观 |
| 商业价值 | 基础 | **企业级产品竞争力** |

### 技术选型

| 功能模块 | 技术方案 | 理由 |
|---------|----------|------|
| 监控采集 | SSH + PowerShell | Windows 10+/Server 2019+ 内置 OpenSSH，复用现有连接池 |
| 远程桌面 | noVNC + TightVNC | 纯 Web 方案，开源免费，跨平台 |

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Web 管理界面                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │ 📊 监控面板   │  │ 🖥️ 远程桌面    │  │ 💻 SSH 终端       │ │
│  │ CPU/内存趋势  │  │ VNC/RDP 连接   │  │ 命令行脚本执行    │ │
│  │ 磁盘网络使用  │  │ 图形界面操作   │  │ 文件传输         │ │
│  │ 告警通知      │  │ 文件管理器      │  │ 日志查看         │ │
│  └──────────────┘  └───────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────────┐ ┌───────────┐ ┌───────────────┐
│ 后端 API 服务    │ │ VNC 代理   │ │ SSH 连接池    │
│ 数据采集引擎     │ │ WebSocket │ │ 命令执行服务   │
│ 告警规则引擎     │ │ 画面转发   │ │ 文件传输服务   │
└──────────────────┘ └───────────┘ └───────────────┘
          │               │               │
          ▼               ▼               ▼
┌──────────────────┐ ┌───────────┐ ┌───────────────┐
│ Windows 服务器    │ │ VNC 服务  │ │ SSH 服务      │
│ PowerShell 命令   │ │ 端口 5900 │ │ 端口 22       │
│ 性能计数器 API    │ │ TightVNC  │ │ OpenSSH       │
└──────────────────┘ └───────────┘ └───────────────┘
```

### 后端文件结构

```
backend/src/
├── services/
│   ├── commandDispatcher.ts       # 新增：命令分发器（Linux/Windows）
│   ├── windowsMetricsCollector.ts  # 新增：Windows 指标采集
│   ├── vncProxyService.ts         # 新增：VNC 代理服务
│   ├── serverInfoCollector.ts     # 已有：需修改，支持 Windows
│   └── sshService.ts              # 已有：需修改，支持 Windows 合规检查
├── routes/
│   ├── vncRoutes.ts               # 新增：VNC 代理路由
│   └── serverManagementRoutes.ts   # 已有：需修改
└── ...
```

### 前端文件结构

```
frontend/src/
├── pages/
│   ├── RemoteDesktop.tsx          # 新增：远程桌面页面
│   ├── Servers.tsx                # 已有：需修改，增加 OS 选择和 VNC 配置
│   └── TerminalPage.tsx           # 已有
└── components/
    ├── VNCViewer.tsx              # 新增：VNC 查看器组件
    └── ...
```

---

## 第一阶段：Windows 监控支持

**目标**：实现 Windows 服务器的信息采集和指标监控

### 1.1 创建命令分发器

创建文件：[backend/src/services/commandDispatcher.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/commandDispatcher.ts)

```typescript
export type OSType = 'linux' | 'windows' | 'unknown'

export interface CommandTemplates {
  info: {
    os: string
    cpu_cores: string
    memory_gb: string
    disk_gb: string
    ip_address: string
  }
  metrics: {
    cpu_usage: string
    memory: string
    disk: string
    network: string
    load: string
    uptime: string
  }
  compliance: {
    cpu: string
    memory: string
    disk: string
    network: string
    users: string
    services: string
    uptime: string
    os_info: string
  }
}

const LinuxTemplates: CommandTemplates = {
  info: {
    os: "cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d'=' -f2 | tr -d '\"'",
    cpu_cores: "nproc 2>/dev/null || grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 0",
    memory_gb: "free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0",
    disk_gb: "df -BG 2>/dev/null | awk '/^\\//{sum+=$2}END{print int(sum)}' || echo 0",
    ip_address: "hostname -I 2>/dev/null | awk '{print $1}' || echo ''"
  },
  metrics: {
    cpu_usage: "top -bn1 | grep 'Cpu(s)' | awk '{print 100 - $8}' || cat /proc/stat | awk '/^cpu / {print ($2+$4)*100/($2+$4+$5)}'",
    memory: "free -m | awk '/^Mem:/{printf \"%.1f %.1f %.1f\", $2/1024, $3/1024, $3*100/$2}'",
    disk: "df -m --output=source,size,used,pcent / 2>/dev/null | tail -1 | awk '{print $2/1024, $3/1024, $4}' || df -BM / | tail -1 | awk '{print $2, $3, $5}'",
    network: "cat /proc/net/dev 2>/dev/null | grep -v lo: | awk 'NR>2 {rx+=$2; tx+=$10} END {printf \"%.2f %.2f\", rx/1024/1024, tx/1024/1024}' || echo \"0 0\"",
    load: "cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}' || uptime | awk -F'load average:' '{print $2}'",
    uptime: "cat /proc/uptime 2>/dev/null | awk '{print int($1)}' || echo \"0\""
  },
  compliance: {
    cpu: 'top -bn1 | head -20',
    memory: 'free -h && cat /proc/meminfo | head -20',
    disk: 'df -h && du -sh /* 2>/dev/null | sort -rh | head -20',
    network: 'ip addr && netstat -tulpn 2>/dev/null || ss -tulpn',
    users: 'cat /etc/passwd | cut -d: -f1,3,6,7',
    services: 'systemctl list-units --type=service --state=running 2>/dev/null || service --status-all 2>&1 | grep "+"',
    uptime: 'uptime && w',
    os_info: 'cat /etc/os-release && uname -a'
  }
}

const WindowsTemplates: CommandTemplates = {
  info: {
    os: "powershell -Command \"(Get-CimInstance Win32_OperatingSystem).Caption\"",
    cpu_cores: "powershell -Command \"(Get-CimInstance Win32_Processor).NumberOfCores\"",
    memory_gb: "powershell -Command \"[math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1MB, 1)\"",
    disk_gb: "powershell -Command \"$total = 0; Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | ForEach-Object { $total += $_.Size }; [math]::Round($total / 1GB, 1)\"",
    ip_address: "powershell -Command \"(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { -not $_.IPAddress.StartsWith('127.') } | Select-Object -First 1).IPAddress\""
  },
  metrics: {
    cpu_usage: "powershell -Command \"(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue\"",
    memory: "powershell -Command \"$os = Get-CimInstance Win32_OperatingSystem; $total = $os.TotalVisibleMemorySize / 1MB; $free = $os.FreePhysicalMemory / 1MB; $used = $total - $free; $percent = ($used / $total) * 100; Write-Output \\\"$total $used $percent\\\"\"",
    disk: "powershell -Command \"$disk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq 'C:' }; $total = [math]::Round($disk.Size / 1GB, 2); $used = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2); $percent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1); Write-Output \\\"$total $used $percent\\\"\"",
    network: "powershell -Command \"$stats = Get-NetAdapterStatistics -Name '*' | Where-Object { $_.Name -notlike '*Loopback*' }; $rx = 0; $tx = 0; $stats | ForEach-Object { $rx += $_.ReceivedBytes; $tx += $_.SentBytes }; Write-Output \\\"$([math]::Round($rx / 1MB, 2)) $([math]::Round($tx / 1MB, 2))\\\"\"",
    load: "powershell -Command \"Write-Output '0 0 0'\"",
    uptime: "powershell -Command \"(Get-CimInstance Win32_OperatingSystem).LastBootUpTime; $uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; Write-Output $uptime.TotalSeconds\""
  },
  compliance: {
    cpu: 'powershell -Command "Get-Counter \'\\Processor(_Total)\\% Processor Time\' -SampleInterval 1 -MaxSamples 3 | Select-Object -ExpandProperty CounterSamples"',
    memory: 'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory; Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 Name, WorkingSet"',
    disk: 'powershell -Command "Get-CimInstance Win32_LogicalDisk | Where-Object DriveType -eq 3 | Select-Object DeviceID, Size, FreeSpace"',
    network: 'powershell -Command "Get-NetIPAddress; Get-NetAdapter; Get-NetTCPConnection -State Listen"',
    users: 'powershell -Command "Get-LocalUser | Select-Object Name, Enabled, LastLogon"',
    services: 'powershell -Command "Get-Service | Where-Object Status -eq Running | Select-Object Name, DisplayName, Status"',
    uptime: 'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object LastBootUpTime; (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime"',
    os_info: 'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber"',
  }
}

export function getCommandTemplates(osType: OSType): CommandTemplates {
  switch (osType) {
    case 'linux':
      return LinuxTemplates
    case 'windows':
      return WindowsTemplates
    default:
      return LinuxTemplates
  }
}

export function detectOSType(osOutput: string): OSType {
  const lower = osOutput.toLowerCase()
  if (lower.includes('windows') || lower.includes('microsoft')) {
    return 'windows'
  }
  if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('debian') || lower.includes('centos')) {
    return 'linux'
  }
  return 'unknown'
}
```

### 1.2 修改 serverInfoCollector.ts

修改文件：[backend/src/services/serverInfoCollector.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/serverInfoCollector.ts)

添加对 Windows 的支持，使用命令分发器。

```typescript
import { getCommandTemplates, detectOSType, OSType } from './commandDispatcher'

// ... 现有代码 ...

async collectServerInfo(serverId: string): Promise<ServerInfoResult> {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId) as ServerInfo | undefined

  if (!server || !server.enabled) {
    return { success: false, error: 'Server not found or disabled' }
  }

  let conn: Client | null = null

  return new Promise((resolve) => {
    sshPool.acquire(serverId).then((connection) => {
      conn = connection
    }).catch((error) => {
      resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to acquire SSH connection' })
      return
    }).then(() => {
      if (!conn) return

      let isResolved = false

      const safeResolve = (result: ServerInfoResult) => {
        if (!isResolved) {
          isResolved = true
          if (conn) {
            sshPool.release(conn, result.success)
          }
          resolve(result)
        }
      }

      // 先检测操作系统类型
      conn.exec('uname -a 2>/dev/null || powershell -Command "(Get-CimInstance Win32_OperatingSystem).Caption"', (err, stream) => {
        if (err) {
          safeResolve({ success: false, error: err.message })
          return
        }

        let osDetectOutput = ''
        stream.on('data', (data: Buffer) => {
          osDetectOutput += data.toString('utf-8')
        })
        stream.on('close', () => {
          const detectedOS = detectOSType(osDetectOutput)
          const templates = getCommandTemplates(detectedOS)

          // 更新服务器的 os_type
          db.prepare('UPDATE servers SET os_type = ? WHERE id = ?').run(detectedOS, serverId)

          // 使用对应系统的模板命令采集信息
          const results: Record<string, string> = {}
          let completed = 0
          const total = Object.keys(templates.info).length

          const checkComplete = () => {
            completed++
            if (completed === total) {
              const osClean = results.os.replace(/\\n/g, '').trim()

              const data = {
                os: osClean || 'Unknown',
                cpu_cores: parseInt(results.cpu_cores, 10) || 0,
                memory_gb: parseFloat(results.memory_gb) || 0,
                disk_gb: parseFloat(results.disk_gb) || 0,
                ip_address: results.ip_address.trim(),
                private_ip: results.ip_address.trim()
              }

              db.prepare(`
                UPDATE servers 
                SET os = ?, cpu_cores = ?, memory_gb = ?, disk_gb = ?, 
                    ip_address = ?, private_ip = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(data.os, data.cpu_cores, data.memory_gb, data.disk_gb, data.ip_address, data.private_ip, serverId)

              logger.info(`Server info collected for ${server.name} (${serverId}), OS: ${detectedOS}`)
              safeResolve({ success: true, data })
            }
          }

          for (const [key, cmd] of Object.entries(templates.info)) {
            conn!.exec(cmd, (err, stream) => {
              if (err) {
                results[key] = ''
                checkComplete()
                return
              }

              let output = ''
              stream.on('data', (data: Buffer) => {
                output += data.toString('utf-8')
              })

              stream.on('close', () => {
                results[key] = output.trim()
                checkComplete()
              })

              stream.stderr.on('data', () => { /* ignore stderr */ })
            })
          }
        })
      })
    })
  })
}
```

### 1.3 同样修改 metrics 采集

在 `collectServerMetrics` 函数中，同样使用命令分发器来支持 Windows 指标采集。

### 1.4 修改合规检查

修改文件：[backend/src/services/sshService.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/sshService.ts)

```typescript
// 导入命令分发器
import { getCommandTemplates, OSType } from './commandDispatcher'

// ... 现有代码 ...

// 修改合规检查函数，根据 os_type 选择命令
export async function runComplianceCheck(
  serverId: string,
  options: {
    saveResults?: boolean
    useAI?: boolean
    concurrency?: number
  } = {}
): Promise<Record<string, CommandResult>> {
  const checkId = randomUUID()
  const results: Record<string, CommandResult> = {}
  const useAI = options.useAI !== false
  const concurrency = options.concurrency ?? 3

  // 获取服务器的 os_type
  const server = db.prepare('SELECT os_type FROM servers WHERE id = ?').get(serverId) as { os_type?: string }
  const osType = (server?.os_type || 'linux') as OSType
  const templates = getCommandTemplates(osType)

  // 使用对应系统的合规检查命令
  const complianceCheckList = [
    { name: 'CPU Usage', command: templates.compliance.cpu },
    { name: 'Memory Usage', command: templates.compliance.memory },
    { name: 'Disk Usage', command: templates.compliance.disk },
    { name: 'Network Info', command: templates.compliance.network },
    { name: 'User List', command: templates.compliance.users },
    { name: 'Running Services', command: templates.compliance.services },
    { name: 'Uptime', command: templates.compliance.uptime },
    { name: 'OS Info', command: templates.compliance.os_info },
  ]

  // ... 其余代码保持不变 ...
}
```

### 1.5 前端修改

修改文件：[frontend/src/pages/Servers.tsx](file:///c:/Users/11159/Desktop/自开发代码/ai/frontend/src/pages/Servers.tsx)

在添加/编辑服务器的表单中增加操作系统类型选择：

```typescript
// 在 ServerForm 组件中
<div className="space-y-2">
  <label className="text-sm font-medium">操作系统类型</label>
  <select
    value={formData.os_type || 'linux'}
    onChange={(e) => setFormData({ ...formData, os_type: e.target.value })}
    className="w-full px-3 py-2 rounded-lg border bg-background"
  >
    <option value="linux">Linux</option>
    <option value="windows">Windows</option>
  </select>
</div>
```

---

## 第二阶段：远程桌面基础

**目标**：实现基于 noVNC 的远程桌面功能

### 2.1 数据库变更

创建迁移脚本：

```sql
-- 添加 VNC 相关字段
ALTER TABLE servers ADD COLUMN vnc_port INTEGER DEFAULT 5900;
ALTER TABLE servers ADD COLUMN vnc_password TEXT;
```

### 2.2 创建 VNC 代理服务

创建文件：[backend/src/services/vncProxyService.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/vncProxyService.ts)

```typescript
import { Server } from 'socket.io'
import net from 'net'
import { logger } from '../utils/logger'

interface VNCSession {
  id: string
  serverId: string
  vncHost: string
  vncPort: number
  vncSocket: net.Socket | null
  clientSocketId: string
  createdAt: number
}

class VNCProxyService {
  private sessions: Map<string, VNCSession> = new Map()

  initialize(io: Server) {
    io.of('/vnc').on('connection', (socket) => {
      logger.info(`VNC client connected: ${socket.id}`)

      socket.on('vnc:connect', async (data: { serverId: string; vncHost: string; vncPort: number; password?: string }) => {
        try {
          const sessionId = `${data.serverId}-${Date.now()}`
          const session: VNCSession = {
            id: sessionId,
            serverId: data.serverId,
            vncHost: data.vncHost,
            vncPort: data.vncPort,
            vncSocket: null,
            clientSocketId: socket.id,
            createdAt: Date.now()
          }

          // 连接到 VNC 服务器
          const vncSocket = net.connect({
            host: data.vncHost,
            port: data.vncPort
          })

          session.vncSocket = vncSocket
          this.sessions.set(sessionId, session)

          vncSocket.on('connect', () => {
            logger.info(`Connected to VNC server ${data.vncHost}:${data.vncPort}`)
            socket.emit('vnc:connected', { sessionId })
          })

          vncSocket.on('data', (data) => {
            socket.emit('vnc:data', data)
          })

          vncSocket.on('error', (err) => {
            logger.error(`VNC connection error: ${err.message}`)
            socket.emit('vnc:error', { message: err.message })
          })

          vncSocket.on('close', () => {
            logger.info(`VNC connection closed`)
            socket.emit('vnc:closed')
            this.sessions.delete(sessionId)
          })

          // 从客户端接收数据转发给 VNC 服务器
          socket.on('vnc:client-data', (data) => {
            if (vncSocket && !vncSocket.destroyed) {
              vncSocket.write(data)
            }
          })

          socket.on('vnc:disconnect', () => {
            if (vncSocket) {
              vncSocket.destroy()
            }
            this.sessions.delete(sessionId)
          })

        } catch (error) {
          logger.error('Failed to establish VNC connection:', error)
          socket.emit('vnc:error', { message: error instanceof Error ? error.message : 'Unknown error' })
        }
      })

      socket.on('disconnect', () => {
        logger.info(`VNC client disconnected: ${socket.id}`)
        // 清理关联的会话
        for (const [id, session] of this.sessions) {
          if (session.clientSocketId === socket.id && session.vncSocket) {
            session.vncSocket.destroy()
            this.sessions.delete(id)
          }
        }
      })
    })
  }

  getSessionCount() {
    return this.sessions.size
  }
}

export const vncProxyService = new VNCProxyService()
```

### 2.3 创建 VNC 路由

创建文件：[backend/src/routes/vncRoutes.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/routes/vncRoutes.ts)

```typescript
import { Router } from 'express'
import db from '../models/database'

const router = Router()

// 获取服务器 VNC 配置
router.get('/config/:serverId', (req, res) => {
  try {
    const server = db.prepare('SELECT hostname, vnc_port, vnc_password FROM servers WHERE id = ?').get(req.params.serverId) as any

    if (!server) {
      return res.status(404).json({ error: 'Server not found' })
    }

    res.json({
      hostname: server.hostname,
      vnc_port: server.vnc_port,
      vnc_password: server.vnc_password // 实际应该加密传输，这里简化演示
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get VNC config' })
  }
})

export default router
```

### 2.4 集成 VNC 服务到主应用

修改 [backend/src/app.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/app.ts)

```typescript
import vncRoutes from './routes/vncRoutes'
import { vncProxyService } from './services/vncProxyService'

// ... 现有代码 ...

// 注册 VNC 路由
app.use('/api/vnc', vncRoutes)

// ... 在 Socket.io 初始化之后 ...
vncProxyService.initialize(io)
```

### 2.5 前端创建远程桌面页面

创建文件：[frontend/src/pages/RemoteDesktop.tsx](file:///c:/Users/11159/Desktop/自开发代码/ai/frontend/src/pages/RemoteDesktop.tsx)

```typescript
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import RFB from '@novnc/novnc/core/rfb'
import { Button, Card, Select, message } from 'antd'
import { ArrowLeft, MonitorPlay, PowerOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const { Option } = Select

interface Server {
  id: string
  name: string
  hostname: string
  vnc_port: number
}

export default function RemoteDesktop() {
  const { serverId } = useParams<{ serverId: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServer, setSelectedServer] = useState<string | undefined>(serverId)
  const [isConnected, setIsConnected] = useState(false)
  const rfbRef = useRef<RFB | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 加载服务器列表（过滤有 VNC 配置的）
    const loadServers = async () => {
      try {
        const res = await fetch('/api/servers', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        const vncServers = data.filter((s: any) => s.vnc_port)
        setServers(vncServers)
      } catch (err) {
        console.error('Failed to load servers:', err)
      }
    }
    loadServers()
  }, [token])

  useEffect(() => {
    if (selectedServer && containerRef.current) {
      connectToVNC(selectedServer)
    }

    return () => {
      if (rfbRef.current) {
        rfbRef.current.disconnect()
      }
    }
  }, [selectedServer])

  const connectToVNC = async (serverId: string) => {
    try {
      // 获取 VNC 配置
      const res = await fetch(`/api/vnc/config/${serverId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const config = await res.json()

      // 连接 VNC
      const url = `wss://${window.location.host}/vnc`
      const rfb = new RFB(containerRef.current!, url, {
        shared: true
      })

      rfbRef.current = rfb

      rfb.addEventListener('connect', () => {
        setIsConnected(true)
        message.success('已连接到远程桌面')
      })

      rfb.addEventListener('disconnect', () => {
        setIsConnected(false)
        message.info('已断开连接')
      })

      rfb.addEventListener('securityfailure', (e) => {
        message.error('连接失败: ' + (e.detail as any).reason)
      })

    } catch (error) {
      message.error('连接失败')
      console.error(error)
    }
  }

  const handleDisconnect = () => {
    if (rfbRef.current) {
      rfbRef.current.disconnect()
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/servers')}
          >
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MonitorPlay className="w-6 h-6" />
              远程桌面
            </h1>
            <p className="text-gray-500 mt-1">
              通过 VNC 连接远程服务器桌面
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {/* 服务器选择器 */}
        <Card>
          <div className="flex items-center gap-4">
            <Select
              placeholder="选择服务器"
              style={{ width: 300 }}
              value={selectedServer}
              onChange={setSelectedServer}
            >
              {servers.map(server => (
                <Option key={server.id} value={server.id}>
                  {server.name} ({server.hostname}:{server.vnc_port})
                </Option>
              ))}
            </Select>

            {isConnected && (
              <Button
                danger
                icon={<PowerOff className="w-4 h-4" />}
                onClick={handleDisconnect}
              >
                断开连接
              </Button>
            )}
          </div>
        </Card>

        {/* VNC 显示区域 */}
        <Card className="min-h-[600px]">
          <div
            ref={containerRef}
            className="w-full h-[600px] bg-gray-900 flex items-center justify-center"
          >
            {!isConnected && !selectedServer && (
              <div className="text-center text-gray-400">
                <MonitorPlay className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>选择服务器开始连接</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
```

### 2.6 安装前端依赖

```bash
cd frontend
npm install @novnc/novnc
```

### 2.7 添加路由

在前端路由配置中添加远程桌面页面路由。

---

## 第三阶段：高级功能

**目标**：实现监控仪表盘、告警、批量操作等高级功能

### 3.1 监控仪表盘增强

- 显示 Windows 服务器的专属指标
- 趋势图表（使用 Chart.js 或 ECharts）
- 自定义监控面板

### 3.2 告警规则引擎

创建告警规则：
- CPU 超过 90% 持续 5 分钟
- 内存使用率超过 85%
- 磁盘空间不足 10%
- 关键服务停止运行

### 3.3 远程桌面增强

- 剪贴板同步
- 文件传输
- 屏幕截图/录制（用于审计）
- 会话共享

### 3.4 批量操作

- 批量采集信息
- 批量执行 PowerShell 脚本
- 批量重启服务

---

## 数据库变更

### 完整的 ALTER TABLE 语句

```sql
-- 新增 VNC 相关字段
ALTER TABLE servers ADD COLUMN vnc_port INTEGER DEFAULT 5900;
ALTER TABLE servers ADD COLUMN vnc_password TEXT;

-- 确保 os_type 字段存在（如果已存在可跳过）
-- ALTER TABLE servers ADD COLUMN os_type TEXT DEFAULT 'linux';
```

### 数据库表结构速查

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| vnc_port | INTEGER | VNC 端口 | 5900 |
| vnc_password | TEXT | VNC 密码（加密存储） | NULL |
| os_type | TEXT | 操作系统类型（linux/windows） | linux |

---

## 开发参考

### Windows 服务器前置要求

1. **开启 OpenSSH Server**（Windows 10 1809+/Server 2019+）：
   ```powershell
   # 以管理员身份运行 PowerShell
   Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
   Start-Service sshd
   Set-Service -Name sshd -StartupType 'Automatic'
   ```

2. **安装 TightVNC Server**（用于远程桌面）：
   - 下载地址：https://www.tightvnc.com/download.php
   - 默认端口 5900

### 常用 PowerShell 监控命令

```powershell
# 系统信息
Get-CimInstance Win32_OperatingSystem

# CPU 使用率
Get-Counter '\Processor(_Total)\% Processor Time'

# 内存使用
Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory

# 磁盘信息
Get-CimInstance Win32_LogicalDisk | Where-Object DriveType -eq 3

# 服务状态
Get-Service | Where-Object Status -eq Running

# 网络适配器
Get-NetAdapterStatistics
```

### 项目现有文件参考

- [serverInfoCollector.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/serverInfoCollector.ts) - 服务器信息采集（需修改）
- [sshService.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/sshService.ts) - SSH 服务（需修改）
- [terminalService.ts](file:///c:/Users/11159/Desktop/自开发代码/ai/backend/src/services/terminalService.ts) - Web 终端服务（参考）
- [WebTerminal.tsx](file:///c:/Users/11159/Desktop/自开发代码/ai/frontend/src/components/WebTerminal.tsx) - Web 终端组件（参考）
- [Servers.tsx](file:///c:/Users/11159/Desktop/自开发代码/ai/frontend/src/pages/Servers.tsx) - 服务器管理页面（需修改）
- [TerminalPage.tsx](file:///c:/Users/11159/Desktop/自开发代码/ai/frontend/src/pages/TerminalPage.tsx) - Web 终端页面（参考）

---

## 开发顺序建议

1. **第一阶段**（Windows 监控）：
   - 创建 commandDispatcher.ts
   - 修改 serverInfoCollector.ts
   - 修改 sshService.ts 合规检查
   - 修改前端添加 OS 选择
   - 测试 Windows 信息采集

2. **第二阶段**（远程桌面）：
   - 数据库迁移
   - 创建 vncProxyService.ts
   - 创建 vncRoutes.ts
   - 创建 RemoteDesktop.tsx 和 VNCViewer.tsx
   - 集成到应用
   - 测试 VNC 连接

3. **第三阶段**（高级功能）：
   - 监控仪表盘增强
   - 告警规则
   - 批量操作
   - 其他增强功能

---

## 安全注意事项

1. **VNC 密码加密存储**：与 SSH 密码使用相同的加密机制
2. **VNC 连接安全**：生产环境建议使用 SSH 隧道或 VPN
3. **会话超时**：添加 VNC 会话自动超时机制
4. **审计日志**：记录所有 VNC 连接和断开事件
5. **权限控制**：只有授权用户才能访问远程桌面
