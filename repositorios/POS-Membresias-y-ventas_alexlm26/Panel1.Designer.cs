namespace ImpresionPOS58
{
    partial class Panel1
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        private void InitializeComponent()
        {
            materialButton1 = new MaterialSkin.Controls.MaterialButton();
            cmbDatos = new MaterialSkin.Controls.MaterialComboBox();
            impDateHasta = new DateTimePicker();
            impDateDesde = new DateTimePicker();
            materialLabel1 = new MaterialSkin.Controls.MaterialLabel();
            materialLabel2 = new MaterialSkin.Controls.MaterialLabel();
            btnMenu = new MaterialSkin.Controls.MaterialButton();
            materialLabel3 = new MaterialSkin.Controls.MaterialLabel();
            materialLabel4 = new MaterialSkin.Controls.MaterialLabel();
            pictureBox1 = new PictureBox();
            dataGridView1 = new DataGridView();
            dataGridView2 = new DataGridView();
            dataGridView3 = new DataGridView();
            dataGridView4 = new DataGridView();
            dateDesde = new DateTimePicker();
            dateHasta = new DateTimePicker();
            materialLabel6 = new MaterialSkin.Controls.MaterialLabel();
            materialLabel7 = new MaterialSkin.Controls.MaterialLabel();
            materialLabel8 = new MaterialSkin.Controls.MaterialLabel();
            materialButton2 = new MaterialSkin.Controls.MaterialButton();
            progressBar1 = new ProgressBar();
            materialButton3 = new MaterialSkin.Controls.MaterialButton();
            materialButton4 = new MaterialSkin.Controls.MaterialButton();
            materialButton5 = new MaterialSkin.Controls.MaterialButton();
            materialLabel9 = new MaterialSkin.Controls.MaterialLabel();
            comboBox1 = new ComboBox();
            button1 = new Button();
            materialLabel10 = new MaterialSkin.Controls.MaterialLabel();
            btnTrimestre = new MaterialSkin.Controls.MaterialButton();
            printMes = new MaterialSkin.Controls.MaterialButton();
            printSemana = new MaterialSkin.Controls.MaterialButton();
            printDia = new MaterialSkin.Controls.MaterialButton();
            btnAbrirPowerBI = new MaterialSkin.Controls.MaterialButton();
            ((System.ComponentModel.ISupportInitialize)pictureBox1).BeginInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView1).BeginInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView2).BeginInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView3).BeginInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView4).BeginInit();
            SuspendLayout();
            // 
            // materialButton1
            // 
            materialButton1.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton1.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton1.Depth = 0;
            materialButton1.HighEmphasis = true;
            materialButton1.Icon = null;
            materialButton1.Location = new Point(655, 104);
            materialButton1.Margin = new Padding(4, 6, 4, 6);
            materialButton1.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton1.Name = "materialButton1";
            materialButton1.NoAccentTextColor = Color.Empty;
            materialButton1.Size = new Size(87, 36);
            materialButton1.TabIndex = 0;
            materialButton1.Text = "IMPRIMIR";
            materialButton1.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton1.UseAccentColor = false;
            materialButton1.UseVisualStyleBackColor = true;
            materialButton1.Click += materialButton1_Click;
            // 
            // cmbDatos
            // 
            cmbDatos.AutoResize = false;
            cmbDatos.BackColor = Color.FromArgb(255, 255, 255);
            cmbDatos.Depth = 0;
            cmbDatos.DrawMode = DrawMode.OwnerDrawVariable;
            cmbDatos.DropDownHeight = 174;
            cmbDatos.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbDatos.DropDownWidth = 121;
            cmbDatos.Font = new Font("Microsoft Sans Serif", 14F, FontStyle.Bold, GraphicsUnit.Pixel);
            cmbDatos.ForeColor = Color.FromArgb(222, 0, 0, 0);
            cmbDatos.FormattingEnabled = true;
            cmbDatos.IntegralHeight = false;
            cmbDatos.ItemHeight = 43;
            cmbDatos.Items.AddRange(new object[] { "TODO", "SESIONES", "PRODUCTOS", "MEMBRESIAS", "GENERADO" });
            cmbDatos.Location = new Point(493, 102);
            cmbDatos.MaxDropDownItems = 4;
            cmbDatos.MouseState = MaterialSkin.MouseState.OUT;
            cmbDatos.Name = "cmbDatos";
            cmbDatos.Size = new Size(155, 49);
            cmbDatos.StartIndex = 0;
            cmbDatos.TabIndex = 2;
            cmbDatos.SelectedIndexChanged += cmbDatos_SelectedIndexChanged;
            // 
            // impDateHasta
            // 
            impDateHasta.Location = new Point(174, 128);
            impDateHasta.MaxDate = new DateTime(2100, 12, 31, 0, 0, 0, 0);
            impDateHasta.Name = "impDateHasta";
            impDateHasta.Size = new Size(313, 23);
            impDateHasta.TabIndex = 3;
            // 
            // impDateDesde
            // 
            impDateDesde.Location = new Point(174, 100);
            impDateDesde.MaxDate = new DateTime(2100, 12, 31, 0, 0, 0, 0);
            impDateDesde.Name = "impDateDesde";
            impDateDesde.Size = new Size(313, 23);
            impDateDesde.TabIndex = 4;
            // 
            // materialLabel1
            // 
            materialLabel1.AutoSize = true;
            materialLabel1.Depth = 0;
            materialLabel1.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel1.Location = new Point(102, 104);
            materialLabel1.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel1.Name = "materialLabel1";
            materialLabel1.Size = new Size(51, 19);
            materialLabel1.TabIndex = 5;
            materialLabel1.Text = "DESDE";
            // 
            // materialLabel2
            // 
            materialLabel2.AutoSize = true;
            materialLabel2.Depth = 0;
            materialLabel2.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel2.Location = new Point(102, 131);
            materialLabel2.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel2.Name = "materialLabel2";
            materialLabel2.Size = new Size(52, 19);
            materialLabel2.TabIndex = 6;
            materialLabel2.Text = "HASTA";
            // 
            // btnMenu
            // 
            btnMenu.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnMenu.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnMenu.Depth = 0;
            btnMenu.HighEmphasis = true;
            btnMenu.Icon = null;
            btnMenu.Location = new Point(7, 27);
            btnMenu.Margin = new Padding(4, 6, 4, 6);
            btnMenu.MouseState = MaterialSkin.MouseState.HOVER;
            btnMenu.Name = "btnMenu";
            btnMenu.NoAccentTextColor = Color.Empty;
            btnMenu.Size = new Size(135, 36);
            btnMenu.TabIndex = 7;
            btnMenu.Text = "MOSTRAR MENU";
            btnMenu.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnMenu.UseAccentColor = false;
            btnMenu.UseVisualStyleBackColor = true;
            btnMenu.Click += btnMenu_Click;
            // 
            // materialLabel3
            // 
            materialLabel3.AutoSize = true;
            materialLabel3.Depth = 0;
            materialLabel3.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel3.Location = new Point(253, 80);
            materialLabel3.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel3.Name = "materialLabel3";
            materialLabel3.Size = new Size(130, 19);
            materialLabel3.TabIndex = 8;
            materialLabel3.Text = "Selecciona fechas";
            // 
            // materialLabel4
            // 
            materialLabel4.AutoSize = true;
            materialLabel4.Depth = 0;
            materialLabel4.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel4.Location = new Point(510, 80);
            materialLabel4.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel4.Name = "materialLabel4";
            materialLabel4.Size = new Size(122, 19);
            materialLabel4.TabIndex = 9;
            materialLabel4.Text = "Selecciona datos";
            // 
            // pictureBox1
            // 
            pictureBox1.Image = Properties.Resources.image_removebg_preview__1_;
            pictureBox1.Location = new Point(27, 80);
            pictureBox1.Name = "pictureBox1";
            pictureBox1.Size = new Size(69, 73);
            pictureBox1.SizeMode = PictureBoxSizeMode.StretchImage;
            pictureBox1.TabIndex = 11;
            pictureBox1.TabStop = false;
            // 
            // dataGridView1
            // 
            dataGridView1.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridView1.Location = new Point(17, 221);
            dataGridView1.Name = "dataGridView1";
            dataGridView1.Size = new Size(488, 218);
            dataGridView1.TabIndex = 12;
            // 
            // dataGridView2
            // 
            dataGridView2.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridView2.Location = new Point(17, 445);
            dataGridView2.Name = "dataGridView2";
            dataGridView2.Size = new Size(488, 289);
            dataGridView2.TabIndex = 13;
            // 
            // dataGridView3
            // 
            dataGridView3.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridView3.Location = new Point(511, 445);
            dataGridView3.Name = "dataGridView3";
            dataGridView3.Size = new Size(587, 289);
            dataGridView3.TabIndex = 14;
            // 
            // dataGridView4
            // 
            dataGridView4.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dataGridView4.Location = new Point(511, 221);
            dataGridView4.Name = "dataGridView4";
            dataGridView4.Size = new Size(587, 218);
            dataGridView4.TabIndex = 15;
            // 
            // dateDesde
            // 
            dateDesde.Location = new Point(176, 185);
            dateDesde.MaxDate = new DateTime(2100, 12, 31, 0, 0, 0, 0);
            dateDesde.Name = "dateDesde";
            dateDesde.Size = new Size(271, 23);
            dateDesde.TabIndex = 17;
            dateDesde.Value = new DateTime(2025, 4, 10, 0, 0, 0, 0);
            // 
            // dateHasta
            // 
            dateHasta.Location = new Point(511, 186);
            dateHasta.MaxDate = new DateTime(2100, 12, 31, 0, 0, 0, 0);
            dateHasta.Name = "dateHasta";
            dateHasta.Size = new Size(279, 23);
            dateHasta.TabIndex = 16;
            // 
            // materialLabel6
            // 
            materialLabel6.AutoSize = true;
            materialLabel6.Depth = 0;
            materialLabel6.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel6.Location = new Point(444, 160);
            materialLabel6.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel6.Name = "materialLabel6";
            materialLabel6.Size = new Size(194, 19);
            materialLabel6.TabIndex = 18;
            materialLabel6.Text = "INFORMACION DE VENTAS";
            // 
            // materialLabel7
            // 
            materialLabel7.AutoSize = true;
            materialLabel7.Depth = 0;
            materialLabel7.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel7.Location = new Point(117, 188);
            materialLabel7.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel7.Name = "materialLabel7";
            materialLabel7.Size = new Size(51, 19);
            materialLabel7.TabIndex = 19;
            materialLabel7.Text = "DESDE";
            // 
            // materialLabel8
            // 
            materialLabel8.AutoSize = true;
            materialLabel8.Depth = 0;
            materialLabel8.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel8.Location = new Point(453, 187);
            materialLabel8.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel8.Name = "materialLabel8";
            materialLabel8.Size = new Size(52, 19);
            materialLabel8.TabIndex = 20;
            materialLabel8.Text = "HASTA";
            // 
            // materialButton2
            // 
            materialButton2.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton2.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton2.Depth = 0;
            materialButton2.HighEmphasis = true;
            materialButton2.Icon = null;
            materialButton2.Location = new Point(796, 179);
            materialButton2.Margin = new Padding(4, 6, 4, 6);
            materialButton2.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton2.Name = "materialButton2";
            materialButton2.NoAccentTextColor = Color.Empty;
            materialButton2.Size = new Size(109, 36);
            materialButton2.TabIndex = 21;
            materialButton2.Text = "Actualizar";
            materialButton2.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton2.UseAccentColor = false;
            materialButton2.UseVisualStyleBackColor = true;
            materialButton2.Click += materialButton2_Click;
            // 
            // progressBar1
            // 
            progressBar1.Location = new Point(998, 33);
            progressBar1.Name = "progressBar1";
            progressBar1.Size = new Size(100, 23);
            progressBar1.TabIndex = 22;
            // 
            // materialButton3
            // 
            materialButton3.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton3.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton3.Depth = 0;
            materialButton3.HighEmphasis = true;
            materialButton3.Icon = null;
            materialButton3.Location = new Point(178, 401);
            materialButton3.Margin = new Padding(4, 6, 4, 6);
            materialButton3.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton3.Name = "materialButton3";
            materialButton3.NoAccentTextColor = Color.Empty;
            materialButton3.Size = new Size(90, 36);
            materialButton3.TabIndex = 23;
            materialButton3.Text = "SESIONES";
            materialButton3.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton3.UseAccentColor = false;
            materialButton3.UseVisualStyleBackColor = true;
            materialButton3.Visible = false;
            // 
            // materialButton4
            // 
            materialButton4.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton4.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton4.Depth = 0;
            materialButton4.HighEmphasis = true;
            materialButton4.Icon = null;
            materialButton4.Location = new Point(275, 401);
            materialButton4.Margin = new Padding(4, 6, 4, 6);
            materialButton4.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton4.Name = "materialButton4";
            materialButton4.NoAccentTextColor = Color.Empty;
            materialButton4.Size = new Size(107, 36);
            materialButton4.TabIndex = 24;
            materialButton4.Text = "PRODUCTOS";
            materialButton4.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton4.UseAccentColor = false;
            materialButton4.UseVisualStyleBackColor = true;
            materialButton4.Visible = false;
            // 
            // materialButton5
            // 
            materialButton5.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            materialButton5.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            materialButton5.Depth = 0;
            materialButton5.HighEmphasis = true;
            materialButton5.Icon = null;
            materialButton5.Location = new Point(390, 401);
            materialButton5.Margin = new Padding(4, 6, 4, 6);
            materialButton5.MouseState = MaterialSkin.MouseState.HOVER;
            materialButton5.Name = "materialButton5";
            materialButton5.NoAccentTextColor = Color.Empty;
            materialButton5.Size = new Size(114, 36);
            materialButton5.TabIndex = 25;
            materialButton5.Text = "MEMBRESIAS";
            materialButton5.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            materialButton5.UseAccentColor = false;
            materialButton5.UseVisualStyleBackColor = true;
            materialButton5.Visible = false;
            // 
            // materialLabel9
            // 
            materialLabel9.AutoSize = true;
            materialLabel9.Depth = 0;
            materialLabel9.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel9.Location = new Point(189, 377);
            materialLabel9.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel9.Name = "materialLabel9";
            materialLabel9.Size = new Size(159, 19);
            materialLabel9.TabIndex = 26;
            materialLabel9.Text = "IMPRIMIR SECCIÓN O ";
            materialLabel9.Visible = false;
            // 
            // comboBox1
            // 
            comboBox1.FormattingEnabled = true;
            comboBox1.Location = new Point(21, 409);
            comboBox1.Name = "comboBox1";
            comboBox1.Size = new Size(150, 23);
            comboBox1.TabIndex = 27;
            comboBox1.Visible = false;
            // 
            // button1
            // 
            button1.Location = new Point(354, 374);
            button1.Name = "button1";
            button1.Size = new Size(133, 23);
            button1.TabIndex = 28;
            button1.Text = "IMPRIMIR TODAS";
            button1.UseVisualStyleBackColor = true;
            button1.Visible = false;
            // 
            // materialLabel10
            // 
            materialLabel10.AutoSize = true;
            materialLabel10.Depth = 0;
            materialLabel10.Font = new Font("Roboto", 14F, FontStyle.Regular, GraphicsUnit.Pixel);
            materialLabel10.Location = new Point(17, 387);
            materialLabel10.MouseState = MaterialSkin.MouseState.HOVER;
            materialLabel10.Name = "materialLabel10";
            materialLabel10.Size = new Size(163, 19);
            materialLabel10.TabIndex = 29;
            materialLabel10.Text = "SELECCIONA USUARIO";
            materialLabel10.Visible = false;
            // 
            // btnTrimestre
            // 
            btnTrimestre.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnTrimestre.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnTrimestre.Depth = 0;
            btnTrimestre.HighEmphasis = true;
            btnTrimestre.Icon = null;
            btnTrimestre.Location = new Point(570, 27);
            btnTrimestre.Margin = new Padding(4, 6, 4, 6);
            btnTrimestre.MouseState = MaterialSkin.MouseState.HOVER;
            btnTrimestre.Name = "btnTrimestre";
            btnTrimestre.NoAccentTextColor = Color.Empty;
            btnTrimestre.Size = new Size(177, 36);
            btnTrimestre.TabIndex = 33;
            btnTrimestre.Text = "Reporte trimestral";
            btnTrimestre.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnTrimestre.UseAccentColor = false;
            btnTrimestre.UseVisualStyleBackColor = true;
            btnTrimestre.Click += btnTrimestre_Click;
            // 
            // printMes
            // 
            printMes.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            printMes.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            printMes.Depth = 0;
            printMes.HighEmphasis = true;
            printMes.Icon = null;
            printMes.Location = new Point(441, 27);
            printMes.Margin = new Padding(4, 6, 4, 6);
            printMes.MouseState = MaterialSkin.MouseState.HOVER;
            printMes.Name = "printMes";
            printMes.NoAccentTextColor = Color.Empty;
            printMes.Size = new Size(121, 36);
            printMes.TabIndex = 32;
            printMes.Text = "Imprimir Mes";
            printMes.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            printMes.UseAccentColor = false;
            printMes.UseVisualStyleBackColor = true;
            printMes.Click += printMes_Click_1;
            // 
            // printSemana
            // 
            printSemana.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            printSemana.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            printSemana.Depth = 0;
            printSemana.HighEmphasis = true;
            printSemana.Icon = null;
            printSemana.Location = new Point(282, 27);
            printSemana.Margin = new Padding(4, 6, 4, 6);
            printSemana.MouseState = MaterialSkin.MouseState.HOVER;
            printSemana.Name = "printSemana";
            printSemana.NoAccentTextColor = Color.Empty;
            printSemana.Size = new Size(151, 36);
            printSemana.TabIndex = 31;
            printSemana.Text = "Imprimir Semana";
            printSemana.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            printSemana.UseAccentColor = false;
            printSemana.UseVisualStyleBackColor = true;
            printSemana.Click += printSemana_Click_1;
            // 
            // printDia
            // 
            printDia.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            printDia.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            printDia.Depth = 0;
            printDia.HighEmphasis = true;
            printDia.Icon = null;
            printDia.Location = new Point(160, 27);
            printDia.Margin = new Padding(4, 6, 4, 6);
            printDia.MouseState = MaterialSkin.MouseState.HOVER;
            printDia.Name = "printDia";
            printDia.NoAccentTextColor = Color.Empty;
            printDia.Size = new Size(114, 36);
            printDia.TabIndex = 30;
            printDia.Text = "Imprimir Dia";
            printDia.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            printDia.UseAccentColor = false;
            printDia.UseVisualStyleBackColor = true;
            printDia.Click += printDia_Click_1;
            // 
            // btnAbrirPowerBI
            // 
            btnAbrirPowerBI.AutoSizeMode = AutoSizeMode.GrowAndShrink;
            btnAbrirPowerBI.Density = MaterialSkin.Controls.MaterialButton.MaterialButtonDensity.Default;
            btnAbrirPowerBI.Depth = 0;
            btnAbrirPowerBI.HighEmphasis = true;
            btnAbrirPowerBI.Icon = null;
            btnAbrirPowerBI.Location = new Point(914, 114);
            btnAbrirPowerBI.Margin = new Padding(4, 6, 4, 6);
            btnAbrirPowerBI.MouseState = MaterialSkin.MouseState.HOVER;
            btnAbrirPowerBI.Name = "btnAbrirPowerBI";
            btnAbrirPowerBI.NoAccentTextColor = Color.Empty;
            btnAbrirPowerBI.Size = new Size(163, 36);
            btnAbrirPowerBI.TabIndex = 34;
            btnAbrirPowerBI.Text = "Mostrar graficas";
            btnAbrirPowerBI.Type = MaterialSkin.Controls.MaterialButton.MaterialButtonType.Contained;
            btnAbrirPowerBI.UseAccentColor = false;
            btnAbrirPowerBI.UseVisualStyleBackColor = true;
            btnAbrirPowerBI.Click += btnAbrirPowerBI_Click;
            // 
            // Panel1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1104, 740);
            Controls.Add(btnAbrirPowerBI);
            Controls.Add(btnTrimestre);
            Controls.Add(printMes);
            Controls.Add(printSemana);
            Controls.Add(printDia);
            Controls.Add(materialLabel10);
            Controls.Add(button1);
            Controls.Add(comboBox1);
            Controls.Add(materialLabel9);
            Controls.Add(materialButton5);
            Controls.Add(materialButton4);
            Controls.Add(materialButton3);
            Controls.Add(progressBar1);
            Controls.Add(materialButton2);
            Controls.Add(materialLabel8);
            Controls.Add(materialLabel7);
            Controls.Add(materialLabel6);
            Controls.Add(dateDesde);
            Controls.Add(dateHasta);
            Controls.Add(dataGridView4);
            Controls.Add(dataGridView3);
            Controls.Add(dataGridView2);
            Controls.Add(dataGridView1);
            Controls.Add(pictureBox1);
            Controls.Add(materialLabel4);
            Controls.Add(materialLabel3);
            Controls.Add(btnMenu);
            Controls.Add(materialLabel2);
            Controls.Add(materialLabel1);
            Controls.Add(impDateDesde);
            Controls.Add(impDateHasta);
            Controls.Add(cmbDatos);
            Controls.Add(materialButton1);
            Name = "Panel1";
            Text = "PANEL";
            Load += Panel_Load;
            ((System.ComponentModel.ISupportInitialize)pictureBox1).EndInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView1).EndInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView2).EndInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView3).EndInit();
            ((System.ComponentModel.ISupportInitialize)dataGridView4).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private MaterialSkin.Controls.MaterialButton materialButton1;
        private MaterialSkin.Controls.MaterialComboBox cmbDatos;
        private System.Windows.Forms.DateTimePicker impDateHasta;
        private System.Windows.Forms.DateTimePicker impDateDesde;
        private MaterialSkin.Controls.MaterialLabel materialLabel1;
        private MaterialSkin.Controls.MaterialLabel materialLabel2;
        private MaterialSkin.Controls.MaterialButton btnMenu;
        private MaterialSkin.Controls.MaterialLabel materialLabel3;
        private MaterialSkin.Controls.MaterialLabel materialLabel4;
        private PictureBox pictureBox1;
        private DataGridView dataGridView1;
        private DataGridView dataGridView2;
        private DataGridView dataGridView3;
        private DataGridView dataGridView4;
        private DateTimePicker dateDesde;
        private DateTimePicker dateHasta;
        private MaterialSkin.Controls.MaterialLabel materialLabel6;
        private MaterialSkin.Controls.MaterialLabel materialLabel7;
        private MaterialSkin.Controls.MaterialLabel materialLabel8;
        private MaterialSkin.Controls.MaterialButton materialButton2;
        private ProgressBar progressBar1;
        private MaterialSkin.Controls.MaterialButton materialButton3;
        private MaterialSkin.Controls.MaterialButton materialButton4;
        private MaterialSkin.Controls.MaterialButton materialButton5;
        private MaterialSkin.Controls.MaterialLabel materialLabel9;
        private ComboBox comboBox1;
        private Button button1;
        private MaterialSkin.Controls.MaterialLabel materialLabel10;
        private MaterialSkin.Controls.MaterialButton btnTrimestre;
        private MaterialSkin.Controls.MaterialButton printMes;
        private MaterialSkin.Controls.MaterialButton printSemana;
        private MaterialSkin.Controls.MaterialButton printDia;
        private MaterialSkin.Controls.MaterialButton btnAbrirPowerBI;
    }
}
