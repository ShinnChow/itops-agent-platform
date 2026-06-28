"""
Fix import paths after module restructuring.
Targeted replacements for files that moved deeper in the tree.
"""
from pathlib import Path

SRC = Path(r'F:\自开发代码\多Agent运维平台\ITops agent\daima\backend\src')

def fix_module_file(file_path):
    """Fix a file that was moved into modules/ structure."""
    rel = file_path.relative_to(SRC)
    parts = list(rel.parent.parts)
    
    # Only fix files in modules/
    if not parts or parts[0] != 'modules':
        return 0
    
    # Calculate depth from src/ 
    # modules/domain/routes/file.ts -> depth 3 -> need 3 '../' to reach src/
    # modules/domain/services/file.ts -> depth 3
    # modules/domain/services/sub/file.ts -> depth 4
    depth = len(parts)
    
    content = file_path.read_text('utf-8', errors='ignore')
    original = content
    
    changes = 0
    
    # Special patterns for shared modules (from any module/* location)
    # These were at src/{models,utils,middleware,websocket,data,constants,schemas}/
    # Now they're accessed by going up to src/ first
    # Files were moved from depth 1/2 to depth 3/4 - add 2 extra ../ levels
    shared_targets = ['models/', 'utils/', 'data/', 'constants/', 'schemas/']
    
    # Files that were at routes/ or services/ (depth 1): '../' -> depth+2 '../'
    # Files that were at services/subdir/ (depth 2): '../../' -> depth+2 '../../'
    for prefix_level in [1, 2]:  # old prefix has this many '../'
        old_prefix = '../' * prefix_level
        new_prefix = '../' * (depth - prefix_level + (1 if prefix_level==1 else 0))
        # Actually: from old depth prefix_level, need prefix_level+2 to reach src/
        # New depth: depth. Extra: depth - prefix_level
        # So old_path = '../'*prefix_level + target
        # new_path = '../'*(prefix_level + (depth - 1)) + target
        # Wait, let me think again
        
        # Old location was at depth `old_depth` (1 for routes/, 2 for services/edge/)
        # from old location: '../'*prefix_level + target -> reaches src/
        # So old_depth_in_src + prefix_level + ... = reaches src/
        # old_depth + prefix_level = how many .. to reach src
        # Actually: old location depth + prefix_level = up count needed to reach src
        # For routes/ (depth 1): 1 + 1 = 2 to reach src/ (/.. goes to root of src/)
        # Wait no: from src/routes/, ../ goes to src/ = 1 level up. So depth 1 file, 1 ../ = src/
        # For routes/: depth=1, prefix_level=1 reaches src/
        # For services/edge/: depth=2, prefix_level=2 reaches src/
        
        # New location depth = depth_variable
        # Need: depth + target_up = reaches src/
        # target_up = depth (because ../ * depth from file depth goes to src/)
        # wait: from modules/domain/routes/ (depth 3, src -> modules -> domain -> routes)
        # ../../../ reaches src/ = depth same as depth count
        
        # Actually the simpler formula:
        # old_up = level_count of old import prefix (e.g., 1 for '../', 2 for '../../')
        # file_old_depth = 1 for routes/services, 2 for services/subdir/
        # Actual up from root: file_old_depth + old_up_path_length = ?
        # From src/routes/file.ts, ../ = up 1 -> src/
        # So src/routes/file.ts has depth 1 in parts, '../' = up 1 -> src/ 
        # So path = '../' * 1 + target -> src
        # Now from src/modules/domain/routes/file.ts, depth = 3 in parts
        # Need '../' * 3 + target -> src
        # So new_up = depth
        # The transformation: old_up_count=1 -> new_up=3 = file_new_depth
        
        # For services/edge/: depth=2 in old, '../../' = up 2 -> src/
        # Now: modules/ai/services/edge/: depth=4 in new_parts
        # '../../../../' = up 4 -> src/
        # old_up=2 -> new_up=4 = file_new_depth
        
        # So the pattern is: OLD '../'*N becomes NEW '../'*new_depth
        # where new_depth = len(parts)  (file's new depth from src/)
        
        # But we want to replace specific old patterns. 
        # Old path: '../'*old_up + target
        # New path: '../'*new_depth + target
        # So we replace the prefix.
        
        for target in shared_targets:
            old_path = f"from '{'../'*prefix_level}{target}"
            if old_path in content:
                new_path = f"from '{'../'*depth}{target}"
                content = content.replace(old_path, new_path)
                changes += 1
    
    # Middleware and websocket: old paths could be '../middleware/' or '../../middleware/'
    mw_targets = ['middleware/', 'websocket/']
    for mw_target in mw_targets:
        for prefix_level in [1, 2, 3]:
            old_path = f"from '{'../'*prefix_level}{mw_target}"
            if old_path in content:
                new_path = f"from '{'../'*depth}shared/{mw_target}"
                content = content.replace(old_path, new_path)
                changes += 1
    
    # Fix ../routes/ for cross-module route references
    # Files in modules/DOMAIN/services/ that reference ../routes/XXX
    # - Old: '../routes/XXX' from src/services/ -> src/routes/XXX
    # - New: need '../../DOMAIN/routes/XXX' from src/modules/DOMAIN/services/
    # But cross-module route references are rare. Let's check.
    
    # Fix cross-module service references
    # When a file in modules/DOMAIN1/services/ imports './XXXService' 
    # that's now in modules/DOMAIN2/services/
    
    if depth >= 2:
        domain = parts[1]  # e.g., 'ai'
        subdir = parts[2] if len(parts) > 2 else ''  # 'routes' or 'services'
        
        # Known cross-module service references
        # (service_name, target_domain)
        cross_services = [
            ('sshService', 'servers'),
            ('serverInfoCollector', 'servers'),
            ('dockerService', 'containers'),
            ('multiHostDockerService', 'containers'),
            ('docker', 'containers'),
            ('credentialService', 'auth'),
            ('tokenBlacklist', 'auth'),
            ('llmService', 'ai'),
            ('agentExecutor', 'ai'),
            ('notificationService', 'infra'),
            ('workflowExecutor', 'workflow'),
            ('queueService', 'workflow'),
            ('alertService', 'alerts'),
            ('schedulerService', 'workflow'),
            ('topologyService', 'network'),
            ('snmpService', 'network'),
            ('snmpPollingService', 'network'),
            ('networkDeviceService', 'network'),
            ('networkDiscoveryService', 'network'),
            ('networkResultParser', 'network'),
            ('remediationService', 'auto'),
            ('autoScaleService', 'auto'),
            ('backupService', 'infra'),
            ('composeService', 'infra'),
            ('configTemplateService', 'infra'),
            ('registryService', 'containers'),
            ('kubernetesService', 'kubernetes'),
            ('vmMigrationService', 'containers'),
            ('vmSnapshotSchedulerService', 'containers'),
            ('healthService', 'monitor'),
            ('selfMonitorService', 'monitor'),
            ('costAnalysisService', 'monitor'),
            ('reportService', 'infra'),
            ('vncProxyService', 'network'),
            ('restartService', 'infra'),
            ('auditService', 'infra'),
            ('dbskiterService', 'database'),
            ('configParser', 'infra'),
            ('configRepairService', 'infra'),
            ('configBackupService', 'infra'),
        ]
        
        for svc_name, target_domain in cross_services:
            if target_domain == domain:
                continue  # Same domain, path should work
            
            # Pattern: from './{svc_name}' or from "./{svc_name}"
            # or from '../{svc_name}'
            patterns = [
                (f"from './{svc_name}'", f"from '../../{target_domain}/services/{svc_name}'"),
                (f'from "./{svc_name}"', f'from "../../{target_domain}/services/{svc_name}"'),
            ]
            
            for old, new in patterns:
                if old in content:
                    content = content.replace(old, new)
                    changes += 1

    # Fix dc routes/schemas imports (they stayed in routes/dc/)
    # Files in modules/ that reference routes/dc/ need adjustment
    if depth >= 3:
        for pattern_type in ["from '../routes/dc", "from \"../routes/dc"]:
            old_quote = "'" if "'" in pattern_type else '"'
            old = f"from {old_quote}../routes/dc"
            new = f"from {old_quote}{'../'*depth}routes/dc"
            if old in content:
                content = content.replace(old, new)
                changes += 1
    
    # Also fix imports that reference schemas/prompts at the same relative depth
    # schemas/* → shared/schemas/* (for files in modules/)
    # This was handled by the mapping but imports may still point to old path
    
    if content != original:
        file_path.write_text(content, 'utf-8')
    
    return changes


def main():
    ts_files = sorted(SRC.rglob('*.ts'))
    ts_files = [f for f in ts_files if 'node_modules' not in str(f)]
    
    total_changes = 0
    fixed_files = 0
    
    for f in ts_files:
        try:
            changes = fix_module_file(f)
            if changes > 0:
                total_changes += changes
                fixed_files += 1
                print(f"  [{changes:3d}] {f.relative_to(SRC)}")
        except Exception as e:
            print(f"  ERROR: {f.relative_to(SRC)}: {e}")
    
    # Also: utils/, middleware/, websocket/ files at src/ level still exist
    # and don't need changing - only files inside modules/ need fixing
    
    print(f'\n=== 总结 ===')
    print(f'Fixed {total_changes} imports in {fixed_files} files')


if __name__ == '__main__':
    main()
