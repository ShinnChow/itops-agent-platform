import { db } from './database';
import { logger } from '../utils/logger';
import { env } from '../utils/env';

export function runMigrations() {
  migrateServerColumns();
  createNewColumnIndexes();
  migrateTasksContextColumn();
  migrateTasksExecutionOrderColumn();
  migrateTasksReportIdColumn();
  migrateAgentTable();
  createRemediationTables();
  migrateRemediationExecutionsCascade();
  migrateAlertSourceTracking();
  createAlertNoiseReductionTable();
  migrateAlertFingerprint();
  addMissingIndexes();
  migrateUserPasswordMustChange();
  migrateScheduledTasksLastStatus();
  migrateReportTables();
  checkProductionWebhookSecurity();
  migrateWindowsVncColumns();
}

function migrateServerColumns() {
  try {
    const columns = db.prepare("PRAGMA table_info(servers)").all() as Array<{ name: string; type: string }>;
    const existingColumns = new Set(columns.map(col => col.name));
    
    const newServerColumns = [
      { name: 'os', type: 'TEXT' },
      { name: 'cpu_cores', type: 'INTEGER' },
      { name: 'memory_gb', type: 'REAL' },
      { name: 'disk_gb', type: 'REAL' },
      { name: 'ip_address', type: 'TEXT' },
      { name: 'private_ip', type: 'TEXT' },
      { name: 'cloud_provider', type: 'TEXT' },
      { name: 'cloud_instance_id', type: 'TEXT' }
    ];
    
    for (const col of newServerColumns) {
      if (!existingColumns.has(col.name)) {
        logger.info(`🔄 Adding column: ${col.name} to servers table`);
        try {
          db.prepare(`ALTER TABLE servers ADD COLUMN ${col.name} ${col.type}`).run();
        } catch {
          logger.info(`ℹ️ Column ${col.name} may already exist, skipping`);
        }
      }
    }
    logger.info('✅ Server table extension columns migration complete');
  } catch (e: unknown) {
    logger.info('⚠️ Server migration may have already run, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function createNewColumnIndexes() {
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_servers_cloud_provider ON servers(cloud_provider)').run();
  } catch {
    /* ignore */
  }
}

function migrateTasksContextColumn() {
  try {
    const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
    const hasContextColumn = columns.some(col => col.name === 'context');
    if (!hasContextColumn) {
      logger.info('🔄 Migrating: adding context column to tasks table');
      db.prepare('ALTER TABLE tasks ADD COLUMN context TEXT').run();
      logger.info('✅ Migration complete: context column added');
    }
  } catch (e: unknown) {
    logger.info('ℹ️ Context column migration skipped:', e instanceof Error ? e.message : String(e));
  }
}

function migrateTasksExecutionOrderColumn() {
  try {
    const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
    const hasExecutionOrderColumn = columns.some(col => col.name === 'execution_order');
    if (!hasExecutionOrderColumn) {
      logger.info('🔄 Migrating: adding execution_order column to tasks table');
      db.prepare('ALTER TABLE tasks ADD COLUMN execution_order TEXT').run();
      logger.info('✅ Migration complete: execution_order column added');
    }
  } catch (e: unknown) {
    logger.info('ℹ️ Execution_order column migration skipped:', e instanceof Error ? e.message : String(e));
  }
}

function migrateTasksReportIdColumn() {
  try {
    const columns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
    const hasReportIdColumn = columns.some(col => col.name === 'report_id');
    if (!hasReportIdColumn) {
      logger.info('🔄 Migrating: adding report_id column to tasks table');
      db.prepare('ALTER TABLE tasks ADD COLUMN report_id TEXT').run();
      logger.info('✅ Migration complete: report_id column added');
    }
  } catch (e: unknown) {
    logger.info('ℹ️ Report_id column migration skipped:', e instanceof Error ? e.message : String(e));
  }
}

function migrateAgentTable() {
  try {
    logger.info('🔄 Checking agent table columns...');
    const columns = db.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>;
    const existingColumns = new Set(columns.map(col => col.name));
    
    const newColumns = [
      { name: 'category', type: 'TEXT' },
      { name: 'tags', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'usage_count', type: 'INTEGER DEFAULT 0' },
      { name: 'last_used_at', type: 'DATETIME' }
    ];
    
    for (const col of newColumns) {
      if (!existingColumns.has(col.name)) {
        logger.info(`🔄 Adding column: ${col.name}`);
        try {
          db.prepare(`ALTER TABLE agents ADD COLUMN ${col.name} ${col.type}`).run();
        } catch {
          logger.info(`ℹ️ Column ${col.name} may already exist, skipping`);
        }
      }
    }
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS agent_executions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        agent_name TEXT,
        input_text TEXT,
        output_text TEXT,
        status TEXT,
        error_message TEXT,
        execution_time_ms INTEGER,
        token_count INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `).run();
    
    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_agents_usage ON agents(usage_count)').run();
    } catch {
      logger.info('ℹ️ Index may already exist, skipping');
    }
    
    logger.info('✅ Agent table migration complete');
  } catch (e: unknown) {
    logger.info('⚠️ Migration may have already run, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function createRemediationTables() {
  try {
    logger.info('🔄 Creating remediation tables...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS remediation_policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        alert_source TEXT NOT NULL,
        alert_severity TEXT,
        alert_keywords TEXT,
        alert_tags TEXT,
        execution_mode TEXT NOT NULL DEFAULT 'approval',
        workflow_id TEXT,
        workflow_params TEXT,
        max_executions_per_hour INTEGER DEFAULT 5,
        cooldown_seconds INTEGER DEFAULT 300,
        require_confirmation TEXT,
        enable_verification BOOLEAN DEFAULT 1,
        verification_workflow_id TEXT,
        verification_params TEXT,
        verification_timeout_seconds INTEGER DEFAULT 120,
        enable_rollback BOOLEAN DEFAULT 1,
        rollback_workflow_id TEXT,
        rollback_on_failure BOOLEAN DEFAULT 1,
        enabled BOOLEAN DEFAULT 1,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS remediation_executions (
        id TEXT PRIMARY KEY,
        policy_id TEXT NOT NULL,
        alert_id TEXT NOT NULL,
        alert_snapshot TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        status_reason TEXT,
        approval_required BOOLEAN DEFAULT 0,
        approved_by TEXT,
        approved_at DATETIME,
        approval_comment TEXT,
        workflow_execution_id TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        execution_result TEXT,
        verification_status TEXT,
        verification_result TEXT,
        verification_completed_at DATETIME,
        rollback_triggered BOOLEAN DEFAULT 0,
        rollback_execution_id TEXT,
        rollback_completed_at DATETIME,
        rollback_result TEXT,
        execution_duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (policy_id) REFERENCES remediation_policies(id),
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
      );

      CREATE TABLE IF NOT EXISTS remediation_history (
        id TEXT PRIMARY KEY,
        policy_id TEXT NOT NULL,
        alert_source TEXT,
        alert_severity TEXT,
        execution_status TEXT,
        root_cause TEXT,
        resolution TEXT,
        duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (policy_id) REFERENCES remediation_policies(id)
      );

      CREATE TABLE IF NOT EXISTS remediation_cooldowns (
        policy_id TEXT NOT NULL,
        alert_id TEXT NOT NULL,
        cooldown_until DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (policy_id, alert_id),
        FOREIGN KEY (policy_id) REFERENCES remediation_policies(id) ON DELETE CASCADE,
        FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS server_metrics (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        cpu_usage REAL,
        memory_usage REAL,
        memory_total_gb REAL,
        memory_used_gb REAL,
        disk_usage REAL,
        disk_total_gb REAL,
        disk_used_gb REAL,
        network_in_mbps REAL,
        network_out_mbps REAL,
        load_1min REAL,
        load_5min REAL,
        load_15min REAL,
        uptime_seconds INTEGER,
        collected_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_remediation_policies_alert_source ON remediation_policies(alert_source);
      CREATE INDEX IF NOT EXISTS idx_remediation_policies_enabled ON remediation_policies(enabled);
      CREATE INDEX IF NOT EXISTS idx_remediation_policies_execution_mode ON remediation_policies(execution_mode);
      CREATE INDEX IF NOT EXISTS idx_remediation_executions_policy ON remediation_executions(policy_id);
      CREATE INDEX IF NOT EXISTS idx_remediation_executions_alert ON remediation_executions(alert_id);
      CREATE INDEX IF NOT EXISTS idx_remediation_executions_status ON remediation_executions(status);
      CREATE INDEX IF NOT EXISTS idx_remediation_executions_created ON remediation_executions(created_at);
      CREATE INDEX IF NOT EXISTS idx_remediation_history_policy ON remediation_history(policy_id);
      CREATE INDEX IF NOT EXISTS idx_remediation_history_status ON remediation_history(execution_status);
      CREATE INDEX IF NOT EXISTS idx_server_metrics_server ON server_metrics(server_id);
      CREATE INDEX IF NOT EXISTS idx_server_metrics_collected ON server_metrics(collected_at);
      CREATE INDEX IF NOT EXISTS idx_remediation_cooldowns_until ON remediation_cooldowns(cooldown_until);
    `);

    logger.info('✅ Remediation tables created successfully');
  } catch (e: unknown) {
    logger.info('⚠️ Remediation tables may already exist, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function migrateRemediationExecutionsCascade() {
  try {
    logger.info('🔄 Adding ON DELETE CASCADE to remediation_executions.alert_id foreign key...');

    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='remediation_executions'").get() as { sql: string } | undefined;
    
    if (!tableInfo) {
      logger.info('ℹ️ remediation_executions table does not exist, skipping cascade migration');
      return;
    }

    const hasCascade = tableInfo.sql.includes('FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE');
    
    if (hasCascade) {
      logger.info('ℹ️ remediation_executions already has ON DELETE CASCADE on alert_id');
      return;
    }

    logger.info('🔄 Rebuilding remediation_executions table to add ON DELETE CASCADE...');

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare('ALTER TABLE remediation_executions RENAME TO remediation_executions_old').run();

      db.exec(`
        CREATE TABLE remediation_executions (
          id TEXT PRIMARY KEY,
          policy_id TEXT NOT NULL,
          alert_id TEXT NOT NULL,
          alert_snapshot TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          status_reason TEXT,
          approval_required BOOLEAN DEFAULT 0,
          approved_by TEXT,
          approved_at DATETIME,
          approval_comment TEXT,
          workflow_execution_id TEXT,
          started_at DATETIME,
          completed_at DATETIME,
          execution_result TEXT,
          verification_status TEXT,
          verification_result TEXT,
          verification_completed_at DATETIME,
          rollback_triggered BOOLEAN DEFAULT 0,
          rollback_execution_id TEXT,
          rollback_completed_at DATETIME,
          rollback_result TEXT,
          execution_duration_ms INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (policy_id) REFERENCES remediation_policies(id),
          FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
        );
      `);

      db.exec(`
        INSERT INTO remediation_executions 
        SELECT * FROM remediation_executions_old;
      `);

      db.prepare('DROP TABLE remediation_executions_old').run();

      db.prepare('CREATE INDEX IF NOT EXISTS idx_remediation_executions_policy ON remediation_executions(policy_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_remediation_executions_alert ON remediation_executions(alert_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_remediation_executions_status ON remediation_executions(status)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_remediation_executions_created ON remediation_executions(created_at)').run();

      db.prepare('COMMIT').run();

      logger.info('✅ remediation_executions table rebuilt with ON DELETE CASCADE on alert_id');
    } catch (migrationError) {
      db.prepare('ROLLBACK').run();
      logger.error('❌ Failed to rebuild remediation_executions table:', migrationError);
      throw migrationError;
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('no such table')) {
      logger.info('ℹ️ remediation_executions table does not exist, skipping cascade migration');
    } else {
      logger.error('❌ Failed to add ON DELETE CASCADE to remediation_executions:', e instanceof Error ? e.message : String(e));
      throw e;
    }
  }
}

function migrateAlertSourceTracking() {
  try {
    logger.info('🔄 Creating alert webhook logs table...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS alert_webhook_logs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        alert_count INTEGER DEFAULT 0,
        resolved_count INTEGER DEFAULT 0,
        error_message TEXT,
        request_body TEXT,
        ip_address TEXT,
        user_agent TEXT,
        processing_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON alert_webhook_logs(source);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON alert_webhook_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON alert_webhook_logs(status);

      CREATE INDEX IF NOT EXISTS idx_alerts_source ON alerts(source);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
    `);

    logger.info('✅ Alert webhook logs table created');
  } catch (e: unknown) {
    logger.info('⚠️ Alert webhook logs may already exist, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function createAlertNoiseReductionTable() {
  try {
    logger.info('🔄 Creating alert_noise_reduction table...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS alert_noise_reduction (
        id TEXT PRIMARY KEY,
        alert_fingerprint TEXT NOT NULL UNIQUE,
        alert_source TEXT NOT NULL,
        alert_title TEXT NOT NULL,
        occurrence_count INTEGER DEFAULT 1,
        first_occurrence DATETIME NOT NULL,
        last_occurrence DATETIME NOT NULL,
        is_suppressed INTEGER DEFAULT 0,
        suppression_reason TEXT,
        suppression_until DATETIME
      );

      CREATE INDEX IF NOT EXISTS idx_noise_reduction_fingerprint ON alert_noise_reduction(alert_fingerprint);
      CREATE INDEX IF NOT EXISTS idx_noise_reduction_suppressed ON alert_noise_reduction(is_suppressed);
      CREATE INDEX IF NOT EXISTS idx_noise_reduction_last_occurrence ON alert_noise_reduction(last_occurrence);
    `);

    logger.info('✅ Alert noise reduction table created');
  } catch (e: unknown) {
    logger.info('⚠️ Alert noise reduction table may already exist, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function migrateAlertFingerprint() {
  try {
    const columns = db.prepare("PRAGMA table_info(alerts)").all() as Array<{ name: string }>;
    const hasFingerprintColumn = columns.some(col => col.name === 'alert_fingerprint');
    
    if (!hasFingerprintColumn) {
      logger.info('🔄 Adding alert_fingerprint column to alerts table');
      db.prepare('ALTER TABLE alerts ADD COLUMN alert_fingerprint TEXT').run();
      logger.info('✅ alert_fingerprint column added to alerts table');
    }
    
    logger.info('🔄 Creating alert_fingerprint unique index on alerts table');
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_fingerprint_unique ON alerts(alert_fingerprint) WHERE alert_fingerprint IS NOT NULL').run();
    logger.info('✅ Alert fingerprint unique index created');
  } catch (e: unknown) {
    logger.info('⚠️ Alert fingerprint migration may have already run, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function addMissingIndexes() {
  try {
    logger.info('🔄 Adding missing database indexes for performance optimization...');

    db.exec(`
      -- 告警表高频查询索引
      -- 按状态和创建时间查询（告警列表最常用）
      CREATE INDEX IF NOT EXISTS idx_alerts_status_created ON alerts(status, created_at DESC);
      
      -- 按严重程度查询（严重告警过滤）
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      
      -- 按来源查询（Zabbix、Prometheus等来源过滤）
      CREATE INDEX IF NOT EXISTS idx_alerts_source_created ON alerts(source, created_at DESC);
      
      -- 按标题搜索（全文搜索辅助索引）
      CREATE INDEX IF NOT EXISTS idx_alerts_title ON alerts(title);
      
      -- 关联任务索引
      CREATE INDEX IF NOT EXISTS idx_alerts_task ON alerts(related_task_id);

      -- 任务表查询索引
      -- 按工作流和状态查询
      CREATE INDEX IF NOT EXISTS idx_tasks_workflow_status ON tasks(workflow_id, status);
      
      -- 按状态和创建时间查询（任务列表）
      CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at DESC);
      
      -- 按报告ID查询
      CREATE INDEX IF NOT EXISTS idx_tasks_report ON tasks(report_id);

      -- 工作流表查询索引
      -- 按模板状态排序
      CREATE INDEX IF NOT EXISTS idx_workflows_template_created ON workflows(is_template DESC, created_at DESC);
      
      -- 按名称搜索
      CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);

      -- 用户表查询索引
      -- 按角色查询
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      
      -- 按用户名唯一索引
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username);
      
      -- 按邮箱唯一索引
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);

      -- 服务器表查询索引
      -- 按启用状态查询
      CREATE INDEX IF NOT EXISTS idx_servers_enabled ON servers(enabled);
      
      -- 按云提供商和实例ID
      CREATE INDEX IF NOT EXISTS idx_servers_cloud_instance ON servers(cloud_provider, cloud_instance_id);
      
      -- 按名称排序
      CREATE INDEX IF NOT EXISTS idx_servers_name ON servers(name);
      
      -- IP地址唯一索引
      CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_ip_unique ON servers(ip_address) WHERE ip_address IS NOT NULL;

      -- Agent执行记录查询索引
      -- 按Agent和创建时间排序（历史执行记录）
      CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_created ON agent_executions(agent_id, created_at DESC);
      
      -- 按状态查询
      CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);

      -- 脚本表查询索引
      -- 按分类查询
      CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category);
      
      -- 按名称搜索
      CREATE INDEX IF NOT EXISTS idx_scripts_name ON scripts(name);

      -- 通知表查询索引
      -- 按状态和创建时间
      CREATE INDEX IF NOT EXISTS idx_notifications_status_created ON notifications(status, created_at DESC);
      
      -- 按类型查询
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

      -- 补救执行记录查询索引
      -- 按策略和状态查询
      CREATE INDEX IF NOT EXISTS idx_remediation_exec_policy_status ON remediation_executions(policy_id, status);
      
      -- 按告警ID查询
      CREATE INDEX IF NOT EXISTS idx_remediation_exec_alert ON remediation_executions(alert_id);
      
      -- 按工作流执行ID查询
      CREATE INDEX IF NOT EXISTS idx_remediation_exec_workflow ON remediation_executions(workflow_execution_id);

      -- 服务器指标表查询索引
      -- 按服务器和收集时间
      CREATE INDEX IF NOT EXISTS idx_server_metrics_server_collected ON server_metrics(server_id, collected_at DESC);

      -- Webhook日志查询索引
      -- 按来源和时间
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_source_created ON alert_webhook_logs(source, created_at DESC);

      -- 补救历史查询索引
      -- 按策略和状态
      CREATE INDEX IF NOT EXISTS idx_remediation_history_policy_status ON remediation_history(policy_id, execution_status);
    `);

    logger.info('✅ Database indexes created successfully');
  } catch (e: unknown) {
    logger.info('⚠️ Index creation may have partial failures, continuing:', e instanceof Error ? e.message : String(e));
  }
}

function migrateUserPasswordMustChange() {
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const hasColumn = columns.some(col => col.name === 'password_must_change');
    if (!hasColumn) {
      logger.info('🔄 Adding password_must_change column to users table');
      db.prepare('ALTER TABLE users ADD COLUMN password_must_change INTEGER DEFAULT 0').run();
      logger.info('✅ password_must_change column added to users table');
    }
  } catch (e: unknown) {
    logger.info('⚠️ password_must_change column migration may have already run:', e instanceof Error ? e.message : String(e));
  }
}

function migrateScheduledTasksLastStatus() {
  try {
    const columns = db.prepare("PRAGMA table_info(scheduled_tasks)").all() as Array<{ name: string }>;
    const hasColumn = columns.some(col => col.name === 'last_status');
    if (!hasColumn) {
      logger.info('🔄 Adding last_status column to scheduled_tasks table');
      db.prepare("ALTER TABLE scheduled_tasks ADD COLUMN last_status TEXT DEFAULT 'unknown'").run();
      logger.info('✅ last_status column added to scheduled_tasks table');
    }
  } catch (e: unknown) {
    logger.info('⚠️ scheduled_tasks last_status column migration may have already run:', e instanceof Error ? e.message : String(e));
  }
}

function migrateReportTables() {
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = new Set(tables.map(t => t.name));

    const hasOldReportTemplates = tableNames.has('report_templates');
    const hasOldGeneratedReports = tableNames.has('generated_reports');
    const hasOldScheduledReports = tableNames.has('scheduled_reports');
    const hasNewReportsTable = tableNames.has('reports');
    const hasNewReportSchedulesTable = tableNames.has('report_schedules');

    if (!hasOldReportTemplates && !hasOldGeneratedReports && !hasOldScheduledReports) {
      logger.info('ℹ️ No old report tables found, skipping migration');
      return;
    }

    logger.info('🔄 Migrating report tables...');

    db.prepare('BEGIN TRANSACTION').run();

    try {
      if (!hasNewReportsTable) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'generated',
            content TEXT,
            format TEXT DEFAULT 'markdown',
            template_id TEXT,
            task_id TEXT,
            variables TEXT,
            metadata TEXT,
            is_preset INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
          CREATE INDEX IF NOT EXISTS idx_reports_task_id ON reports(task_id);
          CREATE INDEX IF NOT EXISTS idx_reports_template_id ON reports(template_id);
          CREATE INDEX IF NOT EXISTS idx_reports_is_preset ON reports(is_preset);
          CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
        `);
      }

      if (!hasNewReportSchedulesTable) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS report_schedules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            template_id TEXT NOT NULL,
            cron_expression TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            recipients TEXT,
            format TEXT DEFAULT 'markdown',
            last_generated DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES reports(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled ON report_schedules(enabled);
          CREATE INDEX IF NOT EXISTS idx_report_schedules_template ON report_schedules(template_id);
        `);
      }

      const existingTemplates = new Set<string>();
      if (hasOldReportTemplates) {
        const templates = db.prepare('SELECT id FROM reports WHERE type = \'template\'').all() as Array<{ id: string }>;
        templates.forEach(t => existingTemplates.add(t.id));
      }

      if (hasOldReportTemplates) {
        logger.info('🔄 Migrating report_templates -> reports (type=template)...');
        db.exec(`
          INSERT OR IGNORE INTO reports (id, name, type, content, variables, is_preset, created_at, updated_at)
          SELECT id, name, 'template', content, variables, is_preset, created_at, updated_at
          FROM report_templates
          WHERE id NOT IN (SELECT id FROM reports WHERE type = 'template')
        `);
      }

      if (hasOldGeneratedReports) {
        logger.info('🔄 Migrating generated_reports -> reports (type=generated)...');
        db.exec(`
          INSERT OR IGNORE INTO reports (id, name, type, content, format, metadata, created_at)
          SELECT id, name, 'generated', content, format, metadata, created_at
          FROM generated_reports
          WHERE id NOT IN (SELECT id FROM reports WHERE type = 'generated')
        `);
      }

      const existingOldReports = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'").all() as Array<{ name: string }>;
      if (existingOldReports.length > 0) {
        const oldReportColumns = db.prepare("PRAGMA table_info(reports)").all() as Array<{ name: string }>;
        const hasTypeColumn = oldReportColumns.some(col => col.name === 'type');
        
        if (!hasTypeColumn) {
          const tempTableName = 'reports_old';
          db.prepare(`ALTER TABLE reports RENAME TO ${tempTableName}`).run();
          
          db.exec(`
            CREATE TABLE reports (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL DEFAULT 'generated',
              content TEXT,
              format TEXT DEFAULT 'markdown',
              template_id TEXT,
              task_id TEXT,
              variables TEXT,
              metadata TEXT,
              is_preset INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
          `);

          db.exec(`
            INSERT INTO reports (id, name, type, content, format, task_id, created_at)
            SELECT id, name, 'workflow', content, format, task_id, created_at
            FROM ${tempTableName}
          `);

          try {
            db.prepare(`DROP TABLE ${tempTableName}`).run();
          } catch {
            logger.info('⚠️ Could not drop old reports temp table');
          }
        }
      }

      if (hasOldScheduledReports) {
        logger.info('🔄 Migrating scheduled_reports -> report_schedules...');
        db.exec(`
          INSERT OR IGNORE INTO report_schedules (id, name, template_id, cron_expression, enabled, recipients, format, last_generated, created_at, updated_at)
          SELECT id, name, template_id, cron_expression, enabled, recipients, format, last_generated, created_at, updated_at
          FROM scheduled_reports
          WHERE id NOT IN (SELECT id FROM report_schedules)
        `);
      }

      db.prepare('COMMIT').run();
      logger.info('✅ Report tables migration completed successfully');
    } catch (migrationError) {
      db.prepare('ROLLBACK').run();
      throw migrationError;
    }
  } catch (e: unknown) {
    logger.error('❌ Report tables migration failed, aborting:', e instanceof Error ? e.message : String(e));
    throw e;
  }
}

function checkProductionWebhookSecurity() {
  const isProduction = env.NODE_ENV === 'production';
  
  if (isProduction && !env.WEBHOOK_VERIFY_ENABLED) {
    logger.warn(
      '⚠️ SECURITY WARNING: Webhook signature verification is DISABLED in production mode! ' +
      'Set WEBHOOK_VERIFY_ENABLED=true and WEBHOOK_SECRET=<strong-secret> in your environment variables. ' +
      'Without signature verification, anyone can send forged alerts to your system.'
    );
  }
}

function migrateWindowsVncColumns() {
  try {
    const columns = db.prepare("PRAGMA table_info(servers)").all() as Array<{ name: string; type: string }>;
    const existingColumns = new Set(columns.map(col => col.name));
    
    const newColumns = [
      { name: 'os_type', type: 'TEXT DEFAULT \'linux\'' },
      { name: 'vnc_port', type: 'INTEGER DEFAULT 5900' },
      { name: 'vnc_password', type: 'TEXT' }
    ];
    
    for (const col of newColumns) {
      if (!existingColumns.has(col.name)) {
        logger.info(`🔄 Adding column: ${col.name} to servers table`);
        try {
          db.prepare(`ALTER TABLE servers ADD COLUMN ${col.name} ${col.type}`).run();
        } catch {
          logger.info(`ℹ️ Column ${col.name} may already exist, skipping`);
        }
      }
    }
    logger.info('✅ Windows VNC columns migration complete');
  } catch (e: unknown) {
    logger.info('⚠️ Windows VNC migration may have already run, continuing:', e instanceof Error ? e.message : String(e));
  }
}
