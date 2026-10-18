# Resolve one application BEFORE reading its Source. Member enumeration over
# multiple Get-Command results otherwise produces an array of executable paths.
function Resolve-ApexNodeExecutable {
    $command = Get-Command -Name node.exe -CommandType Application -All -ErrorAction Stop |
        Select-Object -First 1
    if ($null -eq $command -or $command.Source -isnot [string] -or
        [string]::IsNullOrWhiteSpace($command.Source) -or
        -not [IO.Path]::IsPathRooted($command.Source)) {
        throw 'Exactly one absolute Node executable path is required.'
    }
    $file = Get-Item -LiteralPath $command.Source -Force -ErrorAction Stop
    if ($file -isnot [IO.FileInfo] -or $file.Name -ine 'node.exe') {
        throw 'The selected Node executable must be an existing node.exe file.'
    }
    # The launcher checks the Windows platform and Node 22.12+ using this exact
    # scalar path after removing ambient Node/PostgreSQL overrides. No fallback.
    return [string]$file.FullName
}
