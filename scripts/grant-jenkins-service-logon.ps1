# Assign only SeServiceLogonRight to the existing local Jenkins account.
# Uses Windows LSA APIs; preserves all other accounts and assigned rights.
# Run elevated. -CheckOnly reads the assignment without changing it.
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (!$CheckOnly -and !$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Abre CMD o PowerShell como administrador y vuelve a ejecutar el comando.'
}
$account = Get-LocalUser -Name 'stockquest_jenkins' -ErrorAction Stop
if (!$account.Enabled) { throw 'La cuenta stockquest_jenkins esta deshabilitada.' }
$sid = [byte[]]::new($account.SID.BinaryLength)
$account.SID.GetBinaryForm($sid, 0)
$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class StockQuestServiceLogon {
    [StructLayout(LayoutKind.Sequential)]
    struct Attributes {
        public uint Length;
        public IntPtr RootDirectory, ObjectName;
        public uint Flags;
        public IntPtr SecurityDescriptor, SecurityQualityOfService;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct Text {
        public ushort Length, MaximumLength;
        public IntPtr Buffer;
    }
    [DllImport("advapi32.dll")] static extern uint LsaOpenPolicy(IntPtr system, ref Attributes attributes, uint access, out IntPtr handle);
    [DllImport("advapi32.dll")] static extern uint LsaEnumerateAccountRights(IntPtr handle, byte[] sid, out IntPtr rights, out uint count);
    [DllImport("advapi32.dll")] static extern uint LsaAddAccountRights(IntPtr handle, byte[] sid, Text[] rights, uint count);
    [DllImport("advapi32.dll")] static extern uint LsaNtStatusToWinError(uint status);
    [DllImport("advapi32.dll")] static extern uint LsaFreeMemory(IntPtr buffer);
    [DllImport("advapi32.dll")] static extern uint LsaClose(IntPtr handle);
    static void Check(uint status) {
        if (status != 0) throw new Win32Exception((int)LsaNtStatusToWinError(status));
    }
    static string[] Read(IntPtr handle, byte[] sid) {
        IntPtr buffer;
        uint count;
        uint status = LsaEnumerateAccountRights(handle, sid, out buffer, out count);
        if (status != 0 && LsaNtStatusToWinError(status) == 2) return new string[0];
        Check(status);
        try {
            string[] result = new string[count];
            int size = Marshal.SizeOf(typeof(Text));
            for (int i = 0; i < count; i++) {
                Text item = (Text)Marshal.PtrToStructure(IntPtr.Add(buffer, i * size), typeof(Text));
                result[i] = Marshal.PtrToStringUni(item.Buffer, item.Length / 2);
            }
            return result;
        } finally { if (buffer != IntPtr.Zero) LsaFreeMemory(buffer); }
    }
    public static string Apply(byte[] sid, bool checkOnly) {
        const string right = "SeServiceLogonRight";
        Attributes attributes = new Attributes();
        attributes.Length = (uint)Marshal.SizeOf(typeof(Attributes));
        IntPtr handle;
        // POLICY_LOOKUP_NAMES; add POLICY_CREATE_ACCOUNT only when assigning.
        Check(LsaOpenPolicy(IntPtr.Zero, ref attributes, checkOnly ? 0x800u : 0x810u, out handle));
        try {
            string[] before = Read(handle, sid);
            if (Array.IndexOf(before, right) >= 0) return "PRESENTE: SeServiceLogonRight ya estaba asignado.";
            if (checkOnly) return "AUSENTE: SeServiceLogonRight todavia no esta asignado.";
            Text item = new Text();
            item.Buffer = Marshal.StringToHGlobalUni(right);
            item.Length = (ushort)(right.Length * 2);
            item.MaximumLength = (ushort)(item.Length + 2);
            try { Check(LsaAddAccountRights(handle, sid, new Text[] { item }, 1)); }
            finally { Marshal.FreeHGlobal(item.Buffer); }
            string[] after = Read(handle, sid);
            if (Array.IndexOf(after, right) < 0) throw new Exception("No se pudo verificar el permiso asignado.");
            foreach (string previous in before) {
                if (Array.IndexOf(after, previous) < 0) throw new Exception("Un permiso previo no aparece en la verificacion.");
            }
            return "CORRECTO: SeServiceLogonRight asignado y verificado; permisos anteriores conservados.";
        } finally { LsaClose(handle); }
    }
}
'@
if (!('StockQuestServiceLogon' -as [type])) { Add-Type -TypeDefinition $source }
Write-Output ('Cuenta local: ' + $env:COMPUTERNAME + '\' + $account.Name)
Write-Output ([StockQuestServiceLogon]::Apply($sid, [bool]$CheckOnly))
