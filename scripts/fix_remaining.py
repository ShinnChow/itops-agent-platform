"""
Fix remaining import paths after logger.ts was moved back from shared/utils/ to utils/
"""
import re
from pathlib import Path

SRC = Path(r'F:\自开发代码\多Agent运维平台\ITops agent\daima\backend\src')

# 1. Fix shared/utils/logger -> utils/logger in module files
# Patterns: '../../../shared/utils/logger' > '../../../utils/logger'
#           '../../../../shared/utils/logger' > '../../../../utils/logger'
def fix_module_logger_refs():
    count = 0
    for f in SRC.rglob('*.ts'):
        if 'node_modules' in str(f):
            continue
        content = f.read_text('utf-8', errors='ignore')
        original = content
        content = content.replace("'../../../shared/utils/logger'", "'../../../utils/logger'")
        content = content.replace("'../../../shared/utils/logger.ts'", "'../../../utils/logger'")
        content = content.replace("'../../../../shared/utils/logger'", "'../../../../utils/logger'")
        content = content.replace("'../../../../shared/utils/logger.ts'", "'../../../../utils/logger'")
        content = content.replace("'../../../../../shared/utils/logger'", "'../../../../../utils/logger'")
        content = content.replace("'../../../../../shared/utils/logger.ts'", "'../../../../../utils/logger'")
        if content != original:
            f.write_text(content, 'utf-8')
            count += 1
    print(f"Fixed logger references in {count} files")

# 2. Fix specific cross-module imports
def fix_cross_module_imports():
    fixes = {
        # src/middleware/auth.ts -> tokenBlacklist moved
        'middleware/auth.ts': [
            ("'../services/tokenBlacklist'", "'../modules/auth/services/tokenBlacklist'"),
        ],
        # src/models/database.ts -> aiModelService moved
        'models/database.ts': [
            ("'../services/aiModelService'", "'../modules/ai/services/aiModelService'"),
        ],
        # src/utils/apiConfig.ts -> credentialService moved
        'utils/apiConfig.ts': [
            ("'../services/credentialService'", "'../modules/auth/services/credentialService'"),
        ],
        # multiAgentRoutes.ts -> multiAgent reference
        'modules/ai/routes/multiAgentRoutes.ts': [
            ("'../../../services/multiAgent'", "'../../services/multiAgent'"),
        ],
        # rootCauseAnalysisService.ts -> prompts reference
        'modules/ai/services/rootCauseAnalysisService.ts': [
            ("'../../../prompts/rcaPrompt'", "'../prompts/rcaPrompt'"),
        ],
        # authRoutes.ts -> schemas reference  
        'modules/auth/routes/authRoutes.ts': [
            ("'../../../schemas/apiValidation'", "'../../shared/schemas/apiValidation'"),
        ],
        # serverRoutes.ts -> schemas reference
        'modules/servers/routes/serverRoutes.ts': [
            ("'../../../schemas/apiValidation'", "'../../shared/schemas/apiValidation'"),
        ],
        # virtualMachineRoutes.ts -> vmManagement reference
        'modules/containers/routes/virtualMachineRoutes.ts': [
            ("'../../../services/vmManagement'", "'../../services/vmManagement'"),
        ],
        # vmManagementRoutes.ts -> vmManagement reference
        'modules/containers/routes/vmManagementRoutes.ts': [
            ("'../../../services/vmManagement'", "'../../services/vmManagement'"),
        ],
        # vmMigrationService.ts -> vmManagement reference
        'modules/containers/services/vmMigrationService.ts': [
            ("'../../../services/vmManagement'", "'../../containers/services/vmManagement'"),
        ],
        # vmSnapshotSchedulerService.ts -> vmManagement reference
        'modules/containers/services/vmSnapshotSchedulerService.ts': [
            ("'../../../services/vmManagement'", "'../../containers/services/vmManagement'"),
        ],
        # WorkflowEngine.ts -> providers reference
        'modules/workflow/services/WorkflowEngine.ts': [
            ("'../../../services/providers'", "'../../ai/services/providers'"),
        ],
    }
    
    count = 0
    for rel_path, file_fixes in fixes.items():
        f = SRC / rel_path
        if not f.exists():
            print(f"  SKIP (not found): {rel_path}")
            continue
        content = f.read_text('utf-8', errors='ignore')
        original = content
        for old, new in file_fixes:
            if old in content:
                content = content.replace(old, new)
                count += 1
        if content != original:
            f.write_text(content, 'utf-8')
            print(f"  FIXED: {rel_path}")
    
    print(f"Fixed {count} cross-module imports")

# 3. Fix shared/websocket/handler.ts imports
def fix_websocket_handler():
    f = SRC / 'shared/websocket/handler.ts'
    if not f.exists():
        print("  SKIP: shared/websocket/handler.ts not found")
        return
    content = f.read_text('utf-8', errors='ignore')
    original = content
    
    # handler.ts is at src/shared/websocket/handler.ts
    # Old imports: '../services/xxx' -> resolves to src/shared/services/xxx (WRONG)
    # Need: '../../services/xxx' -> resolves to src/services/xxx... but services/ is now modules/xxx/services/
    # Actually services/ TOKENBlacklist is at modules/auth/services/tokenBlacklist.ts
    # terminalService is at modules/infra/services/terminalService.ts
    # containerMonitorService is at modules/containers/services/containerMonitorService.ts
    # containerLogService is at modules/containers/services/containerLogService.ts
    # env is at utils/env.ts
    # logger is at utils/logger.ts
    # database is at models/database.ts
    # types is at types/ (or types.ts in src/)
    
    fixes = [
        ("'../services/tokenBlacklist'", "'../../modules/auth/services/tokenBlacklist'"),
        ("'../utils/env'", "'../../utils/env'"),
        ("'../utils/logger'", "'../../utils/logger'"),
        ("'../models/database'", "'../../models/database'"),
        ("'../services/terminalService'", "'../../modules/infra/services/terminalService'"),
        ("'../services/containerMonitorService'", "'../../modules/containers/services/containerMonitorService'"),
        ("'../services/containerLogService'", "'../../modules/containers/services/containerLogService'"),
        ("'../types'", "'../../types'"),
    ]
    
    for old, new in fixes:
        if old in content:
            content = content.replace(old, new)
    
    if content != original:
        f.write_text(content, 'utf-8')
        print(f"  FIXED: shared/websocket/handler.ts")
    else:
        print(f"  No changes for shared/websocket/handler.ts")

# 4. Fix remaining routes/backend imports that reference old paths
def fix_remaining():
    """Fix any remaining '../routes/' or '../services/' references in module files."""
    count = 0
    for f in sorted(SRC.rglob('*.ts')):
        if 'node_modules' in str(f):
            continue
        rel = str(f.relative_to(SRC)).replace('\\', '/')
        if not rel.startswith('modules/'):
            continue
        
        content = f.read_text('utf-8', errors='ignore')
        original = content
        
        # Check specific known patterns
        
        # After moving logger back, some files may have 'shared/utils/logger' still
        if "'shared/utils/logger'" in content or '"shared/utils/logger"' in content:
            print(f"  REMAINING shared/utils/logger: {rel}")
        
        if content != original:
            f.write_text(content, 'utf-8')
            count += 1
    
    print(f"Checked {count} files for remaining issues")


if __name__ == '__main__':
    fix_module_logger_refs()
    fix_cross_module_imports()
    fix_websocket_handler()
    fix_remaining()
