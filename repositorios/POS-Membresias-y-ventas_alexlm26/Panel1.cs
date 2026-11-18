using ImpresionPOS58.DAOs;
using MaterialSkin;
using ImpresionPOS58.REPORTES;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using ImpresionPOS58.DAO;
using static System.Windows.Forms.VisualStyles.VisualStyleElement;
using ImpresionPOS58.OBJETOS;
using System.Drawing.Printing;
using Microsoft.VisualBasic.ApplicationServices;

namespace ImpresionPOS58
{
    public partial class Panel1 : MaterialSkin.Controls.MaterialForm
    {
        private Image ConvertToBlackAndWhite(Image originalImage)
        {
            // Crear un objeto Bitmap con la imagen original
            Bitmap bmp = new Bitmap(originalImage);

            // Recorrer cada píxel de la imagen
            for (int y = 0; y < bmp.Height; y++)
            {
                for (int x = 0; x < bmp.Width; x++)
                {
                    // Obtener el color del píxel
                    Color pixelColor = bmp.GetPixel(x, y);

                    // Calcular el brillo del píxel (promediando los valores de los componentes RGB)
                    int brightness = (int)(pixelColor.R * 0.3 + pixelColor.G * 0.59 + pixelColor.B * 0.11);

                    // Si el brillo es mayor que 128, hacer el píxel blanco, sino negro
                    Color newColor = brightness > 128 ? Color.White : Color.Black;

                    // Establecer el nuevo color en el píxel
                    bmp.SetPixel(x, y, newColor);
                }
            }

            return bmp;
        }
        public Panel1()
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
            menuVisible = !menuVisible;

            btnMenu.Text = "Ocultar menu";
            ConfigurarDataGrids();
            LlenarComboBoxUsuarios();

            ToggleMenu();

        }
        private bool menuVisible = false;

        private void ToggleMenu()
        {
            cmbDatos.Visible = menuVisible;
            impDateDesde.Visible = menuVisible;
            impDateHasta.Visible = menuVisible;
            materialLabel1.Visible = menuVisible;
            materialLabel2.Visible = menuVisible;
            materialButton1.Visible = menuVisible;
            materialLabel4.Visible = menuVisible;
            materialLabel3.Visible = menuVisible;
            materialLabel2.Visible = menuVisible;
            materialLabel1.Visible = menuVisible;
            pictureBox1.Visible = menuVisible;
        }

        private void btnMenu_Click(object sender, EventArgs e)
        {
            menuVisible = !menuVisible;
            if (menuVisible == false)
            {
                btnMenu.Text = "Mostrar menu";
            }
            else
            {
                btnMenu.Text = "Ocultar menu";
            }
            ToggleMenu();
        }

        private void Panel_Load(object sender, EventArgs e)
        {
            ToggleMenu(); // OCULTA AL INICIO

            ToggleMenu(); // OCULTA AL INICIO
            cmbDatos.SelectedIndex = 0;
            // DEFINE FECHA MINIMA Y MAXIMA
            DateTime fechaMinima = new DateTime(2025, 4, 7);
            DateTime fechaMaxima = DateTime.Today;

            impDateDesde.MinDate = fechaMinima;
            impDateDesde.MaxDate = fechaMaxima;
            impDateDesde.Value = fechaMaxima;
            impDateHasta.MinDate = fechaMinima;
            impDateHasta.MaxDate = fechaMaxima;
            impDateHasta.Value = fechaMaxima;


            dateDesde.MinDate = fechaMinima;
            dateDesde.MaxDate = fechaMaxima;
            dateDesde.Value = fechaMaxima.AddDays(-7);
            dateHasta.MinDate = fechaMinima;
            dateHasta.MaxDate = fechaMaxima;
            dateHasta.Value = fechaMaxima;
            materialButton2_Click(sender, e);
            LlenarComboBoxUsuarios();
        }
        private void LlenarComboBoxUsuarios()
        {
            var dao = new UsuarioDAO(); // O EL DAO CORRECTO
            List<Usuario> usuarios = dao.ObtenerTodos();

            if (usuarios != null && usuarios.Count > 0)
            {
                comboBox1.DataSource = usuarios;
                comboBox1.DisplayMember = "username"; // LO QUE SE VE
                comboBox1.ValueMember = "IdUsuario";        // EL VALOR REAL
            }
            else
            {
                comboBox1.DataSource = null;
            }
        }

        private async void materialButton2_Click(object sender, EventArgs e)
        {
            DateTime desde = dateDesde.Value.Date;
            DateTime hasta = dateHasta.Value.Date;

            progressBar1.Value = 0;
            progressBar1.Maximum = 4;

            await CargarDatosAsync(desde, hasta);
        }


        public async Task CargarDatosAsync(DateTime desde, DateTime hasta)
        {
            desde = new DateTime(desde.Year, desde.Month, desde.Day, 0, 0, 0);
            hasta = new DateTime(hasta.Year, hasta.Month, hasta.Day, 23, 59, 59);

            var dao = new ReporteSesionDAO();

            // PRIMER PASO
            await Task.Run(() =>
            {
                var totales = dao.ObtenerTotalesPorEmpleadoDesdeHasta(desde, hasta);
                Invoke(new Action(() =>
                {
                    dataGridView1.DataSource = totales;
                    progressBar1.Value += 1;
                }));
            });

            // SEGUNDO PASO
            await Task.Run(() =>
            {
                var productos = dao.ObtenerProductosVendidosPorSesionDesdeHasta(desde, hasta);
                Invoke(new Action(() =>
                {
                    dataGridView2.DataSource = productos;
                    progressBar1.Value += 1;
                }));
            });

            // TERCER PASO
            await Task.Run(() =>
            {
                var membresias = dao.ObtenerMembresiasVendidasPorSesionDesdeHasta(desde, hasta);
                Invoke(new Action(() =>
                {
                    dataGridView3.DataSource = membresias;
                    progressBar1.Value += 1;
                }));
            });

            // CUARTO PASO
            await Task.Run(() =>
            {
                var sesiones = dao.ObtenerSesionesDesdeHasta(desde, hasta);
                Invoke(new Action(() =>
                {
                    dataGridView4.DataSource = sesiones;
                    progressBar1.Value += 1;
                }));
            });

            // OPCIONAL MENSAJE DE COMPLETADO
            // MessageBox.Show("DATOS CARGADOS COMPLETAMENTE 🚀📊");
        }

        // CONFIGURACION GENERAL PARA DATA GRID VIEWS
        void ConfigurarDataGrids()
        {
            // DATA GRID VIEW 1
            dataGridView1.BackgroundColor = Color.Black;
            dataGridView1.ForeColor = Color.White;
            dataGridView1.GridColor = Color.White;
            dataGridView1.ColumnHeadersDefaultCellStyle.BackColor = Color.Black;
            dataGridView1.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dataGridView1.DefaultCellStyle.BackColor = Color.Black;
            dataGridView1.DefaultCellStyle.ForeColor = Color.White;
            dataGridView1.DefaultCellStyle.SelectionBackColor = Color.DarkGray;
            dataGridView1.DefaultCellStyle.SelectionForeColor = Color.Black;
            dataGridView1.EnableHeadersVisualStyles = false;

            // DATA GRID VIEW 2
            dataGridView2.BackgroundColor = Color.Black;
            dataGridView2.ForeColor = Color.White;
            dataGridView2.GridColor = Color.White;
            dataGridView2.ColumnHeadersDefaultCellStyle.BackColor = Color.Black;
            dataGridView2.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dataGridView2.DefaultCellStyle.BackColor = Color.Black;
            dataGridView2.DefaultCellStyle.ForeColor = Color.White;
            dataGridView2.DefaultCellStyle.SelectionBackColor = Color.DarkGray;
            dataGridView2.DefaultCellStyle.SelectionForeColor = Color.Black;
            dataGridView2.EnableHeadersVisualStyles = false;

            // DATA GRID VIEW 3
            dataGridView3.BackgroundColor = Color.Black;
            dataGridView3.ForeColor = Color.White;
            dataGridView3.GridColor = Color.White;
            dataGridView3.ColumnHeadersDefaultCellStyle.BackColor = Color.Black;
            dataGridView3.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dataGridView3.DefaultCellStyle.BackColor = Color.Black;
            dataGridView3.DefaultCellStyle.ForeColor = Color.White;
            dataGridView3.DefaultCellStyle.SelectionBackColor = Color.DarkGray;
            dataGridView3.DefaultCellStyle.SelectionForeColor = Color.Black;
            dataGridView3.EnableHeadersVisualStyles = false;

            // DATA GRID VIEW 4
            dataGridView4.BackgroundColor = Color.Black;
            dataGridView4.ForeColor = Color.White;
            dataGridView4.GridColor = Color.White;
            dataGridView4.ColumnHeadersDefaultCellStyle.BackColor = Color.Black;
            dataGridView4.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
            dataGridView4.DefaultCellStyle.BackColor = Color.Black;
            dataGridView4.DefaultCellStyle.ForeColor = Color.White;
            dataGridView4.DefaultCellStyle.SelectionBackColor = Color.DarkGray;
            dataGridView4.DefaultCellStyle.SelectionForeColor = Color.Black;
            dataGridView4.EnableHeadersVisualStyles = false;
        }
        private void printMes_Click(object sender, EventArgs e)
        {
            PrintDocument printDoc = new PrintDocument();
            printDoc.PrintPage += new PrintPageEventHandler((sender2, e2) => PrintReportePeriodo(sender2, e2, DateTime.Today, -30));
            printDoc.PrinterSettings.PrinterName = "POS-58"; // CAMBIA EL NOMBRE DE LA IMPRESORA SI ES NECESARIO 🖨️

            printDoc.Print();
            MessageBox.Show("IMPRESION EXITOSA ✅", "LISTO", MessageBoxButtons.OK, MessageBoxIcon.Information);

        }

        private void PrintReportePeriodo(object sender, PrintPageEventArgs e, DateTime dia, int menos)
        {

            Graphics g = e.Graphics;
            Font font = new Font("Consolas", 8);
            Font fontxN = new Font("Consolas", 5);
            Font fontN2 = new Font("Consolas", 4);
            Font fontN = new Font("Consolas", 6);
            Font fontN1 = new Font("Consolas", 7);
            float y = 0;
            Image logo = Image.FromFile("graficos/logo 1bit.png");
            logo = ConvertToBlackAndWhite(logo);
            int newWidth = logo.Width / 2;
            int newHeight = logo.Height / 2;
            float x = (e.PageBounds.Width - newWidth) / 2;
            float logoY = y + 8;
            g.DrawImage(logo, x, logoY, newWidth, newHeight);
            y = logoY + newHeight + 10;
            g.DrawString("Instagram: @ego_integral", fontxN, Brushes.Black, 0, y); y += 8;
            g.DrawString("Facebook: EGO Integral Fitness", fontxN, Brushes.Black, 0, y); y += 10;

            g.DrawString("================================", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--- REPORTE DE PERIODO ---", fontN1, Brushes.Black, 0, y); y += 12;

            DateTime desde = dia.AddDays(menos);
            DateTime hasta = dia;

            g.DrawString($"{desde.ToShortDateString()} - {hasta.ToShortDateString()}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            ReporteSesionDAO dao = new ReporteSesionDAO();

            g.DrawString("SESIONES REALIZADAS", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("-------------------------------", font, Brushes.Black, 0, y); y += 10;

            var sesiones = dao.ObtenerSesionesDesdeHasta(desde, hasta);
            int visitasTotales = 0;
            int s = 1;
            foreach (var sesion in sesiones)
            {
                g.DrawString($"{s}. SESION: {sesion.sesion}, USUARIO: {sesion.NombreUsuario},", fontN2, Brushes.Black, 0, y); y += 10;
                g.DrawString($" MEMBRESIAS: ${sesion.TotalMembresias:F2}, PRODUCTOS: ${sesion.TotalProductos:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                s++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("PRODUCTOS VENDIDOS", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            var productos = dao.ObtenerProductosVendidosPorSesionDesdeHasta(desde, hasta);
            int p = 1;
            foreach (var prod in productos)
            {
                g.DrawString($"{p}. {prod.NombreProducto} X {prod.CantidadVendida} = ${prod.Total:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                p++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("MEMBRESIAS VENDIDAS", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            var membresias = dao.ObtenerMembresiasVendidasPorSesionDesdeHasta(desde, hasta);
            int m = 1;
            foreach (var mem in membresias)
            {
                g.DrawString($"{m}. {mem.nombre} {mem.apellido} - {mem.nombremembresia} - ${mem.precio:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                m++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("GENERADO POR USUARIO", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            var empleados = dao.ObtenerTotalesPorEmpleadoDesdeHasta(desde, hasta);
            int eNum = 1;
            foreach (var emp in empleados)
            {
                g.DrawString($"{eNum}. {emp.NombreUsuario}", font, Brushes.Black, 0, y); y += 10;
                g.DrawString($"   MEMBRESIAS: ${emp.TotalMembresias:F2}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"   PRODUCTOS: ${emp.TotalProductos:F2}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"   TOTAL: ${emp.Total:F2}", fontN1, Brushes.Black, 10, y); y += 12;
                eNum++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("FECHA: " + DateTime.Now.ToString("G"), fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("GRACIAS POR USAR EL SISTEMA ❤️", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("QUEJAS Y SUGERENCIAS: 445 108 2306", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("¡¡ESTO NO CUENTA COMO FACTURA!!", fontN1, Brushes.Black, 0, y); y += 10;
        }
        private void PrintTodasLasSesionesDelDia(object sender, PrintPageEventArgs e, DateTime dia)
        {
            Graphics g = e.Graphics;
            Font font = new Font("Consolas", 8);
            Font fontxN = new Font("Consolas", 5);
            Font fontN2 = new Font("Consolas", 4);
            Font fontN = new Font("Consolas", 6);
            Font fontN1 = new Font("Consolas", 7);
            float y = 0;

            g.DrawString("================================", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("REPORTE DEL DIA LAS SESIONES", fontN1, Brushes.Black, 0, y); y += 12;
            g.DrawString("================================", font, Brushes.Black, 0, y); y += 10;

            ReporteSesionDAO dao = new ReporteSesionDAO();
            List<Sesiones> sesiones = dao.ObtenerSesionesDelDia(dia);
            int visitasTotales = 0;
            foreach (var sesion in sesiones)
            {
                if (sesion.TotalMembresias > 0 && sesion.TotalProductos > 0)
                {
                    g.DrawString($"SESION: {sesion.sesion}", font, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"USUARIO: {sesion.NombreUsuario}", font, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"TOTAL MEMBRESIAS: ${sesion.TotalMembresias:F2}", font, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"TOTAL PRODUCTOS: ${sesion.TotalProductos:F2}", font, Brushes.Black, 0, y); y += 10;
                    g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
                    
                    decimal precioV = 0;
                    int visitas = 0;
                    var productos = dao.ObtenerProductosVendidosPorSesion(sesion.sesion);
                    if (productos.Count > 0)
                    {

                        g.DrawString("🛍️ PRODUCTOS VENDIDOS", fontN, Brushes.Black, 0, y); y += 10;
                        int i = 1;
                        foreach (var prod in productos)
                        {
                            if (prod.NombreProducto == "VISITA")
                            {
                                precioV = prod.Precio;
                                visitas = prod.CantidadVendida;
                            }
                            decimal total = prod.Precio * prod.CantidadVendida;
                            g.DrawString($"{i} - {prod.NombreProducto} x{prod.CantidadVendida} = ${total:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                            i++;
                        }
                    }
                    else
                    {
                        g.DrawString("NO HUBO VENTA DE PRODUCTOS", fontxN, Brushes.Black, 0, y); y += 10;
                    }

                    var membresias = dao.ObtenerMembresiasVendidasPorSesion(sesion.sesion);
                    if (membresias.Count > 0)
                    {
                        g.DrawString("💳 MEMBRESIAS VENDIDAS", fontN, Brushes.Black, 0, y); y += 10;
                        int j = 1;
                        foreach (var mem in membresias)
                        {
                            string nombreCliente = $"{mem.nombre}";
                            g.DrawString($"{j} - {nombreCliente} - {mem.nombremembresia} - ${mem.precio:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                            j++;
                        }
                    }
                    else
                    {
                        g.DrawString("NO HUBO VENTA DE MEMBRESIAS", fontxN, Brushes.Black, 0, y); y += 10;
                    }
                    decimal toV = visitas * precioV;
                    g.DrawString($"TOTAL MEMBRESIAS: ${sesion.TotalMembresias:F2}", font, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"TOTAL PRODUCTOS: ${(sesion.TotalProductos-toV):F2}", font, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"TOTAL VISITAS = {toV:F2}", fontxN, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"VISITAS = {visitas}", fontxN, Brushes.Black, 0, y); y += 10;
                    g.DrawString($"SUMA FINAL = {sesion.TotalProductos+sesion.TotalMembresias:F2}", fontxN, Brushes.Black, 0, y); y += 10;
                    visitasTotales = visitasTotales + visitas;
                    g.DrawString("================================", font, Brushes.Black, 0, y); y += 15;
                }
              
            }


            List<ReporteEmpleado> lista = dao.ObtenerTotalesPorEmpleadoDesde(DateTime.Today); // O LA FECHA QUE QUIERAS
            int p = 1;

            foreach (var empleado in lista)
            {
                g.DrawString($"{p}- {empleado.NombreUsuario}", font, Brushes.Black, 0, y); y += 10;
                g.DrawString($"  MEMBRESIAS: ${empleado.TotalMembresias:F2}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"  PRODUCTOS:  ${empleado.TotalProductos:F2}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"  TOTAL:      ${empleado.Total:F2}", fontN1, Brushes.Black, 10, y); y += 12;
                g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
                p++;
            }
            g.DrawString($"VISITAS TOTALES = {visitasTotales}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("FECHA " + DateTime.Now.ToString("g"), fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("GRACIAS POR USAR EL SISTEMA ❤️", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("QUEJAS Y SUGERENCIAS 445 108 2306", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("¡¡ESTO NO CUENTA COMO FACTURA!!", fontN1, Brushes.Black, 0, y); y += 10;
        }


        private void PrintReportePeriodo(object sender, PrintPageEventArgs e, DateTime desde, DateTime hasta)
        {
            Graphics g = e.Graphics;
            float y = 0;
            Font font = new Font("Consolas", 8);
            Font fontxN = new Font("Consolas", 5);
            Font fontN2 = new Font("Consolas", 4);
            Font fontN = new Font("Consolas", 6);
            Font fontN1 = new Font("Consolas", 7);

            ReporteSesionDAO dao = new ReporteSesionDAO();
           List<TotalesVentasPorUsuario> totales_final = dao.ObtenerTotalesVentasPorUsuario(desde,hasta);

            var sesiones = dao.ObtenerSesionesDesdeHasta(desde, hasta);
            var productos = dao.ObtenerProductosVendidosPorSesionDesdeHasta(desde, hasta);
            var membresias = dao.ObtenerMembresiasVendidasPorSesionDesdeHasta(desde, hasta);
            var empleados = dao.ObtenerTotalesPorEmpleadoDesdeHasta(desde, hasta);
            y = ImprimirEncabezado(e, g, y, font, fontxN, desde, hasta);

            if (cmbDatos.SelectedIndex == 0)
            {
                y = ImprimirSesiones(g, y, font, fontN, fontN2, fontN1, sesiones);
                y = ImprimirProductos(g, y, font, fontN, fontN2, productos);
                y = ImprimirMembresias(g, y, font, fontN, fontN2, membresias);
                y = ImprimirTotalesPorUsuario(g, y, font, fontN, fontN1, empleados, totales_final);
            }
            else if (cmbDatos.SelectedIndex == 1)
            {
                y = ImprimirSesiones(g, y, font, fontN, fontN2, fontN1, sesiones);
            }
            else if (cmbDatos.SelectedIndex == 2)
            {
                y = ImprimirProductos(g, y, font, fontN, fontN2, productos);
            }
            else if (cmbDatos.SelectedIndex == 3)
            {
                y = ImprimirMembresias(g, y, font, fontN, fontN2, membresias);
            }
            else if (cmbDatos.SelectedIndex == 4)
            {
                y = ImprimirTotalesPorUsuario(g, y, font, fontN, fontN1, empleados,totales_final);
            }
            y = ImprimirPie(g, y, font, fontN, fontN1);
        }

        private float ImprimirEncabezado(PrintPageEventArgs e, Graphics g, float y, Font font, Font fontxN, DateTime desde, DateTime hasta)
        {
            // Image logo = Image.FromFile("C:\\Users\\alelo\\source\\repos\\ImpresionPOS58\\ImpresionPOS58\\graficos\\logo 1bit.png");
            //Image logo = Image.FromFile("graficos/logo 1bit.png");
            //logo = ConvertToBlackAndWhite(logo);
            //int newWidth = logo.Width / 2;
            //int newHeight = logo.Height / 2;
            //float x = (e.PageBounds.Width - newWidth) / 2;
            //float logoY = y + 8;
            //g.DrawImage(logo, x, logoY, newWidth, newHeight);
            //y = logoY + newHeight + 10;
            g.DrawString("Instagram: @ego_integral", fontxN, Brushes.Black, 0, y); y += 8;
            g.DrawString("Facebook: EGO Integral Fitness", fontxN, Brushes.Black, 0, y); y += 10;

            g.DrawString("================================", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--- REPORTE DE PERIODO ---", font, Brushes.Black, 0, y); y += 12;
            g.DrawString($"Desde: {desde.ToString("G")}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"Hasta: {hasta.ToString("G")}", font, Brushes.Black, 0, y); y += 10;

            return y;
        }

        private float ImprimirSesiones(Graphics g, float y, Font font, Font fontN, Font fontN2, Font fontN1, List<Sesiones> sesiones)
        {
            g.DrawString("SESIONES REALIZADAS", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            int s = 1;
            foreach (var sesion in sesiones)

            {
                g.DrawString($"{s}. SESION: {sesion.sesion}, USUARIO: {sesion.NombreUsuario}", fontN2, Brushes.Black, 0, y); y += 10;
                g.DrawString($"MEMBRESIAS: ${sesion.TotalMembresias:F2}, PRODUCTOS: ${sesion.TotalProductos:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                s++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            return y;
        }

        private float ImprimirProductos(Graphics g, float y, Font font, Font fontN, Font fontN2, List<ProductosVendidos> productos)
        {
            g.DrawString("PRODUCTOS VENDIDOS", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            int p = 1;
            foreach (var prod in productos)
            {
                g.DrawString($"{p}. {prod.NombreProducto} X{prod.CantidadVendida} = ${prod.Total:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                p++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            return y;
        }

        private float ImprimirMembresias(Graphics g, float y, Font font, Font fontN, Font fontN2, List<MembresiasVendidas> membresias)
        {
            g.DrawString("MEMBRESIAS VENDIDAS", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            int m = 1;
            foreach (var mem in membresias)
            {
                g.DrawString($"{m}. {mem.nombre} {mem.apellido}", fontN2, Brushes.Black, 0, y); y += 10;
                g.DrawString($" {mem.nombremembresia} - ${mem.precio:F2}", fontN2, Brushes.Black, 0, y); y += 10;
                m++;
            }

            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            return y;
        }

        private float ImprimirTotalesPorUsuario(Graphics g, float y, Font font, Font fontN, Font fontN1, List<ReporteEmpleado> empleados, List<TotalesVentasPorUsuario> totales_final)
        {
            g.DrawString("GENERADO POR USUARIO", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;

            int eNum = 1;
            decimal totalfinal = 0;
            foreach (var emp in empleados)
            {
                g.DrawString($"{eNum}. {emp.NombreUsuario}", font, Brushes.Black, 0, y); y += 10;
                g.DrawString($"   MEMBRESIAS: ${emp.TotalMembresias:F2}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"   PRODUCTOS: ${emp.TotalProductos:F2}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"   TOTAL: ${emp.Total:F2}", fontN1, Brushes.Black, 10, y); y += 12;

                eNum++;
                totalfinal = totalfinal + emp.Total;
                
            }
            foreach (var tot in totales_final)
            {
                g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"{tot.NombreUsuario}", fontN, Brushes.Black, 10, y); y += 10;
                g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                if (tot.TotalMembresiasEfectivo + tot.TotalProductosEfectivo + tot.TotalProductosEspecialesEfectivo == 0 &&
                    tot.TotalMembresiasTarjeta + tot.TotalMembresiasTarjeta + tot.TotalProductosEspecialesTarjeta == 0)
                {
                    g.DrawString($"-NO VENDIÓ NADA-", fontN, Brushes.Black, 10, y); y += 10;
                }
                else
                {
                    g.DrawString($"   PRODUCTOS EFECTIVO: ${tot.TotalProductosEfectivo:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   PRODUCTOS TARJETA: ${tot.TotalProductosTarjeta:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   TOTAL DE PRODUCTOS: ${(tot.TotalProductosTarjeta + tot.TotalProductosEfectivo):F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   MEMBRESIAS EFECTIVO: ${tot.TotalMembresiasEfectivo:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   MEMBRESIAS TARJETA: ${tot.TotalMembresiasTarjeta:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   TOTAL DE MEMBRESIAS: ${tot.TotalMembresiasEfectivo + tot.TotalMembresiasTarjeta:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   VISITAS EFECTIVO: ${tot.TotalProductosEspecialesEfectivo:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   VISITAS TARJETA: ${tot.TotalProductosEspecialesTarjeta:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   TOTAL DE VISITAS: ${tot.TotalProductosEspecialesEfectivo + tot.TotalProductosEspecialesTarjeta:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   TOTAL EN EFECTIVO: ${tot.TotalMembresiasEfectivo + tot.TotalProductosEfectivo + tot.TotalProductosEspecialesEfectivo:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"   TOTAL EN TARJETA:: ${tot.TotalMembresiasTarjeta + tot.TotalMembresiasTarjeta + tot.TotalProductosEspecialesTarjeta:F2}", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                    g.DrawString($"--------------------------------------", fontN, Brushes.Black, 10, y); y += 10;
                }
                



            }
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"TOTAL FINAL: ${totalfinal:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            return y;
        }

        private float ImprimirPie(Graphics g, float y, Font font, Font fontN, Font fontN1)
        {
            g.DrawString("FECHA: " + DateTime.Now.ToString("G"), fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("GRACIAS POR USAR EL SISTEMA", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("DUDAS: 445 108 2306", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("RESPALDADO EN BASE DE DATOS", fontN1, Brushes.Black, 0, y); y += 10;

            return y;
        }

        private void materialButton1_Click(object sender, EventArgs e)
        {
            PrintDocument printDoc = new PrintDocument();

            DateTime desde = impDateDesde.Value;
            DateTime hasta = impDateHasta.Value;
            desde = new DateTime(desde.Year, desde.Month, desde.Day, 0, 0, 0);
            hasta = new DateTime(desde.Year, desde.Month, desde.Day, 23, 59, 59);
            printDoc.PrintPage += new PrintPageEventHandler((sender2, e2) => PrintReportePeriodo(sender2, e2, desde, hasta));
            printDoc.PrinterSettings.PrinterName = "POS-58"; // CAMBIA EL NOMBRE DE LA IMPRESORA SI ES NECESARIO 🖨️

            printDoc.Print();
            MessageBox.Show("IMPRESION EXITOSA ✅", "LISTO", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void printDia_Click_1(object sender, EventArgs e)
        {
            PrintDocument printDoc = new PrintDocument();
            printDoc.PrintPage += new PrintPageEventHandler((sender, e) => PrintTodasLasSesionesDelDia(sender, e, DateTime.Today));
            printDoc.PrinterSettings.PrinterName = "POS-58"; // Cambia el nombre de la impresora aquí
            printDoc.Print();
            MessageBox.Show("IMPRESIÓN EXITOSA ✅", "¡Listo!", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void printSemana_Click_1(object sender, EventArgs e)
        {
            PrintDocument printDoc = new PrintDocument();
            printDoc.PrintPage += new PrintPageEventHandler((sender2, e2) => PrintReportePeriodo(sender2, e2, DateTime.Today, -7));
            printDoc.PrinterSettings.PrinterName = "POS-58"; // CAMBIA EL NOMBRE DE LA IMPRESORA SI ES NECESARIO 🖨️

            printDoc.Print();
            MessageBox.Show("IMPRESION EXITOSA ✅", "LISTO", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void btnTrimestre_Click(object sender, EventArgs e)
        {
            PrintDocument printDoc = new PrintDocument();
            printDoc.PrintPage += new PrintPageEventHandler((sender2, e2) => PrintReportePeriodo(sender2, e2, DateTime.Today, -30));
            printDoc.PrinterSettings.PrinterName = "POS-58"; // CAMBIA EL NOMBRE DE LA IMPRESORA SI ES NECESARIO 🖨️

            printDoc.Print();
            MessageBox.Show("IMPRESION EXITOSA ✅", "LISTO", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void printMes_Click_1(object sender, EventArgs e)
        {
            PrintDocument printDoc = new PrintDocument();
            printDoc.PrintPage += new PrintPageEventHandler((sender2, e2) => PrintReportePeriodo(sender2, e2, DateTime.Today, -90));
            printDoc.PrinterSettings.PrinterName = "POS-58"; // CAMBIA EL NOMBRE DE LA IMPRESORA SI ES NECESARIO 🖨️

            printDoc.Print();
            MessageBox.Show("IMPRESION EXITOSA ✅", "LISTO", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void cmbDatos_SelectedIndexChanged(object sender, EventArgs e)
        {

        }

        private void btnAbrirPowerBI_Click(object sender, EventArgs e)
        {
            try
            {
                string rutaPBIX = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "Reporte.pbix");

                if (System.IO.File.Exists(rutaPBIX))
                {
                    var psi = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = rutaPBIX,
                        UseShellExecute = true // NECESARIO PARA QUE SE ABRA CON POWER BI AUTOMÁTICAMENTE ⚡
                    };
                    System.Diagnostics.Process.Start(psi);
                }
                else
                {
                    MessageBox.Show("NO SE ENCONTRÓ EL ARCHIVO DE POWER BI 😢", "ERROR", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("OCURRIÓ UN ERROR AL ABRIR POWER BI 🚨\n" + ex.Message, "ERROR", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

    }
}
