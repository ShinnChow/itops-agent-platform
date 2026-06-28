"""
Robust import path fixer for daima module restructure.

Strategy: For every .ts file in src/,
- Parse each `import ... from 'REL_PATH'` or `require('REL_PATH')`
- If REL_PATH is relative (starts with .), calculate what the old path resolved to
  and what the new path should resolve to
- Only fix if the path would be broken (target file doesn't exist at expected location)

This is safer because we only change paths when we're SURE the old one is broken.
"""
import re
import os
from pathlib import Path

SRC = Path(r'F:\自开发代码\多Agent运维平台\ITops agent\daima\backend\src')

def resolve_relative(from_file, rel_path):
    """Resolve a relative import path to an absolute path."""
    base = from_file.parent if from_file.is_file() else from_file
    return (base / rel_path).resolve()

def file_exists_at_resolution(from_file, rel_path):
    """Check if a module can be found at the resolved path."""
    resolved = resolve_relative(from_file, rel_path)
    # Try .ts, .tsx, /index.ts, /index.tsx
    if resolved.exists():
        return True
    if resolved.with_suffix('.ts').exists():
        return True
    if resolved.with_suffix('.tsx').exists():
        return True
    if (resolved / 'index.ts').exists():
        return True
    if (resolved / 'index.tsx').exists():
        return True
    return False

def get_new_path(from_file, old_rel_path):
    """Calculate the correct relative path from the new file location to the target."""
    from_file = Path(from_file)
    old_resolved = resolve_relative(from_file, old_rel_path)
    
    # Try to find the actual file
    target = None
    if old_resolved.exists():
        target = old_resolved
    elif old_resolved.with_suffix('.ts').exists():
        target = old_resolved.with_suffix('.ts')
    elif old_resolved.with_suffix('.tsx').exists():
        target = old_resolved.with_suffix('.tsx')
    elif (old_resolved / 'index.ts').exists():
        target = old_resolved / 'index.ts'
    elif (old_resolved / 'index.tsx').exists():
        target = old_resolved / 'index.tsx'
    
    if target is None:
        return None  # Can't find target
    
    # Make target relative to SRC
    try:
        target_rel = target.relative_to(SRC)
    except ValueError:
        return None  # Target outside src/
    
    # Now compute relative path from from_file to target
    # Using os.path.relpath
    new_rel = os.path.relpath(str(target), str(from_file.parent))
    new_rel = new_rel.replace('\\', '/')
    if not new_rel.startswith('.'):
        new_rel = './' + new_rel
    
    return new_rel

def fix_file(file_path):
    """Fix imports in a single file."""
    content = file_path.read_text('utf-8', errors='ignore')
    original = content
    changes = 0
    
    # Find all import-from and require statements
    pattern = r"""((?:import\s+(?:(?:[\w*\s{},]+\s+from\s+)?)|(?:require\s*\())['"]([^'"]+)['"]"""
    
    for m in re.finditer(r"""['"]((\.\.?/[^'"]+))['"]""", content):
        old_path = m.group(1)
        
        # Skip if path doesn't start with . (not relative)
        if not old_path.startswith('.'):
            continue
        
        # Skip paths that are already correct (target exists)
        if file_exists_at_resolution(file_path, old_path):
            continue
        
        # Try to calculate the correct path
        new_path = get_new_path(file_path, old_path)
        if new_path is None or new_path == old_path:
            continue
        
        # Found a fix
        content = content.replace(f"'{old_path}'", f"'{new_path}'")
        content = content.replace(f'"{old_path}"', f'"{new_path}"')
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
