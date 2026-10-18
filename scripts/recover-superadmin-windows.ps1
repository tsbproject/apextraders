[CmdletBinding()]
param(
    [string]$AccountId,
    [ValidateSet('recover','verify','rollback','self-test')][string]$Action = 'recover',
    [string]$BackupFile,
    [switch]$Apply,
    [switch]$AllowRemote
)
$ErrorActionPreference = 'Stop'
Set-PSDebug -Off
if ($env:OS -ne 'Windows_NT') { throw 'Native Windows is required for this launcher.' }
if ($Action -ne 'self-test' -and [string]::IsNullOrWhiteSpace($AccountId)) { throw 'An exact account ID is required.' }
if ($Action -in @('recover','rollback') -and -not $Apply) { throw 'Recovery/rollback require explicit -Apply.' }
if ($Action -eq 'self-test' -and ($Apply -or $AllowRemote -or $BackupFile -or $AccountId)) { throw 'Self-test takes no account, backup, or mutation flags.' }
if ($Action -eq 'verify' -and ($Apply -or $BackupFile)) { throw 'Verify is read-only: omit -Apply and -BackupFile.' }
if ($Action -eq 'rollback' -and -not $BackupFile) { throw 'Rollback requires the original -BackupFile.' }
if ($Action -eq 'recover' -and -not $BackupFile) {
    $BackupFile = Join-Path $env:LOCALAPPDATA ('ApexTraders-Recovery-' + [Guid]::NewGuid().ToString() + '\rollback.enc')
}
. (Join-Path $PSScriptRoot 'lib\resolve-windows-node.ps1')
[string]$node = Resolve-ApexNodeExecutable
$saved = @{}
# Remove PostgreSQL defaults, dotenv-related ambient configuration, Node loaders,
# debugging, and TLS overrides BEFORE Node starts. Restore this shell afterward.
foreach ($entry in @(Get-ChildItem Env:)) {
    if ($entry.Name -match '^(NODE_|PG|DATABASE_URL$|DOTENV_)') {
        $saved[$entry.Name] = $entry.Value
        Remove-Item -LiteralPath ('Env:' + $entry.Name)
    }
}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    & $node -e "if(process.platform!=='win32'||process.versions.node.split('.')[0]!=='22'||Number(process.versions.node.split('.')[1])<12)process.exit(1)"
    if ($LASTEXITCODE -ne 0) { throw 'Use native Windows Node 22.12 or later in the 22.x series.' }
    $arguments = @('--import', 'tsx', (Join-Path $PSScriptRoot 'recover-superadmin.ts'), $Action)
    if ($AccountId) { $arguments += @('--account-id', $AccountId) }
    if ($BackupFile) { $arguments += @('--backup', $BackupFile) }
    if ($Apply) { $arguments += '--apply' }
    if ($AllowRemote) { $arguments += '--allow-remote' }
    if ($BackupFile) { Write-Host ('Encrypted backup file: ' + $BackupFile) }
    & $node @arguments
    $result = $LASTEXITCODE
} finally {
    Pop-Location
    foreach ($name in $saved.Keys) { Set-Item -LiteralPath ('Env:' + $name) -Value $saved[$name] }
}
exit $result
