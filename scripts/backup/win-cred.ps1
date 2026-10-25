param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Save", "Read", "Delete", "ProtectFile", "UnprotectFile", "List")]
    [string]$Action,

    [string]$Target,
    [string]$UserName = [System.Environment]::UserName,
    [string]$PasswordFile,
    [string]$InputPath,
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Security

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinCredManager {
    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] uint flags);

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree([In] IntPtr cred);

    [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredDelete(string target, uint type, int flags);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static bool SaveCredential(string target, string userName, string password) {
        byte[] passBytes = System.Text.Encoding.Unicode.GetBytes(password);
        IntPtr passPtr = Marshal.AllocCoTaskMem(passBytes.Length);
        Marshal.Copy(passBytes, 0, passPtr, passBytes.Length);

        CREDENTIAL cred = new CREDENTIAL();
        cred.Type = 1; // CRED_TYPE_GENERIC
        cred.TargetName = target;
        cred.UserName = userName;
        cred.CredentialBlob = passPtr;
        cred.CredentialBlobSize = (uint)passBytes.Length;
        cred.Persist = 2; // CRED_PERSIST_LOCAL_MACHINE (persists for user across reboots)

        bool result = CredWrite(ref cred, 0);
        Marshal.ZeroFreeCoTaskMemUnicode(passPtr);
        return result;
    }

    public static string ReadCredential(string target) {
        IntPtr credPtr;
        if (!CredRead(target, 1, 0, out credPtr)) {
            return null;
        }
        CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
        byte[] bytes = new byte[cred.CredentialBlobSize];
        Marshal.Copy(cred.CredentialBlob, bytes, 0, (int)cred.CredentialBlobSize);
        CredFree(credPtr);
        return System.Text.Encoding.Unicode.GetString(bytes);
    }

    public static bool DeleteCredential(string target) {
        return CredDelete(target, 1, 0);
    }
}
"@

switch ($Action) {
    "Save" {
        if (-not $Target) { throw "Target is required for Save." }
        if (-not $PasswordFile -or -not (Test-Path $PasswordFile)) { throw "Valid PasswordFile is required for Save." }
        $content = [System.IO.File]::ReadAllText($PasswordFile).TrimEnd("`r`n")
        $success = [WinCredManager]::SaveCredential($Target, $UserName, $content)
        if ($success) {
            Write-Output "Successfully stored credential in Windows Credential Manager under target: $Target"
        } else {
            throw "Failed to store credential in Windows Credential Manager."
        }
    }

    "Read" {
        if (-not $Target) { throw "Target is required for Read." }
        $content = [WinCredManager]::ReadCredential($Target)
        if ($null -eq $content) {
            exit 1
        }
        # Write to stdout directly without extra newline
        [Console]::Out.Write($content)
    }

    "Delete" {
        if (-not $Target) { throw "Target is required for Delete." }
        $success = [WinCredManager]::DeleteCredential($Target)
        Write-Output "Credential deletion result: $success"
    }

    "ProtectFile" {
        if (-not $InputPath -or -not (Test-Path $InputPath)) { throw "InputPath must exist." }
        if (-not $OutputPath) { throw "OutputPath is required." }
        $rawBytes = [System.IO.File]::ReadAllBytes($InputPath)
        $protected = [System.Security.Cryptography.ProtectedData]::Protect(
            $rawBytes,
            $null,
            [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        [System.IO.File]::WriteAllBytes($OutputPath, $protected)
        Write-Output "DPAPI-protected file written to $OutputPath"
    }

    "UnprotectFile" {
        if (-not $InputPath -or -not (Test-Path $InputPath)) { throw "InputPath must exist." }
        $encBytes = [System.IO.File]::ReadAllBytes($InputPath)
        $unprotected = [System.Security.Cryptography.ProtectedData]::Unprotect(
            $encBytes,
            $null,
            [System.Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        $text = [System.Text.Encoding]::UTF8.GetString($unprotected).TrimEnd("`r`n")
        [Console]::Out.Write($text)
    }
}
