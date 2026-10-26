using System;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using ImpresionPOS58.OBJETOS;

namespace ImpresionPOS58
{
    public partial class ProductoCard : UserControl
    {
        public Producto Producto { get; private set; }
        private int cantidadEnTicket = 1;

        public event Action<Producto> OnEliminar;

        public ProductoCard(Producto producto)
        {
            InitializeComponent();

            Producto = producto;

            lblNombre.Text = Producto.Nombre;
            lblPrecio.Text = $"${Producto.Precio:0.00}";
            lblCantidad.Text = cantidadEnTicket.ToString();

            if (Producto.Foto != null && Producto.Foto.Length > 0)
            {
                using (MemoryStream ms = new MemoryStream(Producto.Foto))
                {
                    pictureBox.Image = Image.FromStream(ms);
                }
            }

            btnSumar.Click += (s, e) =>
            {
                if (cantidadEnTicket < Producto.Cantidad)
                {
                    cantidadEnTicket++;
                    lblCantidad.Text = cantidadEnTicket.ToString();
                }
                else
                {
                    MessageBox.Show("NO HAY MÁS EXISTENCIA DISPONIBLE", "INVENTARIO", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            };

            btnRestar.Click += (s, e) =>
            {
                if (cantidadEnTicket > 1)
                {
                    cantidadEnTicket--;
                    lblCantidad.Text = cantidadEnTicket.ToString();
                }
                else
                {
                    MessageBox.Show("DEBE SE HABER AL MENOS 1", "INVENTARIO", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            };

            btnEliminar.Click += (s, e) =>
            {
                OnEliminar?.Invoke(Producto);
            };
        }

        public void IncrementarCantidad()
        {
            if (cantidadEnTicket < Producto.Cantidad)
            {
                cantidadEnTicket++;
                lblCantidad.Text = cantidadEnTicket.ToString();
            }
        }

        public int ObtenerCantidadEnTicket()
        {
            return cantidadEnTicket;
        }

        public decimal ObtenerTotal()
        {
            return Producto.Precio * cantidadEnTicket;
        }

        private void lblCantidad_Click(object sender, EventArgs e)
        {

        }
    }
}
