param(
    [Parameter(Mandatory=$true)][ValidateSet('CreateDirectory','CheckDirectory','CheckFile')][string]$Action,
    [Parameter(Mandatory=$true)][string]$Path
)
$ErrorActionPreference = 'Stop'
try {
    if ($env:OS -ne 'Windows_NT') { throw 'Windows required' }
    $full = [IO.Path]::GetFullPath($Path)
    if ($full -notmatch '^[A-Za-z]:\\' -or $full.StartsWith('\\')) { throw 'Local drive required' }
    $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($full))
    if ($drive.DriveFormat -ne 'NTFS' -or $drive.DriveType -ne [IO.DriveType]::Fixed) { throw 'Local fixed NTFS required' }
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    # Refuse junctions/symlinks in every existing path component.
    $cursor = $full
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -Force -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point refused' }
        }
        $parent = [IO.Path]::GetDirectoryName($cursor)
        if ($parent -eq $cursor) { break }
        $cursor = $parent
    }
    if ($Action -eq 'CreateDirectory') {
        if (Test-Path -LiteralPath $full) { throw 'New directory required' }
        if (-not (Test-Path -LiteralPath ([IO.Path]::GetDirectoryName($full)) -PathType Container)) { throw 'Existing parent required' }
        $security = [Security.AccessControl.DirectorySecurity]::new()
        $security.SetOwner($sid)
        $security.SetAccessRuleProtection($true, $false)
        $rule = [Security.AccessControl.FileSystemAccessRule]::new(
            $sid, [Security.AccessControl.FileSystemRights]::FullControl,
            ([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit),
            [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
        $security.AddAccessRule($rule)
        [IO.Directory]::CreateDirectory($full, $security) | Out-Null
    }
    $item = Get-Item -Force -LiteralPath $full
    $isDirectory = $Action -ne 'CheckFile'
    if ($item.PSIsContainer -ne $isDirectory) { throw 'Wrong file type' }
    $acl = Get-Acl -LiteralPath $full
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'Wrong owner' }
    if ($isDirectory -and -not $acl.AreAccessRulesProtected) { throw 'Inherited directory ACL refused' }
    $fullControl = $false
    foreach ($entry in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if ($entry.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow) { continue }
        if ($entry.IdentityReference.Value -ne $sid.Value) { throw 'Other principal has access' }
        if (($entry.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl) {
            if (-not $isDirectory -or
                (($entry.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ContainerInherit) -and
                 ($entry.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ObjectInherit) -and
                 $entry.PropagationFlags -eq [Security.AccessControl.PropagationFlags]::None)) { $fullControl = $true }
        }
    }
    if (-not $fullControl) { throw 'Owner permissions missing' }
    exit 0
} catch {
    # Never echo driver details, identities, or environment contents.
    [Console]::Error.WriteLine('Windows backup security check failed. Use a new private directory on local NTFS in a non-elevated session.')
    exit 1
}
