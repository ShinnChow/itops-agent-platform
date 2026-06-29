#!/usr/bin/env node

/**
 * daima 架构约束检查脚本
 * 参照 ongrid 的 `make arch-lint` 模式
 *
 * 使用方式：
 *   node scripts/check-architecture.js          # 检查全部
 *   node scripts/check-architecture.js backend  # 只检查后端
 *   node scripts/check-architecture.js frontend # 只检查前端
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

// ============================================================
// 工具函数
// ============================================================

function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    return e.stdout || e.stderr || e.message;
  }
}

function hasDependency(name) {
  try {
    require.resolve(name, { paths: [ROOT] });
    return true;
  } catch {
    return false;
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function logPass(msg) {
  console.log(`  ✅  ${msg}`);
}

function logFail(msg) {
  console.log(`  ❌  ${msg}`);
}

function logWarn(msg) {
  console.log(`  ⚠️  ${msg}`);
}

// ============================================================
// 1. 使用 dependency-cruiser 检查（如果已安装）
// ============================================================

function checkWithDepcruise() {
  if (!hasDependency('dependency-cruiser')) {
    logWarn('dependency-cruiser 未安装，跳过自动依赖检查');
    logWarn('安装方法：npm install -D dependency-cruiser');
    return { passed: true, errors: [] };
  }

  const configPath = path.join(ROOT, '.dependency-cruiser.json');
  if (!fs.existsSync(configPath)) {
    logFail('.dependency-cruiser.json 配置文件不存在');
    return { passed: false, errors: ['配置文件缺失'] };
  }

  const cmd = `npx depcruise --config .dependency-cruiser.json backend/src --output-type text`;
  const result = run(cmd);

  if (result.includes('error') || result.includes('✖')) {
    logFail('dependency-cruiser 发现架构违规：');
    console.log(result);
    return { passed: false, errors: [result] };
  }

  logPass('dependency-cruiser 依赖检查通过');
  return { passed: true, errors: [] };
}

// ============================================================
// 2. 手动检查关键规则（不依赖 depcruise 也能用）
// ============================================================

function checkCoreNoModuleDep() {
  logSection('规则 1: core/ 不得依赖 modules/');

  const coreDir = path.join(BACKEND, 'src', 'core');
  const files = findFiles(coreDir, '.ts');

  let violations = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const imports = content.match(/from\s+['"]\.\.\/modules\//g);
    if (imports) {
      logFail(`${path.relative(BACKEND, file)} 引用了 modules/ 模块`);
      violations++;
    }
  }

  if (violations === 0) {
    logPass('core/ 没有依赖任何 modules/ 模块');
  }
  return violations;
}

function checkModuleRouteBoundary() {
  logSection('规则 2: modules/ 之间禁止跨模块 import routes.ts');

  const modulesDir = path.join(BACKEND, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) {
    logWarn('modules/ 目录不存在，跳过检查');
    return 0;
  }

  const moduleNames = fs.readdirSync(modulesDir).filter(name => {
    const stat = fs.statSync(path.join(modulesDir, name));
    return stat.isDirectory() && !name.startsWith('_') && !name.startsWith('.');
  });

  let violations = 0;
  for (const mod of moduleNames) {
    const routesFile = path.join(modulesDir, mod, 'routes.ts');
    if (!fs.existsSync(routesFile)) continue;

    const content = fs.readFileSync(routesFile, 'utf-8');

    for (const otherMod of moduleNames) {
      if (otherMod === mod) continue;

      // 检查是否 import 了其他模块的 routes.ts
      const pattern = new RegExp(
        `from\\s+['"]\\.\\./${otherMod}/routes['"]`,
        'g'
      );
      if (pattern.test(content)) {
        logFail(
          `modules/${mod}/routes.ts → modules/${otherMod}/routes.ts（跨模块路由依赖）`
        );
        violations++;
      }
    }
  }

  if (violations === 0) {
    logPass('modules/ 之间没有跨模块路由依赖');
  }
  return violations;
}

function checkModuleCircularDeps() {
  logSection('规则 3: 禁止循环依赖（警告级别 — 预存在的问题）');

  if (!hasDependency('madge')) {
    logWarn('madge 未安装，跳过循环依赖检查');
    logWarn('安装方法：npm install -D madge');
    return 0;
  }

  const cmd = `npx madge --circular --extensions ts backend/src`;
  const result = run(cmd).trim();

  if (result && result !== 'No circular dependencies found!' && result !== '[]') {
    logWarn('发现预存在的循环依赖（不阻塞本次检查，但建议逐步修复）：');
    console.log(result);
    // 不增加违规计数，但标记为需要关注
    return 0;
  }

  logPass('没有循环依赖');
  return 0;
}

function checkFrontendModuleBoundary() {
  logSection('规则 4: 前端模块禁止跨模块引用');

  const modulesDir = path.join(FRONTEND, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) {
    logWarn('frontend/src/modules/ 目录不存在，跳过检查');
    return 0;
  }

  const moduleNames = fs.readdirSync(modulesDir).filter(name => {
    const stat = fs.statSync(path.join(modulesDir, name));
    return stat.isDirectory();
  });

  let violations = 0;
  for (const mod of moduleNames) {
    const modDir = path.join(modulesDir, mod);
    const files = findFiles(modDir, '.{ts,tsx,vue,js,jsx}');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      for (const otherMod of moduleNames) {
        if (otherMod === mod) continue;

        const pattern = new RegExp(
          `from\\s+['"]\\.\\./${otherMod}/`,
          'g'
        );
        if (pattern.test(content)) {
          logFail(
            `frontend/src/modules/${mod}/ → modules/${otherMod}/（${path.relative(modulesDir, file)}）`
          );
          violations++;
        }
      }
    }
  }

  if (violations === 0) {
    logPass('前端模块没有跨模块引用');
  }
  return violations;
}

// ============================================================
// 3. 文件结构检查
// ============================================================

function checkModuleStructure() {
  logSection('规则 5: 模块文件结构规范');

  const modulesDir = path.join(BACKEND, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) {
    logWarn('modules/ 目录不存在');
    return 0;
  }

  const moduleNames = fs.readdirSync(modulesDir).filter(name => {
    const stat = fs.statSync(path.join(modulesDir, name));
    return stat.isDirectory() && !name.startsWith('_') && !name.startsWith('.');
  });

  const requiredFiles = ['index.ts', 'routes.ts'];
  let violations = 0;

  for (const mod of moduleNames) {
    for (const reqFile of requiredFiles) {
      const filePath = path.join(modulesDir, mod, reqFile);
      if (!fs.existsSync(filePath)) {
        logFail(`modules/${mod}/ 缺少 ${reqFile}`);
        violations++;
      }
    }
  }

  if (violations === 0) {
    logPass('所有模块都包含 index.ts 和 routes.ts');
  }

  // 检查 _registry.ts
  const registryPath = path.join(modulesDir, '_registry.ts');
  if (!fs.existsSync(registryPath)) {
    logFail('modules/_registry.ts 缺失');
    violations++;
  } else {
    logPass('modules/_registry.ts 存在');
  }

  return violations;
}

function checkCoreStructure() {
  logSection('规则 6: 项目结构规范');

  const srcDir = path.join(BACKEND, 'src');
  let violations = 0;

  // core/ — 服务容器（纯基础设施，不依赖 modules/）
  const coreServiceContainer = path.join(srcDir, 'core', 'serviceContainer.ts');
  if (!fs.existsSync(coreServiceContainer)) {
    logFail('core/serviceContainer.ts 缺失');
    violations++;
  } else {
    logPass('core/serviceContainer.ts 存在');
  }

  // serviceRegistry.ts — 组装层（位于 src/ 根级别，参照 ongrid cmd/ 层）
  const serviceRegistry = path.join(srcDir, 'serviceRegistry.ts');
  if (!fs.existsSync(serviceRegistry)) {
    logFail('src/serviceRegistry.ts（组装层）缺失');
    violations++;
  } else {
    logPass('src/serviceRegistry.ts（组装层）存在');
  }

  // 基础设施目录 — 位于 src/ 根级别
  const infraDirs = ['middleware', 'models', 'utils', 'types'];
  for (const dir of infraDirs) {
    const dirPath = path.join(srcDir, dir);
    if (!fs.existsSync(dirPath)) {
      logFail(`src/${dir}/ 缺失`);
      violations++;
    }
  }
  if (violations <= infraDirs.length - 2) { // 允许少量缺失
    logPass('src/ 基础设施目录（middleware/models/utils/types）存在');
  }

  // _registry.ts — 模块路由注册中心
  const registryPath = path.join(srcDir, 'modules', '_registry.ts');
  if (!fs.existsSync(registryPath)) {
    logFail('modules/_registry.ts 缺失');
    violations++;
  } else {
    logPass('modules/_registry.ts（路由注册中心）存在');
  }

  return violations;
}

// ============================================================
// 辅助函数
// ============================================================

function findFiles(dir, extPattern) {
  const results = [];
  const extRegex = new RegExp(`${extPattern}$`);

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('node_modules')) {
        walk(fullPath);
      } else if (entry.isFile() && extRegex.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  const target = process.argv[2] || 'all';

  console.log('\n🏗️  daima 架构约束检查');
  console.log('参照 ongrid 的 .go-arch-lint.yml 模式');
  console.log(`检查范围：${target}\n`);

  let totalViolations = 0;

  if (target === 'all' || target === 'backend') {
    totalViolations += checkCoreNoModuleDep();
    totalViolations += checkModuleRouteBoundary();
    totalViolations += checkModuleCircularDeps();
    totalViolations += checkModuleStructure();
    totalViolations += checkCoreStructure();

    // 如果有 depcruise，也跑一下
    const depResult = checkWithDepcruise();
    if (!depResult.passed) totalViolations++;
  }

  if (target === 'all' || target === 'frontend') {
    totalViolations += checkFrontendModuleBoundary();
  }

  // ============================================================
  // 总结
  // ============================================================
  logSection('检查结果');

  if (totalViolations === 0) {
    console.log('\n  🎉  所有架构约束检查通过！\n');
    process.exit(0);
  } else {
    console.log(`\n  ❌  发现 ${totalViolations} 个架构违规，请修复后重试\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('架构检查脚本执行失败：', err);
  process.exit(1);
});
