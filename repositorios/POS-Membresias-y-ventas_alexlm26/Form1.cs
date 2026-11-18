using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Printing;
using System.IO;
using System.Net;
using System.Reflection.Metadata;
using System.Runtime.Intrinsics.X86;
using System.Text;
using System.Windows.Forms;
using ImpresionPOS58.DAOs;
using ImpresionPOS58.OBJETOS;
using ImpresionPOS58.REPORTES;
using ImpresionPOS58.VENTANAS;
using MaterialSkin;
using Microsoft.VisualBasic.ApplicationServices;
using Microsoft.VisualBasic.Logging;

namespace ImpresionPOS58
{
    public partial class Form1 : MaterialSkin.Controls.MaterialForm
    {
        bool venta = false;
        bool metodoPago = false;
        public int ids = 1;
        public Usuario user;
        public ProductoDAO p = new ProductoDAO();
        Size tamañoOriginalasd;
        decimal totalitario = 0;
        static async Task abrirPuerta(int puerta)
        {
            string ip;
            if (puerta == 1)
            {
                ip = "192.168.1.195";
            }
            else { ip = "192.168.1.198"; }
            string user = "admin";
            string pass = "Gymego2024*";
            string url = $"http://{ip}/ISAPI/AccessControl/RemoteControl/door/1";

            string xml = @"<RemoteControlDoor><cmd>open</cmd></RemoteControlDoor>"; // COMANDO XML 🚪
                                                                                    // CONFIGURA CREDENCIALES PARA DIGEST
            var handler = new HttpClientHandler
            {
                Credentials = new NetworkCredential(user, pass),
                PreAuthenticate = true
            };

            var client = new HttpClient(handler);
            var content = new StringContent(xml, Encoding.UTF8, "application/xml");

            try
            {
                var response = await client.PutAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    MessageBox.Show("PUERTA ABIERTA");
                }
                else
                {
                    MessageBox.Show("ERROR AL ABRIR PUERTA");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR 🚫: {ex.Message}");
            }


        }
        public Form1(Usuario userA, decimal dinero)
        {
            InitializeComponent();

            user = userA;
            user.dineroEnCaja = dinero;
            this.Load += Form1_Load;
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
            buscadorTimer = new System.Windows.Forms.Timer();
            buscadorTimer.Interval = 500; // 500 MILISEGUNDOS ⏳
            buscadorTimer.Tick += BuscadorTimer_Tick;

            if (user.RangoId != 1)
            {
                btnContabilidad.Enabled = false;
                materialButton1.Enabled = false;
                btnInventario.Enabled = false;
            }
            if (user.RangoId == 2)
            {
                btnContabilidad.Enabled = true;

            }

            lbltotal.BackColor = Color.Transparent;
            lbltotal.Font = new Font("Duldolar", 20.2499962F, FontStyle.Bold);
            lbltotal.ForeColor = SystemColors.Control;
            lbltotal.Location = new Point(536, 680);
            lbltotal.Name = "lbltotal";
            lbltotal.Size = new Size(299, 45);
            lbltotal.TabIndex = 6;
            materialLabel3.Text = "SESION ACTUAL: " + user.idSesion;
            lbltotal.Text = "TOTAL: $0.00";


        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // AJUSTAR ESTILO DEL PANEL
            List<Producto> lista = p.ObtenerTodos(); // BUSQUEDA EN BD 🔍

            foreach (var prod in lista)
            {
                Producto1Card card1 = new Producto1Card(prod);
                card1.OnAgregar += (productoSeleccionado) =>
                {
                    if (productoSeleccionado.Cantidad <= 0)
                    {
                        MessageBox.Show("NO HAY EXISTENCIAS");
                    }
                    else
                    {
                        bool verificar = false;
                        foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
                        {
                            Producto producto = card.Producto;
                            if (productoSeleccionado.IdProducto == producto.IdProducto)
                            {
                                verificar = true;
                                card.IncrementarCantidad();
                                break;
                            }
                        }
                        if (!verificar)
                        {
                            // VERIFICAR QUE NO HAYA SIDO AGREGADO
                            GenerarProductoCard(productoSeleccionado);
                            actualizarTotal();
                        }
                    }
                };
                flowLayoutPanel3.Controls.Add(card1);
            }


        }

        private void GenerarProductoCard(Producto producto)
        {
            var card = new ProductoCard(producto);
            card.OnEliminar += (prod) =>
            {
                flowLayoutPanel1.Controls.Remove(card);
                actualizarTotal();
            };
            flowLayoutPanel1.Controls.Add(card);
            actualizarTotal();
        }


        private List<Producto> ObtenerProductosDelTicket()
        {
            List<Producto> productosEnTicket = new List<Producto>();

            foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
            {
                Producto producto = card.Producto;

                // ACTUALIZAMOS LA CANTIDAD EN TICKET
                producto.CantidadEnTicket = card.ObtenerCantidadEnTicket();

                // AGREGAMOS EL PRODUCTO A LA LISTA
                productosEnTicket.Add(producto);
            }

            return productosEnTicket;
        }
        public void ImprimirTicket()
        {
            DialogResult result = MessageBox.Show("¿DESEA IMPRIMIR EL TICKET?", "CONFIRMACIÓN", MessageBoxButtons.YesNo, MessageBoxIcon.Question);

            if (result == DialogResult.Yes)
            {
                try
                {
                    PrintDocument printDoc = new PrintDocument();
                    printDoc.PrintPage += new PrintPageEventHandler((sender, e) => PrintReceipt(sender, e, ObtenerProductosDelTicket(), 0));
                    printDoc.PrinterSettings.PrinterName = "POS-58";
                    printDoc.Print();
                    MessageBox.Show("IMPRESIÓN EXITOSA ✅", "¡Listo!", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
                catch
                {
                    MessageBox.Show("ERROR AL IMPRIMIR");
                }
            }
            else
            {
                decimal total = 0;
                foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
                {
                    Producto producto = card.Producto;

                    producto.CantidadEnTicket = card.ObtenerCantidadEnTicket();
                    total = total + (producto.Precio * producto.CantidadEnTicket);
                }
                decimal totalConDescuento = total;
                user.dineroEnCaja = user.dineroEnCaja + totalConDescuento;
                var dao = new SesionDAO();
                dao.AgregarDineroFinal(user.idSesion, totalConDescuento);
                VentaProducto s = new VentaProducto();
                s.Total = total;
                s.tipo = materialSwitch1.Checked;
                s.Fecha = DateTime.Now;
                s.UsuarioId = user.IdUsuario;
                s.IdSesion = user.idSesion;
                try
                {
                    VentaProductoDAO a = new VentaProductoDAO();
                    ids = a.InsertarYObtenerId(s);
                }
                catch
                {
                    MessageBox.Show("ERROR AL REGISTRAR VENTA");
                }
            }

            // EJECUTA REGISTROS EN BASE DE DATOS AUNQUE NO SE IMPRIMA EL TICKET 🗃️✅

            try
            {
                ProductoDAO x = new ProductoDAO();
                x.DescontarInventarioPorVenta(ObtenerProductosDelTicket());
            }
            catch
            {
                MessageBox.Show("ERROR AL DESCONTAR INVENTARIO");
            }

            try
            {
                DetallesVentasProductoDAO z = new DetallesVentasProductoDAO();
                z.InsertarDetallesDeVenta(ObtenerProductosDelTicket(), ids);
            }
            catch
            {
                MessageBox.Show("ERROR AL AGREGAR DETALLES DE VENTA");
            }

            Form1 nuevoForm = new Form1(user, user.dineroEnCaja);
            nuevoForm.Show();
            venta = true;
            GC.Collect();
            this.Close();
        }


        private void PrintReceipt(object sender, PrintPageEventArgs e, List<Producto> productos, decimal descuento)
        {
            // Configura la fuente para la impresión
            Graphics g = e.Graphics;
            Font font = new Font("Consolas", 8);
            Font fontxN = new Font("Consolas", 5);
            Font fontN = new Font("Consolas", 6);
            Font fontN1 = new Font("Consolas", 7);
            float y = 0;

            // Cargar y procesar la imagen para convertirla en blanco y negro (1 bit)
            Image logo = Image.FromFile("graficos/logo 1bit.png"); // Cargar imagen
            //Image logo = Image.FromFile("C:\\Users\\alelo\\source\\repos\\ImpresionPOS58\\ImpresionPOS58\\graficos\\logo 1bit.png");
            logo = ConvertToBlackAndWhite(logo); // Convertir a blanco y negro

            // Redimensionar la imagen (por ejemplo, reducirla a la mitad de su tamaño original)
            int newWidth = logo.Width / 2;  // Redimensionar a la mitad del tamaño original (ajusta el valor según sea necesario)
            int newHeight = logo.Height / 2; // Redimensionar a la mitad del tamaño original (ajusta el valor según sea necesario)

            // Obtener las dimensiones de la página de impresión
            float x = (e.PageBounds.Width - newWidth) / 2;  // Centrar en el eje X
            float logoY = y + 8; // Ubicación de la imagen en el eje Y (después del título)

            // Dibujar la imagen redimensionada y centrada en el ticket
            g.DrawImage(logo, x, logoY, newWidth, newHeight);  // Especifica el tamaño redimensionado aquí

            y = logoY + newHeight + 10; // Avanza el contador 'y' después de la imagen para el texto
            g.DrawString("Instagram: @ego_integral\n", fontxN, Brushes.Black, 0, y); y += 8;
            g.DrawString("Facebook: EGO Integral Fitness\n", fontxN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------\n", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("CONCEPTO | CANTIDAD  | PRECIO | TOTAL\n", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            // Definir el ancho máximo de 40 caracteres
            int maxWidth = 40;
            // Imprimir los productos
            decimal total1 = 0;
            int cantProd = 1;
            foreach (var producto in productos)
            {
                decimal subTotal = producto.Precio * producto.CantidadEnTicket;
                total1 += subTotal;
                // Crear la cadena de texto sin espacios adicionales
                string nombre = producto.Nombre;
                string cantidad = producto.CantidadEnTicket.ToString();
                string precio = producto.Precio.ToString("F2");
                string totalStr = subTotal.ToString("F2");
                // Obtener la longitud total de la cadena sin espacios
                int totalLength = nombre.Length + cantidad.Length + precio.Length + totalStr.Length;
                // Si la longitud total supera los 40 caracteres, agregar el ID del producto
                if (totalLength >= maxWidth)
                {
                    nombre = "ID: " + producto.IdProducto; // Añadir el ID al principio
                    totalLength = nombre.Length + cantidad.Length + precio.Length + totalStr.Length;
                }
                // Calcular el espacio restante y dividirlo entre 3 (para la separación entre campos)
                int spacePerColumn = (maxWidth - totalLength) / 3; // Espacios entre nombre, cantidad, precio y total
                                                                   // Construir la línea con los espacios calculados
                string espacios = "";
                for (int i = 0; i < spacePerColumn - 2; i++) { espacios += " "; }
                string line = $"" + cantProd + "-" + nombre + espacios + " " + cantidad + espacios + "$" + precio + espacios + "$" + totalStr;
                // Imprimir la línea de producto
                g.DrawString(line, fontN, Brushes.Black, 0, y);
                y += 10;
                cantProd++;
            }
            decimal total = 0;
            foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
            {
                Producto producto = card.Producto;

                producto.CantidadEnTicket = card.ObtenerCantidadEnTicket();
                total = total + (producto.Precio * producto.CantidadEnTicket);
            }
            decimal totalConDescuento = total - descuento;
            user.dineroEnCaja = user.dineroEnCaja + totalConDescuento;
            var dao = new SesionDAO();
            dao.AgregarDineroFinal(user.idSesion, totalConDescuento);
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"TOTAL: ${total:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"DESCUENTO: -${descuento:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"TOTAL CON DESCUENTO: ${totalConDescuento:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            if (metodoPago == false) { g.DrawString($"COMPRA REALIZADA EN EFECTIVO", font, Brushes.Black, 0, y); y += 10; }
            else
            {
                g.DrawString($"COMPRA POR TRANFERENCIA", font, Brushes.Black, 0, y); y += 10;
            }
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            // Finalizar el ticket
            g.DrawString("FECHA " + DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"), fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("SERVICIO POR: " + user.Username, fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("GRACIAS POR SU COMPRA", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("QUEJAS Y SUGERENCIAS 445 108 2306", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("¡¡ESTO NO CUENTA COMO FACTURA!!", fontN1, Brushes.Black, 0, y); y += 10;
            VentaProducto s = new VentaProducto();
            s.Total = total;
            s.tipo = materialSwitch1.Checked;
            s.Fecha = DateTime.Now;
            s.UsuarioId = user.IdUsuario;
            s.IdSesion = user.idSesion;
            try
            {
                VentaProductoDAO a = new VentaProductoDAO();
                ids = a.InsertarYObtenerId(s);
            }
            catch
            {
                MessageBox.Show("ERROR AL REGISTRAR VENTA");
            }
            g.DrawString("FOLIO DE VENTA: " + ids, fontxN, Brushes.Black, 0, y); y += 8;



        }
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
        private void BuscadorTimer_Tick(object sender, EventArgs e)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();

            buscadorTimer.Stop(); // DETIENE EL TIMER DESPUÉS DE EJECUTAR
            if (txtBuscador.Text == "")
            {
                List<Producto> lista = p.ObtenerTodos(); // BUSQUEDA EN BD 🔍

                foreach (var prod in lista)
                {
                    Producto1Card card1 = new Producto1Card(prod);
                    card1.OnAgregar += (productoSeleccionado) =>
                    {
                        if (productoSeleccionado.Cantidad <= 0)
                        {
                            MessageBox.Show("NO HAY EXISTENCIAS");
                        }
                        else
                        {
                            bool verificar = false;
                            foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
                            {
                                Producto producto = card.Producto;
                                if (productoSeleccionado.IdProducto == producto.IdProducto)
                                {
                                    verificar = true;
                                    card.IncrementarCantidad();
                                    break;
                                }
                            }
                            if (!verificar)
                            {
                                // VERIFICAR QUE NO HAYA SIDO AGREGADO
                                GenerarProductoCard(productoSeleccionado);
                                actualizarTotal();
                            }
                        }
                    };
                    flowLayoutPanel3.Controls.Add(card1);
                }
            }
            else
            {
                buscarProductos(txtBuscador.Text.Trim()); // TU MÉTODO DE BÚSQUEDA 🔍
            }

        }

        private async void txtBuscador_TextChanged(object sender, EventArgs e)
        {
            buscadorTimer.Stop();  // DETIENE SI YA ESTABA CORRIENDO
            buscadorTimer.Start(); // INICIA EL TEMPORIZADOR
        }
        public void buscarProductos(string texto)
        {
            flowLayoutPanel3.Controls.Clear(); // LIMPIA LOS RESULTADOS ANTERIORES 🧹


            if (!string.IsNullOrEmpty(texto))
            {
                // Esperamos 500ms para evitar que la búsqueda se realice con cada tecla

                List<Producto> lista = p.BuscarPorNombreOCodigo(texto); // BUSQUEDA EN BD 🔍

                foreach (var prod in lista)
                {
                    Producto1Card card1 = new Producto1Card(prod);
                    card1.OnAgregar += (productoSeleccionado) =>
                    {
                        if (productoSeleccionado.Cantidad <= 0)
                        {
                            MessageBox.Show("NO HAY EXISTENCIAS");
                        }
                        else
                        {
                            bool verificar = false;
                            foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
                            {
                                Producto producto = card.Producto;
                                if (productoSeleccionado.IdProducto == producto.IdProducto)
                                {
                                    verificar = true;
                                    card.IncrementarCantidad();
                                    break;
                                }
                            }
                            if (!verificar)
                            {
                                // VERIFICAR QUE NO HAYA SIDO AGREGADO
                                GenerarProductoCard(productoSeleccionado);
                                actualizarTotal();
                            }
                        }
                    };
                    flowLayoutPanel3.Controls.Add(card1);
                }
            }
        }

        public void actualizarTotal()
        {
            decimal total = 0;
            foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
            {
                Producto producto = card.Producto;

                producto.CantidadEnTicket = card.ObtenerCantidadEnTicket();
                total = total + (producto.Precio * producto.CantidadEnTicket);
            }
            lbltotal.Text = "TOTAL: $" + total.ToString();
            totalitario = total;

        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            actualizarTotal();
        }

        private void materialSwitch1_CheckedChanged(object sender, EventArgs e)
        {
            metodoPago = materialSwitch1.Checked;
        }

        private void materialButton5_Click(object sender, EventArgs e)
        {
            if (!metodoPago)
            {
                decimal totalCuenta = totalitario;

                // PREGUNTAMOS AL USUARIO CUANTO DINERO DIO 💵
                string input = Microsoft.VisualBasic.Interaction.InputBox("CUANTO DINERO DIO PARA PAGAR", "PAGO", "0");

                if (decimal.TryParse(input, out decimal pago))
                {
                    // SI EL PAGO ES MAYOR O IGUAL AL TOTAL CONTINUAMOS 🔍
                    if (pago >= totalCuenta)
                    {
                        decimal cambio = pago - totalCuenta;
                        MessageBox.Show($"EL CAMBIO A DAR ES DE {cambio:C2} 💰", "CAMBIO");
                    }
                    else
                    {
                        MessageBox.Show("EL MONTO ENTREGADO ES MENOR AL TOTAL DE LA CUENTA 🚫", "ERROR");
                    }
                }
                else
                {
                    MessageBox.Show("INGRESA UN NUMERO VALIDO 🔢", "DATO INVALIDO");
                    return;
                }
            }
            ImprimirTicket();
        }
        public static void InsertarProductosFalsos()
        {
            ProductoDAO dao = new ProductoDAO();

            for (int i = 1; i <= 100; i++)
            {
                Producto producto = new Producto
                {
                    IdProducto = i,
                    Nombre = $"PRODUCTO PRUEBA {i}",
                    Descripcion = $"DESCRIPCION DEL PRODUCTO {i}",
                    Precio = Math.Round(10 + (decimal)(i * 0.75), 2),
                    Cantidad = 100,
                    CantidadEnTicket = 0,
                    codigo = $"COD{i:0000}",
                    Foto = ObtenerImagenDummyComoBytes()
                };

                dao.Insertar(producto);
            }
            MessageBox.Show("agregados");
        }

        private static byte[] ObtenerImagenDummyComoBytes()
        {
            // CREA UNA IMAGEN DE COLOR ALEATORIO PARA SIMULAR LA FOTO 🎨📸
            Bitmap bmp = new Bitmap(100, 100);
            Random rnd = new Random();
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.FromArgb(rnd.Next(256), rnd.Next(256), rnd.Next(256)));
            }

            using (MemoryStream ms = new MemoryStream())
            {
                bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                return ms.ToArray();
            }
        }

        private void btnMembresias_Click(object sender, EventArgs e)
        {
            Membresias s = new Membresias(user);
            s.Show();
        }

        private void btnInventario_Click(object sender, EventArgs e)
        {
            Inventario x = new Inventario(user); x.Show();
        }
        private void Form1_Load_2(object sender, EventArgs e)
        {

        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (venta == false)
            {
                // PREGUNTAMOS AL USUARIO SI QUIERE HACER EL CORTE DE CAJA
                DialogResult result = MessageBox.Show(
                    "SEGURO QUE DESEA REALIZAR CORTE DE CAJA ❓💸",
                    "CONFIRMACION 🔐",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );

                if (result == DialogResult.Yes)
                {
                    var dao = new SesionDAO();

                    // 🛠️ CERRAMOS LA SESION
                    dao.CorteFinal(user.idSesion);

                    // 📋 OBTENEMOS EL REPORTE COMPLETO DE LA SESION
                    var reporte = dao.ObtenerReporteSesion(user.idSesion);

                    int visitas = 0;
                    foreach (var membresia in reporte.DetallesMembresias)
                    {
                        decimal a = 51.00M;
                        if (membresia.Total == a)
                        {
                            visitas++;
                        }
                    }

                    MessageBox.Show(
                        $"CIERRE DE SESION 🧾\n\n" +
                        $"INICIO ⏰: {reporte.Sesion.FechaInicio}\n" +
                        $"CIERRE 🔒: {reporte.Sesion.FechaCierre}\n" +
                        $"DINERO INICIAL 💰: ${reporte.Sesion.DineroInicial}\n" +
                        $"DINERO FINAL 💼: ${reporte.Sesion.DineroFinal}\n" +
                        $"EFECTIVO 💵: ${reporte.TotalEfectivo}\n" +
                        $"TRANSFERENCIA 💳: ${reporte.TotalTransferencia}\n" +
                        $"VENTAS PRODUCTOS 🛒: {reporte.DetallesProductos.Count}\n" +
                        $"VENTAS MEMBRESIAS 🧑‍🤝‍🧑: {reporte.DetallesMembresias.Count}\n" +
                        $"DE ESTAS MEMBRESIAS {visitas} FUERON VISITAS"
                    );

                    DialogResult imprimir = MessageBox.Show("¿DESEA IMPRIMIR EL CORTE DE CAJA 🖨️❓", "IMPRESION", MessageBoxButtons.YesNo, MessageBoxIcon.Question);

                    if (imprimir == DialogResult.Yes)
                    {
                        PrintDocument printDoc = new PrintDocument();
                        printDoc.PrintPage += new PrintPageEventHandler((s, ev) => PrintCierreSesion(s, ev, user.idSesion));
                        printDoc.PrinterSettings.PrinterName = "POS-58";

                        printDoc.Print();
                        MessageBox.Show("IMPRESION EXITOSA ✅", "¡LISTO!", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        Application.Exit();
                    }
                }
                else
                {
                    e.Cancel = true; // ❌ CANCELA EL CIERRE DE LA VENTANA SI NO QUIERE HACER EL CORTE
                }
            }

        }

        private void pictureBox2_Click(object sender, EventArgs e)
        {
            DialogResult result = MessageBox.Show(
                "SEGURO QUE DESEA REALIZAR CORTE DE CAJA ❓💸",
                "CONFIRMACION 🔐",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (result == DialogResult.Yes)
            {
                var dao = new SesionDAO();

                // 🛠️ CERRAMOS LA SESION
                dao.CorteFinal(user.idSesion);

                // 📋 OBTENEMOS EL REPORTE COMPLETO DE LA SESION
                var reporte = dao.ObtenerReporteSesion(user.idSesion);

                // ✅ MOSTRAMOS LA INFORMACION EN UN MESSAGEBOX PARA VERIFICAR
                int visitas = 0;
                foreach (var membresia in reporte.DetallesMembresias)
                {
                    decimal a = 51.00M;
                    if (membresia.Total == a)
                    {
                        visitas++;
                    }
                }
                MessageBox.Show(
                    $"CIERRE DE SESION 🧾\n\n" +
                    $"INICIO ⏰: {reporte.Sesion.FechaInicio}\n" +
                    $"CIERRE 🔒: {reporte.Sesion.FechaCierre}\n" +
                    $"DINERO INICIAL 💰: ${reporte.Sesion.DineroInicial}\n" +
                    $"DINERO FINAL 💼: ${reporte.Sesion.DineroFinal}\n" +
                    $"EFECTIVO 💵: ${reporte.TotalEfectivo}\n" +
                    $"TRANSFERENCIA 💳: ${reporte.TotalTransferencia}\n" +
                    $"VENTAS PRODUCTOS 🛒: {reporte.DetallesProductos.Count}\n" +

                    $"VENTAS MEMBRESIAS 🧑‍🤝‍🧑: {reporte.DetallesMembresias.Count}\n" +
                    $"DE ESTAS MEMBRESIAS {visitas} FUERON VISITAS"

                );
                PrintDocument printDoc = new PrintDocument();
                printDoc.PrintPage += new PrintPageEventHandler((sender, e) => PrintCierreSesion(sender, e, user.idSesion));
                printDoc.PrinterSettings.PrinterName = "POS-58"; // Cambia el nombre de la impresora aquí


                printDoc.Print();
                MessageBox.Show("IMPRESIÓN EXITOSA ✅", "¡Listo!", MessageBoxButtons.OK, MessageBoxIcon.Information);

                Application.Exit();
            }
        }
        private void txtBuscador_KeyPress(object sender, KeyPressEventArgs e)
        {
            if (e.KeyChar == ((char)Keys.Enter))
            {

                ProductoDAO a = new ProductoDAO();
                Producto s = new Producto();
                s = a.BuscarPorCodigo(txtBuscador.Text);

                if (s == null)
                {
                    MessageBox.Show($"NO EXISTE EL PRODUCTO CON EL CODIGO {txtBuscador.Text}");
                    txtBuscador.Text = "";
                }
                else if (s.Cantidad <= 0)
                {
                    MessageBox.Show("NO HAY EXISTENCIAS");
                    txtBuscador.Text = "";
                }
                else
                {
                    bool verificar = false;
                    foreach (var card in flowLayoutPanel1.Controls.OfType<ProductoCard>())
                    {
                        Producto producto = card.Producto;
                        if (s.IdProducto == producto.IdProducto)
                        {
                            verificar = true;
                            card.IncrementarCantidad();

                            txtBuscador.Text = "";
                            break;
                        }
                    }
                    if (!verificar)
                    {
                        // VERIFICAR QUE NO HAYA SIDO AGREGADO
                        GenerarProductoCard(s);
                        actualizarTotal();
                        txtBuscador.Text = "";
                    }
                }
            }

        }


        private void PrintCierreSesion(object sender, PrintPageEventArgs e, int idSesion)
        {
            ReporteSesionDAO dao = new ReporteSesionDAO();
            Sesiones sesion = new Sesiones();
            sesion = dao.ObtenerSesionPorId(idSesion);
            Graphics g = e.Graphics;
            Font font = new Font("Consolas", 8);
            Font fontxN = new Font("Consolas", 6);
            Font fontN = new Font("Consolas", 5);
            Font fontN2 = new Font("Consolas", 4);
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
            g.DrawString("REPORTE DE LA SESION", fontN1, Brushes.Black, 0, y); y += 12;
            g.DrawString("================================", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"SESION: {sesion.sesion}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"USUARIO: {sesion.NombreUsuario}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"TOTAL MEMBRESIAS: ${sesion.TotalMembresias:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"TOTAL PRODUCTOS: ${sesion.TotalProductos:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("--------------------------------", font, Brushes.Black, 0, y); y += 10;
            int visitas = 0;
            decimal precioVisita = 0;
            var productos = dao.ObtenerProductosVendidosPorSesion(sesion.sesion);
            if (productos.Count > 0)
            {
                g.DrawString("🛍️ PRODUCTOS VENDIDOS", fontN, Brushes.Black, 0, y); y += 10;
                int i = 1;
                foreach (var prod in productos)
                {
                    if (prod.NombreProducto == "VISITA")
                    {
                        visitas = prod.CantidadVendida;
                        precioVisita = prod.Precio;
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
            decimal totalProdudctosSinV = sesion.TotalProductos - (visitas * precioVisita) ;
            decimal totalVisitas = visitas * precioVisita;
            g.DrawString($"TOTAL MEMBRESIAS: ${sesion.TotalMembresias:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString($"TOTAL PRODUCTOS: ${totalProdudctosSinV:F2}", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("================================", font, Brushes.Black, 0, y); y += 15;
            g.DrawString($"TOTAL VISITAS = {totalVisitas:2F}", fontxN, Brushes.Black, 0, y); y += 10;
            g.DrawString($"VISITAS = {visitas}", fontxN, Brushes.Black, 0, y); y += 10;

            g.DrawString("================================", font, Brushes.Black, 0, y); y += 15;
            g.DrawString("FECHA " + DateTime.Now.ToString("g"), fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("SERVICIO POR: " + user.Username, font, Brushes.Black, 0, y); y += 10;
            g.DrawString("GRACIAS POR USAR EL SISTEMA ❤️", font, Brushes.Black, 0, y); y += 10;
            g.DrawString("QUEJAS Y SUGERENCIAS 445 108 2306", fontN, Brushes.Black, 0, y); y += 10;
            g.DrawString("¡¡ESTO NO CUENTA COMO FACTURA!!", fontN1, Brushes.Black, 0, y); y += 10;
        }




        private void pictureBox2_MouseEnter(object sender, EventArgs e)
        {
            tamañoOriginalasd = pictureBox2.Size;
            pictureBox2.Size = new Size((int)(tamañoOriginalasd.Width * 1.1), (int)(tamañoOriginalasd.Height * 1.1));
        }

        private void pictureBox2_MouseLeave(object sender, EventArgs e)
        {
            pictureBox2.Size = new Size((int)(tamañoOriginalasd.Width), (int)(tamañoOriginalasd.Height));
        }

        private void btnContabilidad_Click(object sender, EventArgs e)
        {

            DialogResult result = MessageBox.Show(
    "SEGURO QUE DESEA REALIZAR CORTE DE CAJA ❓💸",
    "CONFIRMACION 🔐",
    MessageBoxButtons.YesNo,
    MessageBoxIcon.Question
);
            if (materialTextBox1.Text != "")
            {

                if (result == DialogResult.Yes)
                {
                    var dao = new SesionDAO();

                    // 🛠️ CERRAMOS LA SESION
                    dao.CorteFinal(int.Parse(materialTextBox1.Text));

                    // 📋 OBTENEMOS EL REPORTE COMPLETO DE LA SESION
                    var reporte = dao.ObtenerReporteSesion(int.Parse(materialTextBox1.Text));

                    // ✅ MOSTRAMOS LA INFORMACION EN UN MESSAGEBOX PARA VERIFICAR
                    int visitas = 0;
                    foreach (var membresia in reporte.DetallesMembresias)
                    {
                        decimal a = 60.00M;
                        if (membresia.Total == a)
                        {
                            visitas++;
                        }
                    }
                    MessageBox.Show(
                        $"CIERRE DE SESION 🧾\n\n" +
                        $"INICIO ⏰: {reporte.Sesion.FechaInicio}\n" +
                        $"CIERRE 🔒: {reporte.Sesion.FechaCierre}\n" +
                        $"DINERO INICIAL 💰: ${reporte.Sesion.DineroInicial}\n" +
                        $"DINERO FINAL 💼: ${reporte.Sesion.DineroFinal}\n" +
                        $"EFECTIVO 💵: ${reporte.TotalEfectivo}\n" +
                        $"TRANSFERENCIA 💳: ${reporte.TotalTransferencia}\n" +
                        $"VENTAS PRODUCTOS 🛒: {reporte.DetallesProductos.Count}\n" +

                        $"VENTAS MEMBRESIAS 🧑‍🤝‍🧑: {reporte.DetallesMembresias.Count}\n" +
                        $"DE ESTAS MEMBRESIAS {visitas} FUERON VISITAS"

                    );
                    PrintDocument printDoc = new PrintDocument();
                    printDoc.PrintPage += new PrintPageEventHandler((sender, e) => PrintCierreSesion(sender, e, (int.Parse(materialTextBox1.Text))));
                    printDoc.PrinterSettings.PrinterName = "POS-58"; // Cambia el nombre de la impresora aquí


                    printDoc.Print();
                    MessageBox.Show("IMPRESIÓN EXITOSA ✅", "¡Listo!", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }

            }

            else if (result == DialogResult.Yes)
            {
                var dao = new SesionDAO();

                // 🛠️ CERRAMOS LA SESION
                dao.CorteFinal(user.idSesion);

                // 📋 OBTENEMOS EL REPORTE COMPLETO DE LA SESION
                var reporte = dao.ObtenerReporteSesion(user.idSesion);

                // ✅ MOSTRAMOS LA INFORMACION EN UN MESSAGEBOX PARA VERIFICAR
                int visitas = 0;
                foreach (var membresia in reporte.DetallesMembresias)
                {
                    decimal a = 51.00M;
                    if (membresia.Total == a)
                    {
                        visitas++;
                    }
                }
                MessageBox.Show(
                    $"CIERRE DE SESION 🧾\n\n" +
                    $"INICIO ⏰: {reporte.Sesion.FechaInicio}\n" +
                    $"CIERRE 🔒: {reporte.Sesion.FechaCierre}\n" +
                    $"DINERO INICIAL 💰: ${reporte.Sesion.DineroInicial}\n" +
                    $"DINERO FINAL 💼: ${reporte.Sesion.DineroFinal}\n" +
                    $"EFECTIVO 💵: ${reporte.TotalEfectivo}\n" +
                    $"TRANSFERENCIA 💳: ${reporte.TotalTransferencia}\n" +
                    $"VENTAS PRODUCTOS 🛒: {reporte.DetallesProductos.Count}\n" +

                    $"VENTAS MEMBRESIAS 🧑‍🤝‍🧑: {reporte.DetallesMembresias.Count}\n" +
                    $"DE ESTAS MEMBRESIAS {visitas} FUERON VISITAS"

                );
                PrintDocument printDoc = new PrintDocument();
                printDoc.PrintPage += new PrintPageEventHandler((sender, e) => PrintCierreSesion(sender, e, user.idSesion));
                printDoc.PrinterSettings.PrinterName = "POS-58"; // Cambia el nombre de la impresora aquí


                printDoc.Print();
                MessageBox.Show("IMPRESIÓN EXITOSA ✅", "¡Listo!", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void materialButton1_Click(object sender, EventArgs e)
        {
            Panel1 a = new Panel1();
            a.Show();
            GC.Collect();
            GC.WaitForPendingFinalizers();
            //MessageBox.Show("EN PROCESO");
            //   Dashboard a = new Dashboard();
            // a.Show();
        }

        private void timer2_Tick(object sender, EventArgs e)
        {

            GC.Collect();
            GC.WaitForPendingFinalizers();
            //MessageBox.Show("LIMPIAO");
        }

        private async void materialButton2_Click(object sender, EventArgs e)
        {
            await abrirPuerta(1);
        }

        private async void materialButton3_Click(object sender, EventArgs e)
        {
            await abrirPuerta(2);
        }

        private void label2_Click(object sender, EventArgs e)
        {
            pictureBox2_Click(sender, e);
        }

        private void materialButton6_Click(object sender, EventArgs e)
        {
            EliminarVentasMembresia f = new EliminarVentasMembresia();
            f.Show();
        }

        private void materialButton4_Click(object sender, EventArgs e)
        {
            EliminarVentas f = new EliminarVentas();
            f.Show();
        }
    }
}
