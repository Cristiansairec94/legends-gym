namespace ImpresionPOS58
{
    partial class Form1
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
            components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form1));
            flowLayoutPanel1 = new FlowLayoutPanel();
            btnMembresias = new MaterialSkin.Controls.MaterialButton();
            flowLayoutPanel2 = new FlowLayoutPanel();
            btnContabilidad = new MaterialSkin.Controls.MaterialButton();
            materialButton5 = new MaterialSkin.Controls.MaterialButton();
            txtBuscador = new MaterialSkin.Controls.MaterialTextBox();
            flowLayoutPanel3 = new FlowLayoutPanel();
            label2 = new Label();
            pictureBox2 = new PictureBox();
            timer1 = new System.Windows.Forms.Timer(components);
            materialSwitch1 = new MaterialSkin.Controls.MaterialSwitch();
            materialLabel1 = new MaterialSkin.Controls.MaterialLabel();
            materialLabel2 = new MaterialSkin.Controls.MaterialLabel();
            btnInventario = new MaterialSkin.Controls.MaterialButton();
            materialTextBox1 = new MaterialSkin.Controls.MaterialTextBox();
            materialLabel3 = new MaterialSkin.Controls.MaterialLabel();
            materialButton1 = new MaterialSkin.Controls.MaterialButton();
            timer2 = new System.Windows.Forms.Timer(components);
            lbltotal = new MaterialSkin.Controls.MaterialLabel();
            materialButton2 = new MaterialSkin.Controls.MaterialButton();
            materialButton3 = new MaterialSkin.Controls.MaterialButton();
            materialButton4 = new MaterialSkin.Controls.MaterialButton();
            materialButton6 = new MaterialSkin.Controls.MaterialButton();
            ((System.ComponentModel.ISupportInitialize)pictureBox2).BeginInit();
            SuspendLayout();
            // 
            // flowLayoutPanel1
            // 
            flowLayoutPanel1.AutoScroll = true;
            flowLayoutPanel1.BackColor = Color.FromArgb(30, 30, 30);
            flowLayoutPanel1.FlowDirection = FlowDirection.TopDown;
            flowLayoutPanel1.Location = new Point(7, 69);
            flowLayoutPanel1.Name = "flowLayoutPanel1";
            flowLayoutPanel1.Size = new Size(933, 550);
            flowLayoutPanel1.TabIndex = 12;
            flowLayoutPanel1.WrapContents = false;
            // 
            // btnMembresias
            // 
            btnMembresias.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnMembresias.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnMembresias.Depth = 0;
            btnMembresias.HighEmphasis = true;
            btnMembresias.Icon = null;
            btnMembresias.Location = new Point(198, 24);
            btnMembresias.Margin = new Padding(4, 6, 4, 6);
            btnMembresias.MouseState = MaterialSkin.MouseState.HOVER;
            btnMembresias.Name = "btnMembresias";
            btnMembresias.NoAccentTextColor = Color.Empty;
            btnMembresias.Size = new Size(114, 36);
            btnMembresias.TabIndex = 4;
            btnMembresias.Text = "MEMBRESIAS";
            btnMembresias.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnMembresias.UseAccentColor = false;
            btnMembresias.UseVisualStyleBackColor = true;
            btnMembresias.Click += btnMembresias_Click;
            // 
            // flowLayoutPanel2
            // 
            flowLayoutPanel2.Location = new Point(6, 379);
            flowLayoutPanel2.Name = "flowLayoutPanel2";
            flowLayoutPanel2.Size = new Size(640, 100);
            flowLayoutPanel2.TabIndex = 0;
            // 
            // btnContabilidad
            // 
            btnContabilidad.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnContabilidad.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnContabilidad.Depth = 0;
            btnContabilidad.HighEmphasis = true;
            btnContabilidad.Icon = null;
            btnContabilidad.Location = new Point(155, 628);
            btnContabilidad.Margin = new Padding(4, 6, 4, 6);
            btnContabilidad.MouseState = MaterialSkin.MouseState.HOVER;
            btnContabilidad.Name = "btnContabilidad";
            btnContabilidad.NoAccentTextColor = Color.Empty;
            btnContabilidad.Size = new Size(137, 36);
            btnContabilidad.TabIndex = 3;
            btnContabilidad.Text = "IMPRIMIR CORTE";
            btnContabilidad.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnContabilidad.UseAccentColor = false;
            btnContabilidad.UseVisualStyleBackColor = true;
            btnContabilidad.Click += btnContabilidad_Click;
            // 
            // materialButton5
            // 
            materialButton5.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton5.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton5.Depth = 0;
            materialButton5.HighEmphasis = true;
            materialButton5.Icon = null;
            materialButton5.Location = new Point(776, 663);
            materialButton5.Margin = new Padding(4, 6, 4, 6);
            materialButton5.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton5.Name = "materialButton5";
            materialButton5.NoAccentTextColor = Color.Empty;
            materialButton5.Size = new Size(139, 36);
            materialButton5.TabIndex = 5;
            materialButton5.Text = "REALIZAR VENTA";
            materialButton5.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton5.UseAccentColor = false;
            materialButton5.UseVisualStyleBackColor = true;
            materialButton5.Click += materialButton5_Click;
            // 
            // txtBuscador
            // 
            txtBuscador.AnimateReadOnly = false;
            txtBuscador.BorderStyle = BorderStyle.None;
            txtBuscador.Depth = 0;
            txtBuscador.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            txtBuscador.Hint = "Buscar producto";
            txtBuscador.LeadingIcon = null;
            txtBuscador.Location = new Point(946, 69);
            txtBuscador.MaxLength = 50;
            txtBuscador.MouseState = MaterialSkin.MouseState.OUT;
            txtBuscador.Multiline = false;
            txtBuscador.Name = "txtBuscador";
            txtBuscador.Size = new Size(419, 50);
            txtBuscador.TabIndex = 7;
            txtBuscador.Text = "";
            txtBuscador.TrailingIcon = null;
            txtBuscador.TextChanged += txtBuscador_TextChanged;
            txtBuscador.KeyPress += txtBuscador_KeyPress;
            // 
            // flowLayoutPanel3
            // 
            flowLayoutPanel3.AutoScroll = true;
            flowLayoutPanel3.FlowDirection = FlowDirection.TopDown;
            flowLayoutPanel3.Location = new Point(946, 125);
            flowLayoutPanel3.Name = "flowLayoutPanel3";
            flowLayoutPanel3.Size = new Size(419, 591);
            flowLayoutPanel3.TabIndex = 1;
            flowLayoutPanel3.WrapContents = false;
            // 
            // label2
            // 
            label2.AutoSize = true;
            label2.BackColor = Color.Transparent;
            label2.ForeColor = Color.White;
            label2.Location = new Point(1144, 35);
            label2.Name = "label2";
            label2.Size = new Size(156, 15);
            label2.TabIndex = 15;
            label2.Text = "Cerrar Sesion / Corte de caja";
            label2.Visible = false;
            label2.Click += label2_Click;
            // 
            // pictureBox2
            // 
            pictureBox2.BackColor = Color.Transparent;
            pictureBox2.Image = Properties.Resources.Untitled_1;
            pictureBox2.Location = new Point(1306, 24);
            pictureBox2.Name = "pictureBox2";
            pictureBox2.Size = new Size(39, 36);
            pictureBox2.SizeMode = PictureBoxSizeMode.StretchImage;
            pictureBox2.TabIndex = 14;
            pictureBox2.TabStop = false;
            pictureBox2.Visible = false;
            pictureBox2.Click += pictureBox2_Click;
            pictureBox2.MouseEnter += pictureBox2_MouseEnter;
            pictureBox2.MouseLeave += pictureBox2_MouseLeave;
            // 
            // timer1
            // 
            timer1.Enabled = true;
            timer1.Tick += timer1_Tick;
            // 
            // materialSwitch1
            // 
            materialSwitch1.AutoSize = true;
            materialSwitch1.Depth = 0;
            materialSwitch1.Location = new Point(819, 622);
            materialSwitch1.Margin = new Padding(0);
            materialSwitch1.MouseLocation = new Point(-1, -1);
            materialSwitch1.MouseState = MaterialSkin.MouseState.HOVER;
            materialSwitch1.Name = "materialSwitch1";
            materialSwitch1.Ripple = true;
            materialSwitch1.Size = new Size(58, 37);
            materialSwitch1.TabIndex = 9;
            materialSwitch1.UseVisualStyleBackColor = true;
            materialSwitch1.CheckedChanged += materialSwitch1_CheckedChanged;
            // 
            // materialLabel1
            // 
            materialLabel1.AutoSize = true;
            materialLabel1.Depth = 0;
            materialLabel1.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel1.Location = new Point(742, 631);
            materialLabel1.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel1.Name = "materialLabel1";
            materialLabel1.Size = new Size(58, 19);
            materialLabel1.TabIndex = 10;
            materialLabel1.Text = "Efectivo";
            // 
            // materialLabel2
            // 
            materialLabel2.AutoSize = true;
            materialLabel2.Depth = 0;
            materialLabel2.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel2.Location = new Point(892, 631);
            materialLabel2.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel2.Name = "materialLabel2";
            materialLabel2.Size = new Size(51, 19);
            materialLabel2.TabIndex = 11;
            materialLabel2.Text = "Tarjeta";
            // 
            // btnInventario
            // 
            btnInventario.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnInventario.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnInventario.Depth = 0;
            btnInventario.HighEmphasis = true;
            btnInventario.Icon = null;
            btnInventario.Location = new Point(320, 24);
            btnInventario.Margin = new Padding(4, 6, 4, 6);
            btnInventario.MouseState = MaterialSkin.MouseState.HOVER;
            btnInventario.Name = "btnInventario";
            btnInventario.NoAccentTextColor = Color.Empty;
            btnInventario.Size = new Size(107, 36);
            btnInventario.TabIndex = 2;
            btnInventario.Text = "INVENTARIO";
            btnInventario.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnInventario.UseAccentColor = false;
            btnInventario.UseVisualStyleBackColor = true;
            btnInventario.Click += btnInventario_Click;
            // 
            // materialTextBox1
            // 
            materialTextBox1.AnimateReadOnly = false;
            materialTextBox1.BorderStyle = BorderStyle.None;
            materialTextBox1.Depth = 0;
            materialTextBox1.Font = new Font("Roboto", 16F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialTextBox1.LeadingIcon = null;
            materialTextBox1.Location = new Point(10, 628);
            materialTextBox1.MaxLength = 50;
            materialTextBox1.MouseState = MaterialSkin.MouseState.OUT;
            materialTextBox1.Multiline = false;
            materialTextBox1.Name = "materialTextBox1";
            materialTextBox1.Size = new Size(138, 50);
            materialTextBox1.TabIndex = 17;
            materialTextBox1.Text = "";
            materialTextBox1.TrailingIcon = null;
            // 
            // materialLabel3
            // 
            materialLabel3.AutoSize = true;
            materialLabel3.Depth = 0;
            materialLabel3.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel3.Location = new Point(155, 670);
            materialLabel3.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel3.Name = "materialLabel3";
            materialLabel3.Size = new Size(107, 19);
            materialLabel3.TabIndex = 18;
            materialLabel3.Text = "materialLabel3";
            // 
            // materialButton1
            // 
            materialButton1.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton1.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton1.Depth = 0;
            materialButton1.HighEmphasis = true;
            materialButton1.Icon = null;
            materialButton1.Location = new Point(435, 24);
            materialButton1.Margin = new Padding(4, 6, 4, 6);
            materialButton1.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton1.Name = "materialButton1";
            materialButton1.NoAccentTextColor = Color.Empty;
            materialButton1.Size = new Size(108, 36);
            materialButton1.TabIndex = 19;
            materialButton1.Text = "DASHBOARD";
            materialButton1.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton1.UseAccentColor = false;
            materialButton1.UseVisualStyleBackColor = true;
            materialButton1.Click += materialButton1_Click;
            // 
            // timer2
            // 
            timer2.Enabled = true;
            timer2.Interval = 1000;
            timer2.Tick += timer2_Tick;
            // 
            // lbltotal
            // 
            lbltotal.AutoSize = true;
            lbltotal.Depth = 0;
            lbltotal.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            lbltotal.Location = new Point(448, 645);
            lbltotal.MouseState = MaterialSkin.MouseState.HOVER;
            lbltotal.Name = "lbltotal";
            lbltotal.Size = new Size(107, 19);
            lbltotal.TabIndex = 24;
            lbltotal.Text = "materialLabel4";
            // 
            // materialButton2
            // 
            materialButton2.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton2.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton2.Depth = 0;
            materialButton2.HighEmphasis = true;
            materialButton2.Icon = null;
            materialButton2.Location = new Point(668, 24);
            materialButton2.Margin = new Padding(4, 6, 4, 6);
            materialButton2.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton2.Name = "materialButton2";
            materialButton2.NoAccentTextColor = Color.Empty;
            materialButton2.Size = new Size(133, 36);
            materialButton2.TabIndex = 25;
            materialButton2.Text = "ABRIR PUERTA 1";
            materialButton2.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton2.UseAccentColor = false;
            materialButton2.UseVisualStyleBackColor = true;
            materialButton2.Click += materialButton2_Click;
            // 
            // materialButton3
            // 
            materialButton3.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton3.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton3.Depth = 0;
            materialButton3.HighEmphasis = true;
            materialButton3.Icon = null;
            materialButton3.Location = new Point(806, 24);
            materialButton3.Margin = new Padding(4, 6, 4, 6);
            materialButton3.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton3.Name = "materialButton3";
            materialButton3.NoAccentTextColor = Color.Empty;
            materialButton3.Size = new Size(133, 36);
            materialButton3.TabIndex = 26;
            materialButton3.Text = "ABRIR PUERTA 2";
            materialButton3.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton3.UseAccentColor = false;
            materialButton3.UseVisualStyleBackColor = true;
            materialButton3.Click += materialButton3_Click;
            // 
            // materialButton4
            // 
            materialButton4.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton4.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton4.Depth = 0;
            materialButton4.HighEmphasis = true;
            materialButton4.Icon = null;
            materialButton4.Location = new Point(1212, 725);
            materialButton4.Margin = new Padding(4, 6, 4, 6);
            materialButton4.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton4.Name = "materialButton4";
            materialButton4.NoAccentTextColor = Color.Empty;
            materialButton4.Size = new Size(143, 36);
            materialButton4.TabIndex = 27;
            materialButton4.Text = "ULTIMAS VENTAS";
            materialButton4.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton4.UseAccentColor = false;
            materialButton4.UseVisualStyleBackColor = true;
            materialButton4.Click += materialButton4_Click;
            // 
            // materialButton6
            // 
            materialButton6.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton6.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton6.Depth = 0;
            materialButton6.HighEmphasis = true;
            materialButton6.Icon = null;
            materialButton6.Location = new Point(956, 725);
            materialButton6.Margin = new Padding(4, 6, 4, 6);
            materialButton6.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton6.Name = "materialButton6";
            materialButton6.NoAccentTextColor = Color.Empty;
            materialButton6.Size = new Size(180, 36);
            materialButton6.TabIndex = 28;
            materialButton6.Text = "ULTIMAS MEMBRESIAS";
            materialButton6.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton6.UseAccentColor = false;
            materialButton6.UseVisualStyleBackColor = true;
            materialButton6.Click += materialButton6_Click;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1386, 788);
            Controls.Add(materialButton6);
            Controls.Add(materialButton4);
            Controls.Add(materialButton3);
            Controls.Add(materialButton2);
            Controls.Add(lbltotal);
            Controls.Add(materialButton1);
            Controls.Add(materialLabel3);
            Controls.Add(materialTextBox1);
            Controls.Add(label2);
            Controls.Add(btnMembresias);
            Controls.Add(pictureBox2);
            Controls.Add(btnInventario);
            Controls.Add(materialLabel2);
            Controls.Add(materialLabel1);
            Controls.Add(materialSwitch1);
            Controls.Add(flowLayoutPanel3);
            Controls.Add(txtBuscador);
            Controls.Add(materialButton5);
            Controls.Add(btnContabilidad);
            Controls.Add(flowLayoutPanel1);
            Icon = (Icon)resources.GetObject("$this.Icon");
            Name = "Form1";
            Text = "MENU PRINCIPAL";
            FormClosing += Form1_FormClosing;
            Load += Form1_Load_2;
            ((System.ComponentModel.ISupportInitialize)pictureBox2).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private FlowLayoutPanel flowLayoutPanel1;
        private FlowLayoutPanel flowLayoutPanel2;
        private MaterialSkin.Controls.MaterialButton btnContabilidad;
        private MaterialSkin.Controls.MaterialButton materialButton5;
        private MaterialSkin.Controls.MaterialTextBox txtBuscador;
        private FlowLayoutPanel flowLayoutPanel3;
        private System.Windows.Forms.Timer timer1;
        private MaterialSkin.Controls.MaterialSwitch materialSwitch1;
        private MaterialSkin.Controls.MaterialLabel materialLabel1;
        private MaterialSkin.Controls.MaterialLabel materialLabel2;
        private System.Windows.Forms.Timer buscadorTimer;
        private MaterialSkin.Controls.MaterialButton btnMembresias;
        private Label label2;
        private PictureBox pictureBox2;
        private MaterialSkin.Controls.MaterialButton btnInventario;
        private MaterialSkin.Controls.MaterialTextBox materialTextBox1;
        private MaterialSkin.Controls.MaterialLabel materialLabel3;
        private MaterialSkin.Controls.MaterialButton materialButton1;
        private System.Windows.Forms.Timer timer2;
        private MaterialSkin.Controls.MaterialLabel lbltotal;
        private MaterialSkin.Controls.MaterialButton materialButton2;
        private MaterialSkin.Controls.MaterialButton materialButton3;
        private MaterialSkin.Controls.MaterialButton materialButton4;
        private MaterialSkin.Controls.MaterialButton materialButton6;
    }
}