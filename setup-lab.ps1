param(
  [switch]$SkipLaunch,
  [switch]$NoBrowser,
  [switch]$ForceInstall
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[setup-lab] $Message" -ForegroundColor Cyan
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machinePath;$userPath"
}

function Get-CommandPath {
  param([string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return $null
  }

  return $command.Source
}

function Get-PreferredNodeArch {
  if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
    return 'arm64'
  }

  if ([Environment]::Is64BitOperatingSystem) {
    return 'x64'
  }

  return 'x86'
}

function Install-NodeWithWinget {
  $wingetPath = Get-CommandPath 'winget.exe'
  if (-not $wingetPath) {
    return $false
  }

  Write-Step 'Node.js was not found. Trying Winget first.'
  & $wingetPath install --id OpenJS.NodeJS.LTS --exact --scope user --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Step 'Winget did not finish cleanly. Falling back to the official Node.js installer.'
    return $false
  }

  Refresh-ProcessPath
  return [bool](Get-CommandPath 'node.exe')
}

function Install-NodeWithOfficialInstaller {
  $nodeArch = Get-PreferredNodeArch
  Write-Step "Downloading the latest official Node.js LTS installer for $nodeArch."

  $nodeIndex = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
  $targetFile = "win-$nodeArch-msi"
  $release = $nodeIndex |
    Where-Object { $_.lts -and $_.files -contains $targetFile } |
    Select-Object -First 1

  if (-not $release) {
    throw "Unable to find a Node.js LTS MSI for architecture '$nodeArch'."
  }

  $tempDir = Join-Path $env:TEMP 'setup-lab-node'
  New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

  $msiName = "node-$($release.version)-$nodeArch.msi"
  $msiPath = Join-Path $tempDir $msiName
  $downloadUrl = "https://nodejs.org/dist/$($release.version)/$msiName"

  Invoke-WebRequest -Uri $downloadUrl -OutFile $msiPath

  Write-Step 'Installing Node.js for the current user.'
  $installer = Start-Process -FilePath 'msiexec.exe' -ArgumentList @(
    '/i',
    $msiPath,
    '/qn',
    '/norestart',
    'ALLUSERS=2',
    'MSIINSTALLPERUSER=1'
  ) -Wait -PassThru

  if ($installer.ExitCode -notin @(0, 3010)) {
    throw "Node.js installation failed with exit code $($installer.ExitCode)."
  }

  Refresh-ProcessPath
}

function Ensure-NodeTooling {
  Refresh-ProcessPath

  $nodePath = Get-CommandPath 'node.exe'
  $npmPath = Get-CommandPath 'npm.cmd'

  if ($nodePath -and $npmPath) {
    Write-Step "Node.js already exists: $(& $nodePath --version)"
    Write-Step "npm already exists: $(& $npmPath --version)"
    return @{
      Node = $nodePath
      Npm = $npmPath
    }
  }

  $installedWithWinget = Install-NodeWithWinget
  if (-not $installedWithWinget) {
    Install-NodeWithOfficialInstaller
  }

  $nodePath = Get-CommandPath 'node.exe'
  $npmPath = Get-CommandPath 'npm.cmd'

  if (-not $nodePath -or -not $npmPath) {
    throw 'Node.js installation completed, but node.exe or npm.cmd is still missing from PATH.'
  }

  Write-Step "Node.js ready: $(& $nodePath --version)"
  Write-Step "npm ready: $(& $npmPath --version)"

  return @{
    Node = $nodePath
    Npm = $npmPath
  }
}

function Install-ProjectDependencies {
  param([string]$NpmPath, [string]$RepoRoot)

  $nodeModulesPath = Join-Path $RepoRoot 'node_modules'
  $lockFilePath = Join-Path $RepoRoot 'package-lock.json'

  if ((Test-Path $nodeModulesPath) -and -not $ForceInstall) {
    Write-Step 'Dependencies already exist. Skipping npm install.'
    return
  }

  Push-Location $RepoRoot
  try {
    if (Test-Path $lockFilePath) {
      Write-Step 'Installing dependencies with npm ci.'
      & $NpmPath ci --no-audit --no-fund
      if ($LASTEXITCODE -eq 0) {
        return
      }

      Write-Step 'npm ci failed. Retrying with npm install.'
    }

    Write-Step 'Installing dependencies with npm install.'
    & $NpmPath install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }
}

function Get-FreePort {
  param([int]$StartingPort = 5173)

  for ($port = $StartingPort; $port -lt ($StartingPort + 25); $port++) {
    $listener = $null

    try {
      $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
      $listener.Start()
      $listener.Stop()
      return $port
    }
    catch {
      if ($listener) {
        $listener.Stop()
      }
    }
  }

  throw "No free local port was found starting at $StartingPort."
}

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    }
    catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

try {
  $repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
  $tooling = Ensure-NodeTooling

  Install-ProjectDependencies -NpmPath $tooling.Npm -RepoRoot $repoRoot

  if ($SkipLaunch) {
    Write-Step 'Setup finished. Launch was skipped by request.'
    exit 0
  }

  $hostName = '127.0.0.1'
  $port = Get-FreePort -StartingPort 5173
  $appUrl = "http://${hostName}:$port"

  Write-Step "Starting the Vite server on $appUrl."
  $serverCommand = "Set-Location -LiteralPath '$repoRoot'; npm.cmd run dev -- --host $hostName --port $port --strictPort"

  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoLogo',
    '-NoExit',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    $serverCommand
  ) -WorkingDirectory $repoRoot | Out-Null

  Write-Step 'Waiting for the app to come online.'
  if (-not (Wait-ForUrl -Url $appUrl -TimeoutSeconds 60)) {
    throw "The app did not respond at $appUrl within 60 seconds."
  }

  if (-not $NoBrowser) {
    Write-Step "Opening $appUrl in your default browser."
    Start-Process $appUrl | Out-Null
  }

  Write-Step 'Lab setup is complete.'
}
catch {
  Write-Host "[setup-lab] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
