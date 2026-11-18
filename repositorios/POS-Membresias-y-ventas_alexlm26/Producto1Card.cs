using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using ImpresionPOS58.OBJETOS;

namespace ImpresionPOS58
{
    public partial class Producto1Card : UserControl
    {
        public Producto Producto { get; private set; }

        // ESTE EVENTO SE LANZA CUANDO SE DA CLIC EN EL BOTÓN ➕
        public event Action<Producto> OnAgregar;

        public Producto1Card(Producto producto)
        {
            InitializeComponent();

            Producto = producto;

            lblNombre.Text = Producto.Nombre;
            lblPrecio.Text = $"PRECIO ${Producto.Precio:0.00}";
            lblExistencia.Text = $"EXISTENCIA {Producto.Cantidad}";

            if (Producto.Foto != null && Producto.Foto.Length > 0)
            {
                using (MemoryStream ms = new MemoryStream(Producto.Foto))
                {
                    pictureBox.Image = Image.FromStream(ms);
                }
            }

            btnAgregar.Click += (s, e) =>
            {
                OnAgregar?.Invoke(Producto);
            };
        }

        private void btnAgregar_Click(object sender, EventArgs e)
        {

        }
    }
}
