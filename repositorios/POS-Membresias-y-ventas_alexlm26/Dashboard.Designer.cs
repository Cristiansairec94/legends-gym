namespace ImpresionPOS58
{
    partial class Dashboard
    {
        private System.ComponentModel.IContainer components = null;

        private MaterialSkin.Controls.MaterialLabel lblTitulo;
        private MaterialSkin.Controls.MaterialCard cardVentasHoy;
        private MaterialSkin.Controls.MaterialLabel lblVentasHoy;
        private MaterialSkin.Controls.MaterialCard cardVentasSemana;
        private MaterialSkin.Controls.MaterialLabel lblVentasSemana;
        private MaterialSkin.Controls.MaterialCard cardClientesActivos;
        private MaterialSkin.Controls.MaterialLabel lblClientesActivos;
        private MaterialSkin.Controls.MaterialCard cardProductosBajos;
        private MaterialSkin.Controls.MaterialLabel lblProductosBajos;
        private MaterialSkin.Controls.MaterialSwitch switchTema;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
                components.Dispose();
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            this.lblTitulo = new MaterialSkin.Controls.MaterialLabel();
            this.cardVentasHoy = new MaterialSkin.Controls.MaterialCard();
            this.lblVentasHoy = new MaterialSkin.Controls.MaterialLabel();
            this.cardVentasSemana = new MaterialSkin.Controls.MaterialCard();
            this.lblVentasSemana = new MaterialSkin.Controls.MaterialLabel();
            this.cardClientesActivos = new MaterialSkin.Controls.MaterialCard();
            this.lblClientesActivos = new MaterialSkin.Controls.MaterialLabel();
            this.cardProductosBajos = new MaterialSkin.Controls.MaterialCard();
            this.lblProductosBajos = new MaterialSkin.Controls.MaterialLabel();
            this.switchTema = new MaterialSkin.Controls.MaterialSwitch();

            // lblTitulo
            this.lblTitulo.Text = "DASHBOARD CONTABLE";
            this.lblTitulo.Font = new System.Drawing.Font("Roboto", 24F, System.Drawing.FontStyle.Bold);
            this.lblTitulo.Location = new System.Drawing.Point(20, 70);
            this.lblTitulo.Size = new System.Drawing.Size(400, 50);

            // switchTema
            this.switchTema.Text = "MODO OSCURO";
            this.switchTema.Location = new System.Drawing.Point(420, 70);
            this.switchTema.Size = new System.Drawing.Size(160, 30);

            // cardVentasHoy
            this.cardVentasHoy.Controls.Add(this.lblVentasHoy);
            this.cardVentasHoy.Location = new System.Drawing.Point(20, 150);
            this.cardVentasHoy.Size = new System.Drawing.Size(250, 100);

            // lblVentasHoy
            this.lblVentasHoy.Text = "VENTAS HOY: $0";
            this.lblVentasHoy.Location = new System.Drawing.Point(20, 35);
            this.lblVentasHoy.Size = new System.Drawing.Size(200, 30);

            // cardVentasSemana
            this.cardVentasSemana.Controls.Add(this.lblVentasSemana);
            this.cardVentasSemana.Location = new System.Drawing.Point(290, 150);
            this.cardVentasSemana.Size = new System.Drawing.Size(250, 100);

            // lblVentasSemana
            this.lblVentasSemana.Text = "VENTAS SEMANA: $0";
            this.lblVentasSemana.Location = new System.Drawing.Point(20, 35);
            this.lblVentasSemana.Size = new System.Drawing.Size(200, 30);

            // cardClientesActivos
            this.cardClientesActivos.Controls.Add(this.lblClientesActivos);
            this.cardClientesActivos.Location = new System.Drawing.Point(20, 270);
            this.cardClientesActivos.Size = new System.Drawing.Size(250, 100);

            // lblClientesActivos
            this.lblClientesActivos.Text = "CLIENTES ACTIVOS: 0";
            this.lblClientesActivos.Location = new System.Drawing.Point(20, 35);
            this.lblClientesActivos.Size = new System.Drawing.Size(200, 30);

            // cardProductosBajos
            this.cardProductosBajos.Controls.Add(this.lblProductosBajos);
            this.cardProductosBajos.Location = new System.Drawing.Point(290, 270);
            this.cardProductosBajos.Size = new System.Drawing.Size(250, 100);

            // lblProductosBajos
            this.lblProductosBajos.Text = "PRODUCTOS BAJOS: 0";
            this.lblProductosBajos.Location = new System.Drawing.Point(20, 35);
            this.lblProductosBajos.Size = new System.Drawing.Size(200, 30);

            // Dashboard
            this.ClientSize = new System.Drawing.Size(600, 420);
            this.Controls.Add(this.lblTitulo);
            this.Controls.Add(this.cardVentasHoy);
            this.Controls.Add(this.cardVentasSemana);
            this.Controls.Add(this.cardClientesActivos);
            this.Controls.Add(this.cardProductosBajos);
            this.Controls.Add(this.switchTema);
            this.Name = "Dashboard";
            this.Text = "Dashboard Contabilidad";
        }
    }
}
