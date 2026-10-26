namespace ImpresionPOS58.VENTANAS
{
    partial class ModificarCliente
    {
        private System.ComponentModel.IContainer components = null;
        private MaterialSkin.Controls.MaterialTextBox txtNombre;
        private MaterialSkin.Controls.MaterialTextBox txtApellidos;
        private MaterialSkin.Controls.MaterialTextBox txtDireccion;
        private MaterialSkin.Controls.MaterialTextBox txtCelular;
        private MaterialSkin.Controls.MaterialTextBox txtCorreo;
        private System.Windows.Forms.PictureBox pictureBoxFoto;
        private MaterialSkin.Controls.MaterialButton btnGuardar;
        private MaterialSkin.Controls.MaterialButton btnCargarFoto;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null)) components.Dispose();
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            txtNombre = new MaterialSkin.Controls.MaterialTextBox();
            txtApellidos = new MaterialSkin.Controls.MaterialTextBox();
            txtDireccion = new MaterialSkin.Controls.MaterialTextBox();
            txtCelular = new MaterialSkin.Controls.MaterialTextBox();
            txtCorreo = new MaterialSkin.Controls.MaterialTextBox();
            pictureBoxFoto = new PictureBox();
            btnGuardar = new MaterialSkin.Controls.MaterialButton();
            btnCargarFoto = new MaterialSkin.Controls.MaterialButton();
            ((System.ComponentModel.ISupportInitialize)pictureBoxFoto).BeginInit();
            SuspendLayout();
            // 
            // txtNombre
            // 
            txtNombre.AnimateReadOnly = false;
            txtNombre.BorderStyle = BorderStyle.None;
            txtNombre.Depth = 0;
            txtNombre.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtNombre.Hint = "Nombre";
            txtNombre.LeadingIcon = null;
            txtNombre.Location = new Point(30, 80);
            txtNombre.MaxLength = 50;
            txtNombre.MouseState = MaterialSkin.MouseState.OUT;
            txtNombre.Multiline = false;
            txtNombre.Name = "txtNombre";
            txtNombre.Size = new Size(250, 50);
            txtNombre.TabIndex = 0;
            txtNombre.Text = "";
            txtNombre.TrailingIcon = null;
            // 
            // txtApellidos
            // 
            txtApellidos.AnimateReadOnly = false;
            txtApellidos.BorderStyle = BorderStyle.None;
            txtApellidos.Depth = 0;
            txtApellidos.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtApellidos.Hint = "Apellidos";
            txtApellidos.LeadingIcon = null;
            txtApellidos.Location = new Point(30, 140);
            txtApellidos.MaxLength = 50;
            txtApellidos.MouseState = MaterialSkin.MouseState.OUT;
            txtApellidos.Multiline = false;
            txtApellidos.Name = "txtApellidos";
            txtApellidos.Size = new Size(250, 50);
            txtApellidos.TabIndex = 1;
            txtApellidos.Text = "";
            txtApellidos.TrailingIcon = null;
            // 
            // txtDireccion
            // 
            txtDireccion.AnimateReadOnly = false;
            txtDireccion.BorderStyle = BorderStyle.None;
            txtDireccion.Depth = 0;
            txtDireccion.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtDireccion.Hint = "Dirección";
            txtDireccion.LeadingIcon = null;
            txtDireccion.Location = new Point(30, 200);
            txtDireccion.MaxLength = 50;
            txtDireccion.MouseState = MaterialSkin.MouseState.OUT;
            txtDireccion.Multiline = false;
            txtDireccion.Name = "txtDireccion";
            txtDireccion.Size = new Size(250, 50);
            txtDireccion.TabIndex = 2;
            txtDireccion.Text = "";
            txtDireccion.TrailingIcon = null;
            // 
            // txtCelular
            // 
            txtCelular.AnimateReadOnly = false;
            txtCelular.BorderStyle = BorderStyle.None;
            txtCelular.Depth = 0;
            txtCelular.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtCelular.Hint = "Celular";
            txtCelular.LeadingIcon = null;
            txtCelular.Location = new Point(30, 260);
            txtCelular.MaxLength = 50;
            txtCelular.MouseState = MaterialSkin.MouseState.OUT;
            txtCelular.Multiline = false;
            txtCelular.Name = "txtCelular";
            txtCelular.Size = new Size(250, 50);
            txtCelular.TabIndex = 3;
            txtCelular.Text = "";
            txtCelular.TrailingIcon = null;
            // 
            // txtCorreo
            // 
            txtCorreo.AnimateReadOnly = false;
            txtCorreo.BorderStyle = BorderStyle.None;
            txtCorreo.Depth = 0;
            txtCorreo.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtCorreo.Hint = "Correo";
            txtCorreo.LeadingIcon = null;
            txtCorreo.Location = new Point(30, 320);
            txtCorreo.MaxLength = 50;
            txtCorreo.MouseState = MaterialSkin.MouseState.OUT;
            txtCorreo.Multiline = false;
            txtCorreo.Name = "txtCorreo";
            txtCorreo.Size = new Size(250, 50);
            txtCorreo.TabIndex = 4;
            txtCorreo.Text = "";
            txtCorreo.TrailingIcon = null;
            // 
            // pictureBoxFoto
            // 
            pictureBoxFoto.BorderStyle = BorderStyle.FixedSingle;
            pictureBoxFoto.Location = new Point(320, 80);
            pictureBoxFoto.Name = "pictureBoxFoto";
            pictureBoxFoto.Size = new Size(160, 160);
            pictureBoxFoto.SizeMode = PictureBoxSizeMode.StretchImage;
            pictureBoxFoto.TabIndex = 5;
            pictureBoxFoto.TabStop = false;
            // 
            // btnGuardar
            // 
            btnGuardar.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnGuardar.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnGuardar.Depth = 0;
            btnGuardar.HighEmphasis = true;
            btnGuardar.Icon = null;
            btnGuardar.Location = new Point(320, 334);
            btnGuardar.Margin = new Padding(4, 6, 4, 6);
            btnGuardar.MouseState = MaterialSkin.MouseState.HOVER;
            btnGuardar.Name = "btnGuardar";
            btnGuardar.NoAccentTextColor = Color.Empty;
            btnGuardar.Size = new Size(157, 36);
            btnGuardar.TabIndex = 7;
            btnGuardar.Text = "GUARDAR CAMBIOS";
            btnGuardar.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnGuardar.UseAccentColor = false;
            btnGuardar.Click += btnGuardar_Click;
            // 
            // btnCargarFoto
            // 
            btnCargarFoto.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnCargarFoto.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnCargarFoto.Depth = 0;
            btnCargarFoto.HighEmphasis = true;
            btnCargarFoto.Icon = null;
            btnCargarFoto.Location = new Point(341, 260);
            btnCargarFoto.Margin = new Padding(4, 6, 4, 6);
            btnCargarFoto.MouseState = MaterialSkin.MouseState.HOVER;
            btnCargarFoto.Name = "btnCargarFoto";
            btnCargarFoto.NoAccentTextColor = Color.Empty;
            btnCargarFoto.Size = new Size(120, 36);
            btnCargarFoto.TabIndex = 6;
            btnCargarFoto.Text = "CARGAR FOTO";
            btnCargarFoto.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnCargarFoto.UseAccentColor = false;
            btnCargarFoto.Click += btnCargarFoto_Click;
            // 
            // ModificarCliente
            // 
            ClientSize = new Size(520, 412);
            Controls.Add(txtNombre);
            Controls.Add(txtApellidos);
            Controls.Add(txtDireccion);
            Controls.Add(txtCelular);
            Controls.Add(txtCorreo);
            Controls.Add(pictureBoxFoto);
            Controls.Add(btnCargarFoto);
            Controls.Add(btnGuardar);
            Name = "ModificarCliente";
            Text = "MODIFICAR CLIENTE";
            ((System.ComponentModel.ISupportInitialize)pictureBoxFoto).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }
    }
}
