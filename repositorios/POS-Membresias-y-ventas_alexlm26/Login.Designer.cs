
using MaterialSkin.Controls;

namespace ImpresionPOS58
{
    partial class Login
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Login));
            btnLogin = new MaterialButton();
            txtUsuario = new MaterialTextBox2();
            txtPassword = new MaterialTextBox2();
            pictureBox1 = new PictureBox();
            label3 = new Label();
            btnCerrar = new PictureBox();
            ((System.ComponentModel.ISupportInitialize)pictureBox1).BeginInit();
            ((System.ComponentModel.ISupportInitialize)btnCerrar).BeginInit();
            SuspendLayout();
            // 
            // btnLogin
            // 
            btnLogin.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnLogin.Density = MaterialButton.MaterialButtonDensity.Default;
            btnLogin.Depth = 0;
            btnLogin.HighEmphasis = true;
            btnLogin.Icon = null;
            btnLogin.Location = new Point(142, 302);
            btnLogin.Margin = new Padding(4, 6, 4, 6);
            btnLogin.MouseState = MaterialSkin.MouseState.HOVER;
            btnLogin.Name = "btnLogin";
            btnLogin.NoAccentTextColor = Color.Empty;
            btnLogin.Size = new Size(91, 36);
            btnLogin.TabIndex = 3;
            btnLogin.Text = "INGRESAR";
            btnLogin.Type = MaterialButton.MaterialButtonType.Contained;
            btnLogin.UseAccentColor = false;
            btnLogin.UseVisualStyleBackColor = true;
            btnLogin.Click += btnLogin_Click;
            // 
            // txtUsuario
            // 
            txtUsuario.AnimateReadOnly = false;
            txtUsuario.BackgroundImageLayout = ImageLayout.None;
            txtUsuario.CharacterCasing = CharacterCasing.Normal;
            txtUsuario.Depth = 0;
            txtUsuario.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtUsuario.HideSelection = true;
            txtUsuario.Hint = "Usuario";
            txtUsuario.LeadingIcon = null;
            txtUsuario.Location = new Point(93, 176);
            txtUsuario.MaxLength = 32767;
            txtUsuario.MouseState = MaterialSkin.MouseState.OUT;
            txtUsuario.Name = "txtUsuario";
            txtUsuario.PasswordChar = '\0';
            txtUsuario.PrefixSuffixText = null;
            txtUsuario.ReadOnly = false;
            txtUsuario.RightToLeft = RightToLeft.No;
            txtUsuario.SelectedText = "";
            txtUsuario.SelectionLength = 0;
            txtUsuario.SelectionStart = 0;
            txtUsuario.ShortcutsEnabled = true;
            txtUsuario.Size = new Size(189, 48);
            txtUsuario.TabIndex = 1;
            txtUsuario.TabStop = false;
            txtUsuario.TextAlign = HorizontalAlignment.Left;
            txtUsuario.TrailingIcon = null;
            txtUsuario.UseSystemPasswordChar = false;
            txtUsuario.Click += txtUsuario_Click;
            // 
            // txtPassword
            // 
            txtPassword.AnimateReadOnly = false;
            txtPassword.BackgroundImageLayout = ImageLayout.None;
            txtPassword.CharacterCasing = CharacterCasing.Normal;
            txtPassword.Depth = 0;
            txtPassword.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtPassword.HideSelection = true;
            txtPassword.Hint = "Contraseña";
            txtPassword.LeadingIcon = null;
            txtPassword.Location = new Point(93, 245);
            txtPassword.MaxLength = 32767;
            txtPassword.MouseState = MaterialSkin.MouseState.OUT;
            txtPassword.Name = "txtPassword";
            txtPassword.PasswordChar = '*';
            txtPassword.PrefixSuffixText = null;
            txtPassword.ReadOnly = false;
            txtPassword.RightToLeft = RightToLeft.No;
            txtPassword.SelectedText = "";
            txtPassword.SelectionLength = 0;
            txtPassword.SelectionStart = 0;
            txtPassword.ShortcutsEnabled = true;
            txtPassword.Size = new Size(189, 48);
            txtPassword.TabIndex = 2;
            txtPassword.TabStop = false;
            txtPassword.TextAlign = HorizontalAlignment.Left;
            txtPassword.TrailingIcon = null;
            txtPassword.UseSystemPasswordChar = false;
            txtPassword.KeyUp += txtPassword_KeyUp;
            // 
            // pictureBox1
            // 
            pictureBox1.Image = Properties.Resources.Captura_de_pantalla_2025_04_13_043149_removebg_preview;
            pictureBox1.Location = new Point(87, 37);
            pictureBox1.Name = "pictureBox1";
            pictureBox1.Size = new Size(198, 114);
            pictureBox1.SizeMode = PictureBoxSizeMode.StretchImage;
            pictureBox1.TabIndex = 5;
            pictureBox1.TabStop = false;
            // 
            // label3
            // 
            label3.AutoSize = true;
            label3.ForeColor = SystemColors.Control;
            label3.Location = new Point(104, 358);
            label3.Name = "label3";
            label3.Size = new Size(164, 15);
            label3.TabIndex = 6;
            label3.Text = "AGREGAR NUEVO USUARIO";
            label3.Click += label3_Click;
            // 
            // btnCerrar
            // 
            btnCerrar.Image = Properties.Resources.cerrar;
            btnCerrar.Location = new Point(344, -2);
            btnCerrar.Name = "btnCerrar";
            btnCerrar.Size = new Size(35, 37);
            btnCerrar.SizeMode = PictureBoxSizeMode.StretchImage;
            btnCerrar.TabIndex = 7;
            btnCerrar.TabStop = false;
            btnCerrar.Click += btnCerrar_Click;
            btnCerrar.MouseDown += btnCerrar_MouseDown;
            btnCerrar.MouseEnter += btnCerrar_MouseEnter;
            btnCerrar.MouseLeave += btnCerrar_MouseLeave;
            // 
            // Login
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = SystemColors.ActiveCaptionText;
            ClientSize = new Size(381, 394);
            ControlBox = false;
            Controls.Add(btnCerrar);
            Controls.Add(label3);
            Controls.Add(pictureBox1);
            Controls.Add(txtPassword);
            Controls.Add(txtUsuario);
            Controls.Add(btnLogin);
            Font = new Font("Segoe UI", 9F, FontStyle.Bold, GraphicsUnit.Point, 0);
            Icon = (Icon)resources.GetObject("$this.Icon");
            MaximizeBox = false;
            Name = "Login";
            Text = "INICIO DE SESION";
            ((System.ComponentModel.ISupportInitialize)pictureBox1).EndInit();
            ((System.ComponentModel.ISupportInitialize)btnCerrar).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }



        #endregion

        private MaterialButton btnLogin;
        private MaterialTextBox2 txtUsuario;
        private MaterialTextBox2 txtPassword;
        private PictureBox pictureBox1;
        private Label label3;
        private PictureBox btnCerrar;
    }
}