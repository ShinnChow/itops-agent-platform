"""
Fix import paths using the migration mapping table.
"""
import re, os
from pathlib import Path

SRC = Path(r'F:\自开发代码\多Agent运维平台\ITops agent\daima\backend\src')

# Load the mapping from reorganize.py
OLD_TO_NEW = {}
# Read the mapping file directly
with open(r'F:\自开发代码\多Agent运维平台\ITops agent\daima\scripts\reorganize.py', 'r', encoding='utf-8') as f:
    content = f.read()
# Extract tuple literals - they use r"..." format
for m in re.finditer(r'\(r"([^"]+)",\s*r"([^"]+)"\)', content):
    old_path = m.group(1).replace('\\', '/')
    new_path = m.group(2).replace('\\', '/')
    OLD_TO_NEW[old_path] = new_path

# Add extra moves
EXTRA_MOVES = [
    'routes/changeRoutes.ts', 'modules/infra/routes/changeRoutes.ts',
    'routes/linkageRoutes.ts', 'modules/infra/routes/linkageRoutes.ts',
    'services/vncProxyService.ts', 'modules/network/services/vncProxyService.ts',
    'services/restartService.ts', 'modules/infra/services/restartService.ts',
    'services/registryService.ts', 'modules/containers/services/registryService.ts',
    'services/alertAutoResponse/alertAutoResponseService.ts', 'modules/alerts/services/alertAutoResponse/alertAutoResponseService.ts',
    'services/alertAutoResponse/probeUnit.ts', 'modules/alerts/services/alertAutoResponse/probeUnit.ts',
    'services/alertAutoResponse/types.ts', 'modules/alerts/services/alertAutoResponse/types.ts',
    'services/alertAutoResponse/adaptive/adaptiveAutomation.ts', 'modules/alerts/services/alertAutoResponse/adaptive/adaptiveAutomation.ts',
    'services/alertAutoResponse/adaptive/baselineAnomalyDetector.ts', 'modules/alerts/services/alertAutoResponse/adaptive/baselineAnomalyDetector.ts',
    'services/alertAutoResponse/adaptive/deviceProfiler.ts', 'modules/alerts/services/alertAutoResponse/adaptive/deviceProfiler.ts',
    'services/alertAutoResponse/adaptive/escalationEngine.ts', 'modules/alerts/services/alertAutoResponse/adaptive/escalationEngine.ts',
    'services/alertAutoResponse/adaptive/knowledgeFeedbackLoop.ts', 'modules/alerts/services/alertAutoResponse/adaptive/knowledgeFeedbackLoop.ts',
    'services/alertAutoResponse/adaptive/riskAssessor.ts', 'modules/alerts/services/alertAutoResponse/adaptive/riskAssessor.ts',
    'services/alertAutoResponse/adaptive/strategyRecommender.ts', 'modules/alerts/services/alertAutoResponse/adaptive/strategyRecommender.ts',
    'services/alertAutoResponse/diagnosis/probeExecutor.ts', 'modules/alerts/services/alertAutoResponse/diagnosis/probeExecutor.ts',
    'services/alertAutoResponse/diagnosis/snmpDiagnosisEngine.ts', 'modules/alerts/services/alertAutoResponse/diagnosis/snmpDiagnosisEngine.ts',
    'services/alertAutoResponse/diagnosis/sshDiagnosisEngine.ts', 'modules/alerts/services/alertAutoResponse/diagnosis/sshDiagnosisEngine.ts',
    'services/alertAutoResponse/notification/smartNotifier.ts', 'modules/alerts/services/alertAutoResponse/notification/smartNotifier.ts',
    'services/alertAutoResponse/remediation/remediationExecutor.ts', 'modules/alerts/services/alertAutoResponse/remediation/remediationExecutor.ts',
    'services/alertAutoResponse/remediation/verificationGates.ts', 'modules/alerts/services/alertAutoResponse/remediation/verificationGates.ts',
    'services/alertAutoResponse/scheduler/resourceAwareScheduler.ts', 'modules/alerts/services/alertAutoResponse/scheduler/resourceAwareScheduler.ts',
]
for i in range(0, len(EXTRA_MOVES), 2):
    OLD_TO_NEW[EXTRA_MOVES[i]] = EXTRA_MOVES[i+1]

# Build reverse mapping: new path -> old path
NEW_TO_OLD = {v: k for k, v in OLD_TO_NEW.items()}

# Directory-level mappings (for imports that reference directories, not specific files)
DIR_MAPPINGS = {
    'services/providers/': 'modules/ai/services/providers/',
    'services/multiAgent/': 'modules/ai/services/multiAgent/',
    'services/edge/': 'modules/ai/services/edge/',
    'services/workflow/': 'modules/workflow/services/',
    'services/vmManagement/': 'modules/containers/services/vmManagement/',
    'services/alertAutoResponse/': 'modules/alerts/services/alertAutoResponse/',
    'middleware/': 'shared/middleware/',
    'websocket/': 'shared/websocket/',
    'schemas/': 'shared/schemas/',
    'prompts/': 'modules/ai/prompts/',
}
OLD_TO_NEW.update(DIR_MAPPINGS)
for k, v in DIR_MAPPINGS.items():
    NEW_TO_OLD[v] = k

print(f'Loaded {len(OLD_TO_NEW)} mapping entries ({len(NEW_TO_OLD)} reverse)')

def resolve_import(from_file_rel, import_path):
    """
    Resolve an import path relative to a file.
    from_file_rel: path relative to src/ (e.g., 'modules/ai/routes/agentRoutes.ts')
    import_path: relative import (e.g., '../models/database')
    Returns: the resolved path relative to src/ (e.g., 'models/database')
    """
    from_dir = os.path.dirname(from_file_rel) if '/' in from_file_rel else ''
    parts = import_path.split('/')
    dir_parts = from_dir.split('/') if from_dir else []
    
    for p in parts:
        if p == '..':
            if dir_parts:
                dir_parts.pop()
        elif p == '.':
            continue
        else:
            dir_parts.append(p)
    
    return '/'.join(dir_parts)

def get_old_location(new_rel):
    """Given a file's new path, determine its old path before the move."""
    if new_rel in NEW_TO_OLD:
        return NEW_TO_OLD[new_rel]
    return None

def lookup_new_location(old_target):
    """Look up where an old target path moved to."""
    if old_target in OLD_TO_NEW:
        return OLD_TO_NEW[old_target]
    # Try adding/removing .ts
    if old_target.endswith('.ts') and old_target[:-3] in OLD_TO_NEW:
        return OLD_TO_NEW[old_target[:-3]]
    if not old_target.endswith('.ts') and (old_target + '.ts') in OLD_TO_NEW:
        return OLD_TO_NEW[old_target + '.ts']
    return old_target  # Not moved, stays at same location

def fix_file(file_path):
    """Fix imports in a single TypeScript file."""
    rel = file_path.relative_to(SRC)
    rel_str = str(rel).replace('\\', '/')
    
    # Skip files not in modules/ (they weren't moved)
    if not rel_str.startswith('modules/'):
        return 0
    
    # Get the file's old location
    old_rel = get_old_location(rel_str)
    if old_rel is None:
        # File was created in the new structure (e.g., schemas or new files)
        # Can't determine old location, skip
        return 0
    
    content = file_path.read_text('utf-8', errors='ignore')
    original = content
    changes = 0
    
    # Find all relative import paths
    for m in re.finditer(r"""['"]((\.\.?/)([^'"]*?))['"]""", content):
        import_path = m.group(1)  # e.g., '../models/database'
        
        # Step 1: What did this resolve to from the file's OLD location?
        old_target = resolve_import(old_rel, import_path)
        
        # Step 2: Where is that target NOW?
        new_target = lookup_new_location(old_target)
        
        # If target didn't move, leave as-is
        if new_target == old_target:
            # But check: does the import still work from the new location?
            current_resolved = resolve_import(rel_str, import_path)
            if current_resolved == old_target:
                continue  # Still works, leave it
        
        # Step 3: Compute correct relative path from file's NEW location
        new_dir = os.path.dirname(rel_str)
        new_rel_path = os.path.relpath(new_target, new_dir).replace('\\', '/')
        if not new_rel_path.startswith('.'):
            new_rel_path = './' + new_rel_path
        
        if new_rel_path != import_path:
            content = content.replace(f"'{import_path}'", f"'{new_rel_path}'")
            content = content.replace(f'"{import_path}"', f'"{new_rel_path}"')
            changes += 1
    
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
            changes = fix_file(f)
            if changes > 0:
                total_changes += changes
                fixed_files += 1
                print(f"  [{changes:3d}] {f.relative_to(SRC)}")
        except Exception as e:
            print(f"  ERROR: {f.relative_to(SRC)}: {e}")
    
    print(f'\n=== 总结 ===')
    print(f'Fixed {total_changes} imports in {fixed_files} files')


if __name__ == '__main__':
    main()

