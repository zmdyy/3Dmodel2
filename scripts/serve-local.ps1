# Windows PowerShell 5.1+. Only serves this repository on the loopback interface.
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

public static class GalleryLocalServer {
    public static void Accept(TcpListener listener, string root) {
        var client = listener.AcceptTcpClient();
        ThreadPool.QueueUserWorkItem(delegate(object unused) { Serve(client, root); });
    }
    static void Serve(TcpClient client, string root) {
        using (client) {
            client.ReceiveTimeout = 5000;
            client.SendTimeout = 15000;
            try {
                using (var stream = client.GetStream()) {
                    // Bound both header size and time; do not accept uploads or execute scripts.
                    var header = new StringBuilder();
                    while (header.Length < 16384) {
                        int value = stream.ReadByte();
                        if (value < 0) return;
                        header.Append((char)value);
                        if (header.Length >= 4 && header.ToString(header.Length - 4, 4) == "\r\n\r\n") break;
                    }
                    if (!header.ToString().EndsWith("\r\n\r\n")) { Reply(stream, 431, "Headers too large"); return; }
                    var line = header.ToString().Split(new string[] { "\r\n" }, StringSplitOptions.None)[0].Split(' ');
                    if (line.Length != 3 || !line[1].StartsWith("/")) { Reply(stream, 400, "Bad request"); return; }
                    bool head = line[0] == "HEAD";
                    if (line[0] != "GET" && !head) { Reply(stream, 405, "Method not allowed"); return; }
                    string relative = Uri.UnescapeDataString(line[1].Split('?')[0]).Replace('\\', '/');
                    foreach (string part in relative.Split('/')) {
                        if (part.StartsWith(".") || part.Contains(":")) { Reply(stream, 403, "Forbidden", head); return; }
                    }
                    string rootPrefix = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
                    string file = Path.GetFullPath(Path.Combine(rootPrefix, relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
                    if (relative.EndsWith("/")) file = Path.Combine(file, "index.html");
                    if (!file.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)) { Reply(stream, 403, "Forbidden", head); return; }
                    if (!File.Exists(file)) { Reply(stream, 404, "Not found", head); return; }
                    using (var input = File.OpenRead(file)) {
                        WriteHeader(stream, "200 OK", Mime(Path.GetExtension(file)), input.Length);
                        if (!head) input.CopyTo(stream);
                    }
                }
            } catch (IOException) { /* Browser closed or request timed out. */ }
              catch (Exception e) { Console.Error.WriteLine("Local request: " + e.Message); }
        }
    }
    static string Mime(string extension) {
        switch (extension.ToLowerInvariant()) {
            case ".html": return "text/html; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": case ".gltf": return "application/json; charset=utf-8";
            case ".glb": return "model/gltf-binary";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".gif": return "image/gif";
            case ".woff": return "font/woff";
            case ".woff2": return "font/woff2";
            case ".ttf": return "font/ttf";
            case ".otf": return "font/otf";
            case ".wasm": return "application/wasm";
            case ".mp3": return "audio/mpeg";
            case ".wav": return "audio/wav";
            case ".mp4": return "video/mp4";
            default: return "application/octet-stream";
        }
    }
    static void Reply(Stream stream, int status, string message, bool head = false) {
        byte[] body = Encoding.UTF8.GetBytes(message);
        WriteHeader(stream, status + " " + message, "text/plain; charset=utf-8", body.Length);
        if (!head) stream.Write(body, 0, body.Length);
    }
    static void WriteHeader(Stream stream, string status, string mime, long length) {
        byte[] bytes = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + "\r\nContent-Type: " + mime +
            "\r\nContent-Length: " + length + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n");
        stream.Write(bytes, 0, bytes.Length);
    }
}
'@

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
try {
    $listener.Start()
    $url = 'http://127.0.0.1:' + $listener.LocalEndpoint.Port + '/'
    Write-Host ''
    Write-Host '3D Gallery is running locally. No Internet or Python required.'
    Write-Host $url
    Write-Host 'Keep this window open. Press Ctrl+C or close it to stop.'
    try { Start-Process $url } catch { Write-Host 'Please open the address above in Chrome or Edge.' }
    while ($true) {
        if ($listener.Pending()) { [GalleryLocalServer]::Accept($listener, $repoRoot) }
        else { Start-Sleep -Milliseconds 30 }
    }
} finally {
    $listener.Stop()
}
