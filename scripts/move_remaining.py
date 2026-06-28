"""Move remaining files that were missed in the first pass"""
import subprocess, shutil
from pathlib import Path

ROOT = Path(r'F:\自开发代码\多Agent运维平台\ITops agent\daima')
SRC = ROOT / 'backend' / 'src'

moves = [
    ('routes\\changeRoutes.ts', 'modules\\infra\\routes\\changeRoutes.ts'),
    ('routes\\linkageRoutes.ts', 'modules\\infra\\routes\\linkageRoutes.ts'),
    ('services\\vncProxyService.ts', 'modules\\network\\services\\vncProxyService.ts'),
    ('services\\restartService.ts', 'modules\\infra\\services\\restartService.ts'),
    ('services\\registryService.ts', 'modules\\containers\\services\\registryService.ts'),
    # alertAutoResponse subdirectory
    ('services\\alertAutoResponse\\alertAutoResponseService.ts', 'modules\\alerts\\services\\alertAutoResponse\\alertAutoResponseService.ts'),
    ('services\\alertAutoResponse\\probeUnit.ts', 'modules\\alerts\\services\\alertAutoResponse\\probeUnit.ts'),
    ('services\\alertAutoResponse\\types.ts', 'modules\\alerts\\services\\alertAutoResponse\\types.ts'),
    ('services\\alertAutoResponse\\adaptive\\adaptiveAutomation.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\adaptiveAutomation.ts'),
    ('services\\alertAutoResponse\\adaptive\\baselineAnomalyDetector.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\baselineAnomalyDetector.ts'),
    ('services\\alertAutoResponse\\adaptive\\deviceProfiler.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\deviceProfiler.ts'),
    ('services\\alertAutoResponse\\adaptive\\escalationEngine.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\escalationEngine.ts'),
    ('services\\alertAutoResponse\\adaptive\\knowledgeFeedbackLoop.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\knowledgeFeedbackLoop.ts'),
    ('services\\alertAutoResponse\\adaptive\\riskAssessor.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\riskAssessor.ts'),
    ('services\\alertAutoResponse\\adaptive\\strategyRecommender.ts', 'modules\\alerts\\services\\alertAutoResponse\\adaptive\\strategyRecommender.ts'),
    ('services\\alertAutoResponse\\diagnosis\\probeExecutor.ts', 'modules\\alerts\\services\\alertAutoResponse\\diagnosis\\probeExecutor.ts'),
    ('services\\alertAutoResponse\\diagnosis\\snmpDiagnosisEngine.ts', 'modules\\alerts\\services\\alertAutoResponse\\diagnosis\\snmpDiagnosisEngine.ts'),
    ('services\\alertAutoResponse\\diagnosis\\sshDiagnosisEngine.ts', 'modules\\alerts\\services\\alertAutoResponse\\diagnosis\\sshDiagnosisEngine.ts'),
    ('services\\alertAutoResponse\\notification\\smartNotifier.ts', 'modules\\alerts\\services\\alertAutoResponse\\notification\\smartNotifier.ts'),
    ('services\\alertAutoResponse\\remediation\\remediationExecutor.ts', 'modules\\alerts\\services\\alertAutoResponse\\remediation\\remediationExecutor.ts'),
    ('services\\alertAutoResponse\\remediation\\verificationGates.ts', 'modules\\alerts\\services\\alertAutoResponse\\remediation\\verificationGates.ts'),
    ('services\\alertAutoResponse\\scheduler\\resourceAwareScheduler.ts', 'modules\\alerts\\services\\alertAutoResponse\\scheduler\\resourceAwareScheduler.ts'),
]

moved = 0
for src_rel, dst_rel in moves:
    src = SRC / src_rel
    dst = SRC / dst_rel
    if not src.exists():
        print(f'  SKIP (not exist): {src_rel}')
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(['git', 'mv', str(src), str(dst)], cwd=str(ROOT), capture_output=True, text=True, timeout=10)
    if r.returncode != 0:
        shutil.copy2(str(src), str(dst))
        src.unlink()
    moved += 1
    print(f'  MOVE: {src_rel}')

print(f'\nDone. Moved {moved} files.')
