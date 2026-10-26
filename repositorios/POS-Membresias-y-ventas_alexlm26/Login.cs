using ImpresionPOS58.DAOs;
using ImpresionPOS58.OBJETOS;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Security.Cryptography;
using MaterialSkin;
using System.Drawing.Printing;

namespace ImpresionPOS58
{
    public partial class Login : MaterialSkin.Controls.MaterialForm
    {
        // VARIABLES PARA EL EFECTO DE HOVER EN btnCerrar
        private Size tamañoOriginal;
        private bool mouseEncima = false;
        private UsuarioDAO usuarioDAO = new UsuarioDAO(); // ASEGÚRATE QUE EL DAO ESTÉ BIEN IMPORTADO


        public Login()
        {
            InitializeComponent();
            var materialSkinManager = MaterialSkinManager.Instance;
            materialSkinManager.AddFormToManage(this);
            materialSkinManager.Theme = MaterialSkinManager.Themes.DARK; // O LIGHT
            materialSkinManager.ColorScheme = new ColorScheme(
                Primary.BlueGrey800,
                Primary.BlueGrey900,
                Primary.BlueGrey500,
                Accent.LightBlue200,
                TextShade.WHITE
            );
        }
        public decimal PedirDineroEnCaja()
        {
            decimal dinero = 0;
            Form inputDialog = new Form();
            inputDialog.Width = 300;
            inputDialog.Height = 180;
            inputDialog.FormBorderStyle = FormBorderStyle.FixedDialog;
            inputDialog.Text = "DINERO EN CAJA 💵";
            inputDialog.StartPosition = FormStartPosition.CenterScreen;

            Label lbl = new Label() { Left = 20, Top = 20, Text = "INGRESA EL MONTO INICIAL 💰", Width = 250 };
            TextBox txtInput = new TextBox() { Left = 20, Top = 50, Width = 240 };
            Button btnOk = new Button() { Text = "ACEPTAR ✅", Left = 40, Width = 100, Top = 90, DialogResult = DialogResult.OK };
            Button btnCancel = new Button() { Text = "CANCELAR ❌", Left = 150, Width = 100, Top = 90, DialogResult = DialogResult.Cancel };

            btnOk.Click += (sender, e) =>
            {
                if (!decimal.TryParse(txtInput.Text, out dinero))
                {
                    MessageBox.Show("POR FAVOR INGRESA UN VALOR DECIMAL VALIDO 🚫🔢", "ERROR", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                inputDialog.Close();
            };

            inputDialog.Controls.Add(lbl);
            inputDialog.Controls.Add(txtInput);
            inputDialog.Controls.Add(btnOk);
            inputDialog.Controls.Add(btnCancel);
            inputDialog.AcceptButton = btnOk;
            inputDialog.CancelButton = btnCancel;

            DialogResult result = inputDialog.ShowDialog();

            return result == DialogResult.OK ? dinero : 0;
        }


        private void btnCerrar_Click(object sender, EventArgs e)
        {
            this.Close();

        }
        private void btnCerrar_MouseDown(object sender, MouseEventArgs e)
        {
            Application.Exit();
        }

        private void btnCerrar_MouseEnter(object sender, EventArgs e)
        {
            if (!mouseEncima)
            {
                tamañoOriginal = btnCerrar.Size;
                btnCerrar.Size = new Size((int)(tamañoOriginal.Width * 1.1), (int)(tamañoOriginal.Height * 1.1));
                mouseEncima = true;
            }
        }

        private void btnCerrar_MouseLeave(object sender, EventArgs e)
        {
            if (mouseEncima)
            {
                btnCerrar.Size = tamañoOriginal;
                mouseEncima = false;
            }
        }
        public static string EncriptarSHA256(string texto)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = Encoding.UTF8.GetBytes(texto);
                byte[] hash = sha256.ComputeHash(bytes);

                StringBuilder builder = new StringBuilder();
                foreach (byte b in hash)
                {
                    builder.Append(b.ToString("x2"));
                }

                return builder.ToString();
            }
        }

        private void btnLogin_Click(object sender, EventArgs e)
        {
         


            string usuario = txtUsuario.Text.Trim();
            string contraseña = txtPassword.Text.Trim();

            if (string.IsNullOrEmpty(usuario) || string.IsNullOrEmpty(contraseña))
            {
                MessageBox.Show("INGRESA USUARIO Y CONTRASEÑA", "ERROR", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            Usuario user = usuarioDAO.ObtenerPorCredenciales(usuario, EncriptarSHA256(contraseña));

            if (user != null)
            {
                //MessageBox.Show($"BIENVENIDO {user.Username} 🎉", "ACCESO CONCEDIDO", MessageBoxButtons.OK, MessageBoxIcon.Information);
                // ABRE TU FORM PRINCIPAL AQUÍ
                // por ejemplo: new MenuPrincipal(user).Show(); this.Hide();
                decimal dineroEnCaja = PedirDineroEnCaja();
                user.dineroEnCaja = dineroEnCaja;
                var sesion = new Sesion
                {
                    IdUsuario = user.IdUsuario,
                    FechaInicio = DateTime.Now,
                    DineroInicial = user.dineroEnCaja
                };
                user.RangoId = usuarioDAO.ObtenerIdRangoPorIdUsuario(user.IdUsuario);
                var dao = new SesionDAO();
                user.idSesion = dao.CrearSesion(sesion);
                dao.AgregarDineroFinal(user.idSesion, user.dineroEnCaja);
                new Form1(user, dineroEnCaja).Show();
                this.Hide();
            }
            else
            {
                MessageBox.Show("USUARIO O CONTRASEÑA INCORRECTOS 🚫", "ACCESO DENEGADO", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
       
       
        private void label3_Click(object sender, EventArgs e)
        {
            MostrarDialogoAutorizacion();
        }
        private void MostrarDialogoAutorizacion()
        {
            Form dialogo = new Form();
            dialogo.Width = 300;
            dialogo.Height = 220;
            dialogo.FormBorderStyle = FormBorderStyle.FixedDialog;
            dialogo.StartPosition = FormStartPosition.CenterScreen;
            dialogo.Text = "AUTORIZACION NECESARIA 🔐";

            Label lblUsuario = new Label() { Text = "USUARIO 👤", Left = 20, Top = 20, Width = 250 };
            TextBox txtUsuario = new TextBox() { Left = 20, Top = 45, Width = 240 };

            Label lblPassword = new Label() { Text = "CONTRASEÑA 🔑", Left = 20, Top = 80, Width = 250 };
            TextBox txtPassword = new TextBox() { Left = 20, Top = 105, Width = 240, PasswordChar = '*' };

            Button btnValidar = new Button() { Text = "VALIDAR ✅", Left = 40, Width = 100, Top = 150, DialogResult = DialogResult.None };
            Button btnCancelar = new Button() { Text = "CANCELAR ❌", Left = 150, Width = 100, Top = 150, DialogResult = DialogResult.Cancel };

            btnValidar.Click += (sender, e) =>
            {
                string usuario = txtUsuario.Text.Trim();
                string password = txtPassword.Text.Trim();

                if (string.IsNullOrEmpty(usuario) || string.IsNullOrEmpty(password))
                {
                    MessageBox.Show("INGRESA USUARIO Y CONTRASEÑA", "ERROR", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                Usuario user = usuarioDAO.ObtenerPorCredenciales(usuario, EncriptarSHA256(password));

                if (user != null)
                {
                    user.RangoId = usuarioDAO.ObtenerIdRangoPorIdUsuario(user.IdUsuario);

                    if (user.RangoId == 1)
                    {
                        RegistroUsuario form = new RegistroUsuario();
                        form.Show();
                        dialogo.Close();
                    }
                    else
                    {
                        MessageBox.Show("NO TIENES AUTORIZACION 🚫", "ACCESO DENEGADO", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                }
                else
                {
                    MessageBox.Show("USUARIO O CONTRASEÑA INCORRECTOS 🚫", "ACCESO DENEGADO", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            };

            dialogo.Controls.Add(lblUsuario);
            dialogo.Controls.Add(txtUsuario);
            dialogo.Controls.Add(lblPassword);
            dialogo.Controls.Add(txtPassword);
            dialogo.Controls.Add(btnValidar);
            dialogo.Controls.Add(btnCancelar);

            dialogo.AcceptButton = btnValidar;
            dialogo.CancelButton = btnCancelar;

            dialogo.ShowDialog();
        }


        private void txtUsuario_Click(object sender, EventArgs e)
        {
            
        }

        private void txtPassword_KeyUp(object sender, KeyEventArgs e)
        {
            if(e.KeyCode == Keys.Enter)
            {
                btnLogin_Click(sender, e);
            }
        }
    }
}
