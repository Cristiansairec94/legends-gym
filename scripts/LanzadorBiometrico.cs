using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace LegendsLauncher
{
    public class BiometricLauncher
    {
        [STAThread]
        public static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(baseDir, "server", "webServer.cjs");

            // Ensure web server is running
            try
            {
                ProcessStartInfo psiServer = new ProcessStartInfo("node", "\"" + serverScript + "\"")
                {
                    WorkingDirectory = baseDir,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                Process.Start(psiServer);
            }
            catch {}

            System.Threading.Thread.Sleep(1200);

            string terminalUrl = "http://localhost:5173/?mode=terminal";

            // Try opening in clean app window using Chrome or Edge
            string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
            string edgePathX86 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
            string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");

            try
            {
                if (File.Exists(chromePath))
                {
                    Process.Start(chromePath, "--app=\"" + terminalUrl + "\"");
                    return;
                }
                if (File.Exists(edgePathX86))
                {
                    Process.Start(edgePathX86, "--app=\"" + terminalUrl + "\"");
                    return;
                }
                if (File.Exists(edgePath))
                {
                    Process.Start(edgePath, "--app=\"" + terminalUrl + "\"");
                    return;
                }
                // Fallback to default browser
                Process.Start(new ProcessStartInfo(terminalUrl) { UseShellExecute = true });
            }
            catch
            {
                Process.Start(new ProcessStartInfo(terminalUrl) { UseShellExecute = true });
            }
        }
    }
}
