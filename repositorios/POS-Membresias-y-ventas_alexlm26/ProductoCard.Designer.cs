namespace ImpresionPOS58
{
    partial class ProductoCard
    {
        private PictureBox pictureBox;
        private Label lblNombre;
        private Label lblPrecio;
        private Label lblCantidad;
        private Button btnSumar;
        private Button btnRestar;
        private Button btnEliminar;
        private Panel panelInfo;

        private void InitializeComponent()
        {
            pictureBox = new PictureBox();
            lblNombre = new Label();
            lblPrecio = new Label();
            lblCantidad = new Label();
            btnSumar = new Button();
            btnRestar = new Button();
            btnEliminar = new Button();
            panelInfo = new Panel();
            ((System.ComponentModel.ISupportInitialize)pictureBox).BeginInit();
            panelInfo.SuspendLayout();
            SuspendLayout();
            // 
            // pictureBox
            // 
            pictureBox.BackColor = Color.Black;
            pictureBox.Location = new Point(10, 10);
            pictureBox.Name = "pictureBox";
            pictureBox.Size = new Size(80, 80);
            pictureBox.SizeMode = PictureBoxSizeMode.Zoom;
            pictureBox.TabIndex = 0;
            pictureBox.TabStop = false;
            // 
            // lblNombre
            // 
            lblNombre.AutoSize = true;
            lblNombre.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            lblNombre.ForeColor = Color.White;
            lblNombre.Location = new Point(0, 0);
            lblNombre.Name = "lblNombre";
            lblNombre.Size = new Size(0, 19);
            lblNombre.TabIndex = 0;
            // 
            // lblPrecio
            // 
            lblPrecio.AutoSize = true;
            lblPrecio.Font = new Font("Segoe UI", 9F);
            lblPrecio.ForeColor = Color.LightGreen;
            lblPrecio.Location = new Point(0, 25);
            lblPrecio.Name = "lblPrecio";
            lblPrecio.Size = new Size(0, 15);
            lblPrecio.TabIndex = 1;
            // 
            // lblCantidad
            // 
            lblCantidad.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblCantidad.ForeColor = Color.White;
            lblCantidad.Location = new Point(339, 35);
            lblCantidad.Name = "lblCantidad";
            lblCantidad.Size = new Size(40, 30);
            lblCantidad.TabIndex = 2;
            lblCantidad.Text = "1";
            lblCantidad.TextAlign = ContentAlignment.MiddleCenter;
            lblCantidad.Click += lblCantidad_Click;
            // 
            // btnSumar
            // 
            btnSumar.BackColor = Color.DarkGreen;
            btnSumar.FlatAppearance.BorderSize = 0;
            btnSumar.FlatStyle = FlatStyle.Flat;
            btnSumar.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnSumar.ForeColor = Color.White;
            btnSumar.Location = new Point(385, 10);
            btnSumar.Name = "btnSumar";
            btnSumar.Size = new Size(30, 80);
            btnSumar.TabIndex = 3;
            btnSumar.Text = "+";
            btnSumar.UseVisualStyleBackColor = false;
            // 
            // btnRestar
            // 
            btnRestar.BackColor = Color.Maroon;
            btnRestar.FlatAppearance.BorderSize = 0;
            btnRestar.FlatStyle = FlatStyle.Flat;
            btnRestar.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnRestar.ForeColor = Color.White;
            btnRestar.Location = new Point(306, 10);
            btnRestar.Name = "btnRestar";
            btnRestar.Size = new Size(30, 80);
            btnRestar.TabIndex = 4;
            btnRestar.Text = "-";
            btnRestar.UseVisualStyleBackColor = false;
            // 
            // btnEliminar
            // 
            btnEliminar.BackColor = Color.Red;
            btnEliminar.FlatAppearance.BorderSize = 0;
            btnEliminar.FlatStyle = FlatStyle.Flat;
            btnEliminar.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnEliminar.ForeColor = Color.White;
            btnEliminar.Location = new Point(421, 10);
            btnEliminar.Name = "btnEliminar";
            btnEliminar.Size = new Size(43, 80);
            btnEliminar.TabIndex = 5;
            btnEliminar.Text = "X";
            btnEliminar.UseVisualStyleBackColor = false;
            // 
            // panelInfo
            // 
            panelInfo.BackColor = Color.Transparent;
            panelInfo.Controls.Add(lblNombre);
            panelInfo.Controls.Add(lblPrecio);
            panelInfo.Location = new Point(100, 10);
            panelInfo.Name = "panelInfo";
            panelInfo.Size = new Size(200, 80);
            panelInfo.TabIndex = 1;
            // 
            // ProductoCard
            // 
            BackColor = Color.FromArgb(20, 20, 20);
            BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(pictureBox);
            Controls.Add(panelInfo);
            Controls.Add(lblCantidad);
            Controls.Add(btnSumar);
            Controls.Add(btnRestar);
            Controls.Add(btnEliminar);
            Name = "ProductoCard";
            Size = new Size(463, 98);
            ((System.ComponentModel.ISupportInitialize)pictureBox).EndInit();
            panelInfo.ResumeLayout(false);
            panelInfo.PerformLayout();
            ResumeLayout(false);
        }
    }
}