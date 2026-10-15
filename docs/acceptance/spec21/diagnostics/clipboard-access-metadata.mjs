import {execFileSync} from 'node:child_process'
const code = String.raw`using System; using System.Text; using System.IO; using System.Diagnostics; using System.Runtime.InteropServices;
public static class ClipAccess {
 [DllImport("user32.dll", SetLastError=true)] static extern bool OpenClipboard(IntPtr owner);
 [DllImport("user32.dll")] static extern bool CloseClipboard();
 [DllImport("user32.dll")] static extern IntPtr GetOpenClipboardWindow();
 [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
 [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr desktop);
 [DllImport("user32.dll")] static extern IntPtr GetThreadDesktop(uint thread);
 [DllImport("user32.dll")] static extern IntPtr GetProcessWindowStation();
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool GetUserObjectInformation(IntPtr obj, int index, StringBuilder text, uint size, out uint needed);
 static string Name(IntPtr obj) {if(obj==IntPtr.Zero)return ""; var text=new StringBuilder(256);uint n;return GetUserObjectInformation(obj,2,text,512,out n)?text.ToString():"unavailable";}
 [STAThread] static void Main(string[] args) {
  IntPtr input=OpenInputDesktop(0,false,1);int inputError=input==IntPtr.Zero?Marshal.GetLastWin32Error():0;string inputName=Name(input);if(input!=IntPtr.Zero)CloseDesktop(input);
  bool opened=OpenClipboard(IntPtr.Zero);int clipError=opened?0:Marshal.GetLastWin32Error();if(opened)CloseClipboard();
  string result="{\"Session\":"+Process.GetCurrentProcess().SessionId+",\"InputDesktopOpened\":"+(input!=IntPtr.Zero?"true":"false")+",\"InputDesktopError\":"+inputError+",\"InputDesktopName\":\""+inputName+"\",\"ThreadDesktopName\":\""+Name(GetThreadDesktop(GetCurrentThreadId()))+"\",\"WindowStation\":\""+Name(GetProcessWindowStation())+"\",\"ClipboardOpened\":"+(opened?"true":"false")+",\"ClipboardError\":"+clipError+",\"OpenClipboardWindow\":"+GetOpenClipboardWindow().ToInt64()+"}";
  File.WriteAllText(args[0],result,new UTF8Encoding(false));
 }
}`
const source = Buffer.from(code).toString('base64')
const script = `
$edge=Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*--remote-debugging-port=19393*' } | Select-Object -First 1
if (!$edge -or $edge.CommandLine -notmatch '--user-data-dir="([^"]+)"') { throw 'Own debug Edge profile not located' }
$profile=$Matches[1];$name=Split-Path -Leaf $profile
if ($name -notmatch '^AllflameEdgeAcceptance-[a-f0-9]+$') { throw 'Not an owned acceptance profile' }
$task=$name+'-AccessMetadata';$cs=Join-Path $profile 'access-metadata.cs';$exe=Join-Path $profile 'access-metadata.exe';$output=Join-Path $profile 'access-metadata.json'
[IO.File]::WriteAllText($cs,[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${source}')))
$compiler=Join-Path $env:SystemRoot 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$compile=& $compiler '/nologo' '/target:winexe' "/out:$exe" $cs
if ($LASTEXITCODE -ne 0) { throw ($compile -join ' ') }
$action=New-ScheduledTaskAction -Execute $exe -Argument ('"'+$output+'"')
$principal=New-ScheduledTaskPrincipal -UserId (whoami) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $task -Action $action -Principal $principal | Out-Null
try {
 Start-ScheduledTask -TaskName $task
 for($i=0;$i -lt 100;$i++){if(Test-Path -LiteralPath $output){break};Start-Sleep -Milliseconds 100}
 Get-Content -LiteralPath $output -Raw -Encoding UTF8
} finally {
 Stop-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue
 Get-CimInstance Win32_Process -Filter "Name='access-metadata.exe'" | Where-Object {$_.ExecutablePath -eq $exe} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}
 Unregister-ScheduledTask -TaskName $task -Confirm:$false
 Remove-Item -LiteralPath $cs,$exe,$output -Force -ErrorAction SilentlyContinue
}
`
const wrapper=`[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); $ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-Expression ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadToEnd())))`
console.log(execFileSync('ssh',['-o','BatchMode=yes','opensonic-windows-runner',`powershell.exe -NoProfile -EncodedCommand ${Buffer.from(wrapper,'utf16le').toString('base64')}`],{input:Buffer.from(script).toString('base64'),encoding:'utf8',timeout:30000}).trim())
