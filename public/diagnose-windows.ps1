# Read-only Windows diagnosis. Does not install certificates or bypass TLS.
param([string]$CertificateFile = "$env:USERPROFILE\Desktop\allflame-voyage-ca.cer")
$ErrorActionPreference = 'Stop'
$expectedRoot = '308247F1AD6A09294341A34627117EDB718BF634'
$expectedSha256 = '59EF4E27006E76CA526A2EF3BE3031345894A71EF2C2137605DC59B3E30E3072'
if (-not ('VoyageTlsProbe' -as [type])) {
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Net.Security;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
public class VoyageTlsResult {
  public string PolicyErrors;
  public string[] ChainStatus;
  public string[] ChainThumbprints;
  public X509Certificate2 Leaf;
  public string ConnectionError;
  public bool TlsAccepted;
}
public static class VoyageTlsProbe {
  public static VoyageTlsResult Run(string host, int port) {
    var result = new VoyageTlsResult();
    using (var tcp = new TcpClient()) {
      try {
        var pending = tcp.BeginConnect(host, port, null, null);
        if (!pending.AsyncWaitHandle.WaitOne(5000)) throw new TimeoutException("TCP connection timeout");
        tcp.EndConnect(pending);
        using (var ssl = new SslStream(tcp.GetStream(), false, delegate(object sender, X509Certificate cert, X509Chain chain, SslPolicyErrors errors) {
          result.PolicyErrors = errors.ToString();
          if (cert != null) result.Leaf = new X509Certificate2(cert);
          var statuses = new List<string>();
          var thumbprints = new List<string>();
          if (chain != null) {
            foreach (var status in chain.ChainStatus) statuses.Add(status.Status.ToString());
            foreach (var element in chain.ChainElements) thumbprints.Add(element.Certificate.Thumbprint);
          }
          result.ChainStatus = statuses.ToArray();
          result.ChainThumbprints = thumbprints.ToArray();
          // Same verdict as normal TLS validation, never accept an invalid chain.
          return errors == SslPolicyErrors.None;
        })) {
          ssl.ReadTimeout = 5000;
          ssl.WriteTimeout = 5000;
          ssl.AuthenticateAsClient(host, null, SslProtocols.None, false);
          result.TlsAccepted = true;
        }
      } catch (Exception error) { result.ConnectionError = error.GetBaseException().Message; }
    }
    return result;
  }
}
'@
}

function Has-ExpectedRoot([string]$store) {
  return @((Get-ChildItem $store) | Where-Object { $_.Thumbprint -eq $expectedRoot }).Count -gt 0
}
$tls = [VoyageTlsProbe]::Run('192.168.1.8', 8443)
$leafInfo = $null
if ($tls.Leaf) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $leafHash = ([BitConverter]::ToString($sha.ComputeHash($tls.Leaf.RawData))).Replace('-', '') }
  finally { $sha.Dispose() }
  $san = @($tls.Leaf.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' } | ForEach-Object { $_.Format($false) }) -join '; '
  $leafInfo = [ordered]@{
    Subject = $tls.Leaf.Subject
    Issuer = $tls.Leaf.Issuer
    Sha256 = $leafHash
    SAN = $san
    NotBeforeUtc = $tls.Leaf.NotBefore.ToUniversalTime().ToString('o')
    NotAfterUtc = $tls.Leaf.NotAfter.ToUniversalTime().ToString('o')
    ValidAtWindowsClock = ((Get-Date) -ge $tls.Leaf.NotBefore -and (Get-Date) -le $tls.Leaf.NotAfter)
  }
}
$download = [ordered]@{ Found = (Test-Path -LiteralPath $CertificateFile); Sha256 = $null; MatchesExpected = $false }
if ($download.Found) {
  $download.Sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $CertificateFile).Hash
  $download.MatchesExpected = $download.Sha256 -eq $expectedSha256
}
[ordered]@{
  URL = 'https://192.168.1.8:8443/'
  WindowsClockUtc = (Get-Date).ToUniversalTime().ToString('o')
  PowerShellVersion = $PSVersionTable.PSVersion.ToString()
  ExpectedRootThumbprint = $expectedRoot
  CurrentUserRootPresent = Has-ExpectedRoot 'Cert:\CurrentUser\Root'
  LocalMachineRootPresent = Has-ExpectedRoot 'Cert:\LocalMachine\Root'
  CurrentUserPersonalPresent = Has-ExpectedRoot 'Cert:\CurrentUser\My'
  DownloadedPublicCA = $download
  Leaf = $leafInfo
  WindowsTlsAccepted = $tls.TlsAccepted
  PolicyErrors = $tls.PolicyErrors
  ChainStatus = $tls.ChainStatus
  ChainThumbprints = $tls.ChainThumbprints
  ExpectedRootInChain = @($tls.ChainThumbprints) -contains $expectedRoot
  ConnectionError = $tls.ConnectionError
  EdgeCertificateError = 'Record the exact Edge error separately; Windows TLS is not an Edge verdict'
} | ConvertTo-Json -Depth 5
if ($tls.Leaf) { $tls.Leaf.Dispose() }
