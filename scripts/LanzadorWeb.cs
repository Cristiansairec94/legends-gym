using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace LegendsLauncher
{
    public class MainForm : Form
    {
        private Process serverProcess = null;
        private Label lblStatus;
        private Label lblUrl;
        private Button btnOpenBrowser;
        private Button btnOpenDesktopErp;
        private Button btnOpenTerminal;
        private TextBox txtLogs;
        private string baseDir;

        public MainForm()
        {
            baseDir = AppDomain.CurrentDomain.BaseDirectory;

            this.Text = "FITNESS LEGENDS GYM — Centro de Control Web & ERP";
            this.Size = new Size(620, 520);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 17, 23);
            this.ForeColor = Color.White;

            string iconPath = Path.Combine(baseDir, "build", "icon.ico");
            if (File.Exists(iconPath))
            {
                try { this.Icon = new Icon(iconPath); } catch { }
            }

            InitUI();
            this.Load += (s, e) => StartWebServer();
            this.FormClosing += (s, e) => StopWebServer();
        }

        private void InitUI()
        {
            Label lblTitle = new Label()
            {
                Text = "🏋️ FITNESS LEGENDS PRO GYM",
                Font = new Font("Segoe UI", 16, FontStyle.Bold),
                ForeColor = Color.FromArgb(234, 179, 8),
                Location = new Point(20, 18),
                AutoSize = true
            };
            this.Controls.Add(lblTitle);

            Label lblSubtitle = new Label()
            {
                Text = "Sistema ERP & Control Biometrico en Vivo",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(22, 50),
                AutoSize = true
            };
            this.Controls.Add(lblSubtitle);

            Panel pnlStatus = new Panel()
            {
                Location = new Point(20, 85),
                Size = new Size(560, 75),
                BackColor = Color.FromArgb(24, 24, 32),
                BorderStyle = BorderStyle.FixedSingle
            };

            lblStatus = new Label()
            {
                Text = "● Servidor Web: Iniciando...",
                Font = new Font("Segoe UI", 11, FontStyle.Bold),
                ForeColor = Color.FromArgb(250, 204, 21),
                Location = new Point(15, 12),
                AutoSize = true
            };
            pnlStatus.Controls.Add(lblStatus);

            lblUrl = new Label()
            {
                Text = "Dirección: http://localhost:5173",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(147, 197, 253),
                Location = new Point(15, 42),
                AutoSize = true
            };
            pnlStatus.Controls.Add(lblUrl);
            this.Controls.Add(pnlStatus);

            // Button: Open Web Biometric Terminal
            Button btnWebBiometric = new Button()
            {
                Text = "⚡ Control Biométrico Web",
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                BackColor = Color.FromArgb(234, 179, 8),
                ForeColor = Color.Black,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(20, 175),
                Size = new Size(272, 44),
                Cursor = Cursors.Hand
            };
            btnWebBiometric.FlatAppearance.BorderSize = 0;
            btnWebBiometric.Click += (s, e) => OpenUrl("http://localhost:5173/?mode=terminal");
            this.Controls.Add(btnWebBiometric);

            // Button: Open Web ERP
            btnOpenBrowser = new Button()
            {
                Text = "🌐 Sistema ERP Web",
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                BackColor = Color.FromArgb(34, 197, 94),
                ForeColor = Color.Black,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(308, 175),
                Size = new Size(272, 44),
                Cursor = Cursors.Hand
            };
            btnOpenBrowser.FlatAppearance.BorderSize = 0;
            btnOpenBrowser.Click += (s, e) => OpenUrl("http://localhost:5173");
            this.Controls.Add(btnOpenBrowser);

            // Button: Open ERP Desktop
            btnOpenDesktopErp = new Button()
            {
                Text = "💼 Abrir ERP Escritorio (.exe)",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                BackColor = Color.FromArgb(39, 39, 49),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(20, 230),
                Size = new Size(272, 38),
                Cursor = Cursors.Hand
            };
            btnOpenDesktopErp.FlatAppearance.BorderColor = Color.FromArgb(63, 63, 70);
            btnOpenDesktopErp.Click += (s, e) => LaunchDesktop(true);
            this.Controls.Add(btnOpenDesktopErp);

            // Button: Open Terminal Desktop
            btnOpenTerminal = new Button()
            {
                Text = "⚡ Terminal Torniquete (.exe)",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                BackColor = Color.FromArgb(39, 39, 49),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(308, 230),
                Size = new Size(272, 38),
                Cursor = Cursors.Hand
            };
            btnOpenTerminal.FlatAppearance.BorderColor = Color.FromArgb(63, 63, 70);
            btnOpenTerminal.Click += (s, e) => LaunchDesktop(false);
            this.Controls.Add(btnOpenTerminal);

            // Console output area
            Label lblConsole = new Label()
            {
                Text = "Registro de Eventos:",
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(20, 280),
                AutoSize = true
            };
            this.Controls.Add(lblConsole);

            txtLogs = new TextBox()
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                Location = new Point(20, 302),
                Size = new Size(560, 160),
                BackColor = Color.FromArgb(10, 10, 15),
                ForeColor = Color.FromArgb(209, 213, 219),
                Font = new Font("Consolas", 8.5f),
                BorderStyle = BorderStyle.FixedSingle
            };
            this.Controls.Add(txtLogs);
        }

        private void AppendLog(string text)
        {
            if (txtLogs.InvokeRequired)
            {
                txtLogs.BeginInvoke(new Action(() => AppendLog(text)));
                return;
            }
            txtLogs.AppendText(text + Environment.NewLine);
        }

        private void StartWebServer()
        {
            AppendLog("[*] Verificando entorno...");
            string serverScript = Path.Combine(baseDir, "server", "webServer.cjs");

            if (!File.Exists(serverScript))
            {
                AppendLog("[ERROR] No se encontró " + serverScript);
                lblStatus.Text = "● Error: Archivo de servidor no encontrado";
                lblStatus.ForeColor = Color.Red;
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("node", "\"" + serverScript + "\"")
                {
                    WorkingDirectory = baseDir,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                serverProcess = new Process { StartInfo = psi };
                serverProcess.OutputDataReceived += (s, args) =>
                {
                    if (!string.IsNullOrEmpty(args.Data))
                    {
                        AppendLog(args.Data);
                        if (args.Data.Contains("SERVIDOR WEB ACTIVO") || args.Data.Contains("localhost:5173"))
                        {
                            this.BeginInvoke(new Action(() =>
                            {
                                lblStatus.Text = "● Servidor Web: ACTIVO Y LISTO";
                                lblStatus.ForeColor = Color.FromArgb(34, 197, 94);
                            }));
                        }
                    }
                };
                serverProcess.ErrorDataReceived += (s, args) =>
                {
                    if (!string.IsNullOrEmpty(args.Data)) AppendLog("[ERR] " + args.Data);
                };

                serverProcess.Start();
                serverProcess.BeginOutputReadLine();
                serverProcess.BeginErrorReadLine();

                AppendLog("[*] Proceso de servidor iniciado (PID: " + serverProcess.Id + ")");
            }
            catch (Exception ex)
            {
                AppendLog("[ERROR] No se pudo iniciar Node.js: " + ex.Message);
                lblStatus.Text = "● Error al iniciar servidor Node";
                lblStatus.ForeColor = Color.Red;
                MessageBox.Show(
                    "No se pudo iniciar Node.js automáticamente.\nAsegúrese de tener Node.js instalado o use los scripts .bat incluidos.",
                    "Error de inicio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }
        }

        private void StopWebServer()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    serverProcess.Kill();
                }
                catch { }
            }
        }

        private void OpenUrl(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("No se pudo abrir el navegador: " + ex.Message);
            }
        }

        private void LaunchDesktop(bool isMain)
        {
            string exePath = Path.Combine(baseDir, "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "ControlDeAccesoLegends.exe");
            if (!File.Exists(exePath))
            {
                MessageBox.Show(
                    "No se encontró el ejecutable nativo en:\n" + exePath + "\n\nEjecute 'npm run package' para compilarlo.",
                    "Aviso",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(exePath, isMain ? "--main" : "")
                {
                    WorkingDirectory = Path.GetDirectoryName(exePath)
                };
                Process.Start(psi);
                AppendLog("[*] Abierto ejecutable escritorio " + (isMain ? "(Modo ERP)" : "(Modo Torniquete)"));
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al ejecutar: " + ex.Message);
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
