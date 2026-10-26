namespace ImpresionPOS58
{
    partial class Producto1Card
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
            pictureBox = new PictureBox();
            lblNombre = new Label();
            lblPrecio = new Label();
            lblExistencia = new Label();
            btnAgregar = new Button();
            panelInfo = new Panel();
            ((System.ComponentModel.ISupportInitialize)pictureBox).BeginInit();
            panelInfo.SuspendLayout();
            SuspendLayout();
            // 
            // pictureBox
            // 
            pictureBox.Location = new Point(10, 10);
            pictureBox.Name = "pictureBox";
            pictureBox.Size = new Size(80, 80);
            pictureBox.SizeMode = PictureBoxSizeMode.StretchImage;
            pictureBox.TabIndex = 0;
            pictureBox.TabStop = false;
            // 
            // lblNombre
            // 
            lblNombre.AutoSize = true;
            lblNombre.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            lblNombre.Location = new Point(5, 5);
            lblNombre.Name = "lblNombre";
            lblNombre.Size = new Size(65, 19);
            lblNombre.TabIndex = 1;
            lblNombre.Text = "Nombre";
            // 
            // lblPrecio
            // 
            lblPrecio.AutoSize = true;
            lblPrecio.Location = new Point(5, 30);
            lblPrecio.Name = "lblPrecio";
            lblPrecio.Size = new Size(40, 15);
            lblPrecio.TabIndex = 2;
            lblPrecio.Text = "$00.00";
            // 
            // lblExistencia
            // 
            lblExistencia.AutoSize = true;
            lblExistencia.Location = new Point(5, 50);
            lblExistencia.Name = "lblExistencia";
            lblExistencia.Size = new Size(58, 15);
            lblExistencia.TabIndex = 3;
            lblExistencia.Text = "Existencia";
            // 
            // btnAgregar
            // 
            btnAgregar.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            btnAgregar.BackColor = Color.Lime;
            btnAgregar.FlatStyle = FlatStyle.Flat;
            btnAgregar.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            btnAgregar.Location = new Point(300, 25);
            btnAgregar.Name = "btnAgregar";
            btnAgregar.Size = new Size(40, 40);
            btnAgregar.TabIndex = 4;
            btnAgregar.Text = "+";
            btnAgregar.UseVisualStyleBackColor = false;
            btnAgregar.Click += btnAgregar_Click;
            // 
            // panelInfo
            // 
            panelInfo.Controls.Add(lblNombre);
            panelInfo.Controls.Add(lblPrecio);
            panelInfo.Controls.Add(lblExistencia);
            panelInfo.Location = new Point(100, 10);
            panelInfo.Name = "panelInfo";
            panelInfo.Size = new Size(190, 80);
            panelInfo.TabIndex = 5;
            // 
            // Producto1Card
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            Controls.Add(panelInfo);
            Controls.Add(btnAgregar);
            Controls.Add(pictureBox);
            Name = "Producto1Card";
            Size = new Size(360, 100);
            ((System.ComponentModel.ISupportInitialize)pictureBox).EndInit();
            panelInfo.ResumeLayout(false);
            panelInfo.PerformLayout();
            ResumeLayout(false);
        }

        #endregion

        private System.Windows.Forms.PictureBox pictureBox;
        private System.Windows.Forms.Label lblNombre;
        private System.Windows.Forms.Label lblPrecio;
        private System.Windows.Forms.Label lblExistencia;
        private System.Windows.Forms.Button btnAgregar;
        private System.Windows.Forms.Panel panelInfo;
    }
}
