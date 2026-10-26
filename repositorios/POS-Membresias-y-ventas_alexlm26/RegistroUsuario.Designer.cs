using MaterialSkin.Controls;

namespace ImpresionPOS58
{
    partial class RegistroUsuario
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
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(RegistroUsuario));
            txtNombre = new MaterialTextBox2();
            txtCorreo = new MaterialTextBox2();
            txtContraseña = new MaterialTextBox2();
            btnRegistrar = new MaterialButton();
            pictureBoxFoto = new PictureBox();
            btnCargarImagen = new MaterialButton();
            txtUsername = new MaterialTextBox2();
            txtDomicilio = new MaterialTextBox2();
            txtCelular = new MaterialTextBox2();
            txtConfirmar = new MaterialTextBox2();
            txtRango = new MaterialComboBox();
            ((System.ComponentModel.ISupportInitialize)pictureBoxFoto).BeginInit();
            SuspendLayout();
            // 
            // txtNombre
            // 
            txtNombre.AnimateReadOnly = false;
            txtNombre.BackgroundImageLayout = ImageLayout.None;
            txtNombre.CharacterCasing = CharacterCasing.Normal;
            txtNombre.Depth = 0;
            txtNombre.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtNombre.HideSelection = true;
            txtNombre.Hint = "Nombre Completo";
            txtNombre.LeadingIcon = null;
            txtNombre.Location = new Point(35, 89);
            txtNombre.MaxLength = 32767;
            txtNombre.MouseState = MaterialSkin.MouseState.OUT;
            txtNombre.Name = "txtNombre";
            txtNombre.PasswordChar = '\0';
            txtNombre.PrefixSuffixText = null;
            txtNombre.ReadOnly = false;
            txtNombre.RightToLeft = RightToLeft.No;
            txtNombre.SelectedText = "";
            txtNombre.SelectionLength = 0;
            txtNombre.SelectionStart = 0;
            txtNombre.ShortcutsEnabled = true;
            txtNombre.Size = new Size(200, 48);
            txtNombre.TabIndex = 0;
            txtNombre.TabStop = false;
            txtNombre.TextAlign = HorizontalAlignment.Left;
            txtNombre.TrailingIcon = null;
            txtNombre.UseSystemPasswordChar = false;
            // 
            // txtCorreo
            // 
            txtCorreo.AnimateReadOnly = false;
            txtCorreo.BackgroundImageLayout = ImageLayout.None;
            txtCorreo.CharacterCasing = CharacterCasing.Normal;
            txtCorreo.Depth = 0;
            txtCorreo.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtCorreo.HideSelection = true;
            txtCorreo.Hint = "Correo Electronico";
            txtCorreo.LeadingIcon = null;
            txtCorreo.Location = new Point(35, 156);
            txtCorreo.MaxLength = 32767;
            txtCorreo.MouseState = MaterialSkin.MouseState.OUT;
            txtCorreo.Name = "txtCorreo";
            txtCorreo.PasswordChar = '\0';
            txtCorreo.PrefixSuffixText = null;
            txtCorreo.ReadOnly = false;
            txtCorreo.RightToLeft = RightToLeft.No;
            txtCorreo.SelectedText = "";
            txtCorreo.SelectionLength = 0;
            txtCorreo.SelectionStart = 0;
            txtCorreo.ShortcutsEnabled = true;
            txtCorreo.Size = new Size(200, 48);
            txtCorreo.TabIndex = 1;
            txtCorreo.TabStop = false;
            txtCorreo.TextAlign = HorizontalAlignment.Left;
            txtCorreo.TrailingIcon = null;
            txtCorreo.UseSystemPasswordChar = false;
            // 
            // txtContraseña
            // 
            txtContraseña.AnimateReadOnly = false;
            txtContraseña.BackgroundImageLayout = ImageLayout.None;
            txtContraseña.CharacterCasing = CharacterCasing.Normal;
            txtContraseña.Depth = 0;
            txtContraseña.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtContraseña.HideSelection = true;
            txtContraseña.Hint = "Contraseña";
            txtContraseña.LeadingIcon = null;
            txtContraseña.Location = new Point(267, 216);
            txtContraseña.MaxLength = 32767;
            txtContraseña.MouseState = MaterialSkin.MouseState.OUT;
            txtContraseña.Name = "txtContraseña";
            txtContraseña.PasswordChar = '*';
            txtContraseña.PrefixSuffixText = null;
            txtContraseña.ReadOnly = false;
            txtContraseña.RightToLeft = RightToLeft.No;
            txtContraseña.SelectedText = "";
            txtContraseña.SelectionLength = 0;
            txtContraseña.SelectionStart = 0;
            txtContraseña.ShortcutsEnabled = true;
            txtContraseña.Size = new Size(178, 48);
            txtContraseña.TabIndex = 5;
            txtContraseña.TabStop = false;
            txtContraseña.TextAlign = HorizontalAlignment.Left;
            txtContraseña.TrailingIcon = null;
            txtContraseña.UseSystemPasswordChar = false;
            // 
            // btnRegistrar
            // 
            btnRegistrar.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnRegistrar.Density = MaterialButton.MaterialButtonDensity.Default;
            btnRegistrar.Depth = 0;
            btnRegistrar.ForeColor = SystemColors.ActiveCaptionText;
            btnRegistrar.HighEmphasis = true;
            btnRegistrar.Icon = null;
            btnRegistrar.Location = new Point(346, 382);
            btnRegistrar.Margin = new Padding(4, 6, 4, 6);
            btnRegistrar.MouseState = MaterialSkin.MouseState.HOVER;
            btnRegistrar.Name = "btnRegistrar";
            btnRegistrar.NoAccentTextColor = Color.Empty;
            btnRegistrar.Size = new Size(99, 36);
            btnRegistrar.TabIndex = 7;
            btnRegistrar.Text = "REGISTRAR";
            btnRegistrar.Type = MaterialButton.MaterialButtonType.Contained;
            btnRegistrar.UseAccentColor = false;
            btnRegistrar.UseVisualStyleBackColor = true;
            btnRegistrar.Click += btnRegistrar_Click;
            // 
            // pictureBoxFoto
            // 
            pictureBoxFoto.BorderStyle = BorderStyle.Fixed3D;
            pictureBoxFoto.Image = Properties.Resources.Captura_de_pantalla_2025_04_13_043149;
            pictureBoxFoto.Location = new Point(35, 345);
            pictureBoxFoto.Name = "pictureBoxFoto";
            pictureBoxFoto.Size = new Size(136, 112);
            pictureBoxFoto.SizeMode = PictureBoxSizeMode.StretchImage;
            pictureBoxFoto.TabIndex = 4;
            pictureBoxFoto.TabStop = false;
            // 
            // btnCargarImagen
            // 
            btnCargarImagen.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnCargarImagen.BackColor = SystemColors.ControlDark;
            btnCargarImagen.Density = MaterialButton.MaterialButtonDensity.Default;
            btnCargarImagen.Depth = 0;
            btnCargarImagen.FlatStyle = FlatStyle.Flat;
            btnCargarImagen.ForeColor = SystemColors.ActiveCaptionText;
            btnCargarImagen.HighEmphasis = true;
            btnCargarImagen.Icon = null;
            btnCargarImagen.Location = new Point(190, 382);
            btnCargarImagen.Margin = new Padding(4, 6, 4, 6);
            btnCargarImagen.MouseState = MaterialSkin.MouseState.HOVER;
            btnCargarImagen.Name = "btnCargarImagen";
            btnCargarImagen.NoAccentTextColor = Color.Empty;
            btnCargarImagen.Size = new Size(120, 36);
            btnCargarImagen.TabIndex = 5;
            btnCargarImagen.Text = "CARGAR FOTO";
            btnCargarImagen.Type = MaterialButton.MaterialButtonType.Contained;
            btnCargarImagen.UseAccentColor = false;
            btnCargarImagen.UseVisualStyleBackColor = false;
            btnCargarImagen.Click += btnCargarImagen_Click;
            // 
            // txtUsername
            // 
            txtUsername.AnimateReadOnly = false;
            txtUsername.BackgroundImageLayout = ImageLayout.None;
            txtUsername.CharacterCasing = CharacterCasing.Normal;
            txtUsername.Depth = 0;
            txtUsername.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtUsername.HideSelection = true;
            txtUsername.Hint = "Nombre de Usuario";
            txtUsername.LeadingIcon = null;
            txtUsername.Location = new Point(266, 156);
            txtUsername.MaxLength = 32767;
            txtUsername.MouseState = MaterialSkin.MouseState.OUT;
            txtUsername.Name = "txtUsername";
            txtUsername.PasswordChar = '\0';
            txtUsername.PrefixSuffixText = null;
            txtUsername.ReadOnly = false;
            txtUsername.RightToLeft = RightToLeft.No;
            txtUsername.SelectedText = "";
            txtUsername.SelectionLength = 0;
            txtUsername.SelectionStart = 0;
            txtUsername.ShortcutsEnabled = true;
            txtUsername.Size = new Size(179, 48);
            txtUsername.TabIndex = 4;
            txtUsername.TabStop = false;
            txtUsername.TextAlign = HorizontalAlignment.Left;
            txtUsername.TrailingIcon = null;
            txtUsername.UseSystemPasswordChar = false;
            txtUsername.TextChanged += txtUsername_TextChanged;
            // 
            // txtDomicilio
            // 
            txtDomicilio.AnimateReadOnly = false;
            txtDomicilio.BackgroundImageLayout = ImageLayout.None;
            txtDomicilio.CharacterCasing = CharacterCasing.Normal;
            txtDomicilio.Depth = 0;
            txtDomicilio.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtDomicilio.HideSelection = true;
            txtDomicilio.Hint = "Domicilio";
            txtDomicilio.LeadingIcon = null;
            txtDomicilio.Location = new Point(35, 277);
            txtDomicilio.MaxLength = 32767;
            txtDomicilio.MouseState = MaterialSkin.MouseState.OUT;
            txtDomicilio.Name = "txtDomicilio";
            txtDomicilio.PasswordChar = '\0';
            txtDomicilio.PrefixSuffixText = null;
            txtDomicilio.ReadOnly = false;
            txtDomicilio.RightToLeft = RightToLeft.No;
            txtDomicilio.SelectedText = "";
            txtDomicilio.SelectionLength = 0;
            txtDomicilio.SelectionStart = 0;
            txtDomicilio.ShortcutsEnabled = true;
            txtDomicilio.Size = new Size(197, 48);
            txtDomicilio.TabIndex = 3;
            txtDomicilio.TabStop = false;
            txtDomicilio.TextAlign = HorizontalAlignment.Left;
            txtDomicilio.TrailingIcon = null;
            txtDomicilio.UseSystemPasswordChar = false;
            // 
            // txtCelular
            // 
            txtCelular.AnimateReadOnly = false;
            txtCelular.BackgroundImageLayout = ImageLayout.None;
            txtCelular.CharacterCasing = CharacterCasing.Normal;
            txtCelular.Depth = 0;
            txtCelular.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtCelular.HideSelection = true;
            txtCelular.Hint = "Numero de Celular";
            txtCelular.LeadingIcon = null;
            txtCelular.Location = new Point(35, 216);
            txtCelular.MaxLength = 32767;
            txtCelular.MouseState = MaterialSkin.MouseState.OUT;
            txtCelular.Name = "txtCelular";
            txtCelular.PasswordChar = '\0';
            txtCelular.PrefixSuffixText = null;
            txtCelular.ReadOnly = false;
            txtCelular.RightToLeft = RightToLeft.No;
            txtCelular.SelectedText = "";
            txtCelular.SelectionLength = 0;
            txtCelular.SelectionStart = 0;
            txtCelular.ShortcutsEnabled = true;
            txtCelular.Size = new Size(197, 48);
            txtCelular.TabIndex = 2;
            txtCelular.TabStop = false;
            txtCelular.TextAlign = HorizontalAlignment.Left;
            txtCelular.TrailingIcon = null;
            txtCelular.UseSystemPasswordChar = false;
            // 
            // txtConfirmar
            // 
            txtConfirmar.AnimateReadOnly = false;
            txtConfirmar.BackgroundImageLayout = ImageLayout.None;
            txtConfirmar.CharacterCasing = CharacterCasing.Normal;
            txtConfirmar.Depth = 0;
            txtConfirmar.Font = new Font("Microsoft Sans Serif", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtConfirmar.HideSelection = true;
            txtConfirmar.Hint = "Confirmar Contraseña";
            txtConfirmar.LeadingIcon = null;
            txtConfirmar.Location = new Point(267, 277);
            txtConfirmar.MaxLength = 32767;
            txtConfirmar.MouseState = MaterialSkin.MouseState.OUT;
            txtConfirmar.Name = "txtConfirmar";
            txtConfirmar.PasswordChar = '*';
            txtConfirmar.PrefixSuffixText = null;
            txtConfirmar.ReadOnly = false;
            txtConfirmar.RightToLeft = RightToLeft.No;
            txtConfirmar.SelectedText = "";
            txtConfirmar.SelectionLength = 0;
            txtConfirmar.SelectionStart = 0;
            txtConfirmar.ShortcutsEnabled = true;
            txtConfirmar.Size = new Size(179, 48);
            txtConfirmar.TabIndex = 6;
            txtConfirmar.TabStop = false;
            txtConfirmar.TextAlign = HorizontalAlignment.Left;
            txtConfirmar.TrailingIcon = null;
            txtConfirmar.UseSystemPasswordChar = false;
            // 
            // txtRango
            // 
            txtRango.AutoCompleteSource = AutoCompleteSource.ListItems;
            txtRango.AutoResize = false;
            txtRango.BackColor = Color.FromArgb(255, 255, 255);
            txtRango.Depth = 0;
            txtRango.DrawMode = DrawMode.OwnerDrawVariable;
            txtRango.DropDownHeight = 174;
            txtRango.DropDownStyle = ComboBoxStyle.DropDownList;
            txtRango.DropDownWidth = 121;
            txtRango.Font = new Font("Microsoft Sans Serif", 14F, FontStyle.Bold, GraphicsUnit.Pixel);
            txtRango.ForeColor = Color.FromArgb(222, 0, 0, 0);
            txtRango.FormattingEnabled = true;
            txtRango.Hint = "Selecciona Rango";
            txtRango.IntegralHeight = false;
            txtRango.ItemHeight = 43;
            txtRango.Items.AddRange(new object[] { "ADMINISTRADOR", "SUPERVISOR", "EMPLEADO" });
            txtRango.Location = new Point(266, 89);
            txtRango.MaxDropDownItems = 4;
            txtRango.MouseState = MaterialSkin.MouseState.OUT;
            txtRango.Name = "txtRango";
            txtRango.Size = new Size(179, 49);
            txtRango.StartIndex = 0;
            txtRango.TabIndex = 18;
            // 
            // RegistroUsuario
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = SystemColors.ActiveCaptionText;
            ClientSize = new Size(493, 524);
            Controls.Add(txtRango);
            Controls.Add(txtConfirmar);
            Controls.Add(txtCelular);
            Controls.Add(txtDomicilio);
            Controls.Add(txtUsername);
            Controls.Add(btnCargarImagen);
            Controls.Add(pictureBoxFoto);
            Controls.Add(btnRegistrar);
            Controls.Add(txtContraseña);
            Controls.Add(txtCorreo);
            Controls.Add(txtNombre);
            ForeColor = SystemColors.Control;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            Icon = (Icon)resources.GetObject("$this.Icon");
            MaximizeBox = false;
            Name = "RegistroUsuario";
            StartPosition = FormStartPosition.CenterScreen;
            Text = "REGISTRAR USUARIO";
            ((System.ComponentModel.ISupportInitialize)pictureBoxFoto).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private MaterialTextBox2 txtNombre;
        private MaterialTextBox2 txtCorreo;
        private MaterialTextBox2 txtContraseña;
        private MaterialButton btnRegistrar;
        private System.Windows.Forms.PictureBox pictureBoxFoto;
        private MaterialButton btnCargarImagen;
        private System.Windows.Forms.Label labelFoto;
        private MaterialTextBox2 txtUsername;
        private MaterialTextBox2 txtDomicilio;
        private MaterialTextBox2 txtCelular;
        private MaterialTextBox2 txtConfirmar;
        private MaterialComboBox txtRango;
        private Label label6;
        private Label label7;
        private Label label8;
    }
}
