param([Parameter(Mandatory=$true)][string]$Payload,[string]$Printer)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class RawSpooler {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DocInfo { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int StartDocPrinter(IntPtr handle, int level, [In] DocInfo info);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr handle, IntPtr data, int count, out int written);
  public static bool Send(string printer, byte[] content) { IntPtr h; if(!OpenPrinter(printer,out h,IntPtr.Zero)) return false; try { var info=new DocInfo{pDocName="KPrint - Cozinha",pDataType="RAW"}; if(StartDocPrinter(h,1,info)==0)return false; StartPagePrinter(h); IntPtr p=Marshal.AllocHGlobal(content.Length); Marshal.Copy(content,0,p,content.Length); int w; bool ok=WritePrinter(h,p,content.Length,out w); Marshal.FreeHGlobal(p); EndPagePrinter(h); EndDocPrinter(h); return ok && w==content.Length; } finally { ClosePrinter(h); } }
}
"@

if ([string]::IsNullOrWhiteSpace($Printer)) { $Printer=(Get-CimInstance Win32_Printer | Where-Object Default | Select-Object -First 1).Name }
if ([string]::IsNullOrWhiteSpace($Printer)) { throw "Nenhuma impressora padrao foi encontrada." }
$content=[Convert]::FromBase64String($Payload)
if (-not [RawSpooler]::Send($Printer,$content)) { throw "Falha ao enviar para a impressora: $Printer" }
