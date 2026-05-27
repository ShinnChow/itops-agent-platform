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
    uptime: "powershell -Command \"$uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; Write-Output $uptime.TotalSeconds\""
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
  if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('debian') || lower.includes('centos') || lower.includes('red hat')) {
    return 'linux'
  }
  return 'unknown'
}
