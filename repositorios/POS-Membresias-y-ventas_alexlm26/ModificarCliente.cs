using ImpresionPOS58.OBJETOS;
using ImpresionPOS58.DAOs;
using MaterialSkin;
using MaterialSkin.Controls;
using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace ImpresionPOS58.VENTANAS
{
    public partial class ModificarCliente : MaterialForm
    {
        private Cliente cliente;
        private ClienteDAO clienteDAO = new ClienteDAO();
        private byte[] imagenBytes;

        public ModificarCliente(int idCliente)
        {
            InitializeComponent();

            var skinManager = MaterialSkinManager.Instance;
            skinManager.AddFormToManage(this);
            skinManager.Theme = MaterialSkinManager.Themes.DARK;
            skinManager.ColorScheme = new ColorScheme(
                Primary.BlueGrey800,
                Primary.BlueGrey900,
                Primary.BlueGrey500,
                Accent.LightBlue200,
                TextShade.WHITE
            );

            cliente = clienteDAO.ObtenerPorId(idCliente);
            CargarDatos();
        }

        private void CargarDatos()
        {
            if (cliente == null)
            {
                MessageBox.Show("CLIENTE NO ENCONTRADO");
                Close();
                return;
            }

            txtNombre.Text = cliente.Nombre;
            txtApellidos.Text = cliente.Apellidos;
            txtDireccion.Text = cliente.Direccion;
            txtCelular.Text = cliente.Celular;
            txtCorreo.Text = cliente.Correo;

            if (cliente.Foto != null)
            {
                using (MemoryStream ms = new MemoryStream(cliente.Foto))
                {
                    pictureBoxFoto.Image = Image.FromStream(ms);
                    imagenBytes = cliente.Foto;
                }
            }
        }

        private void btnGuardar_Click(object sender, EventArgs e)
        {
            cliente.Nombre = txtNombre.Text;
            cliente.Apellidos = txtApellidos.Text;
            cliente.Direccion = txtDireccion.Text;
            cliente.Celular = txtCelular.Text;
            cliente.Correo = txtCorreo.Text;
            cliente.Foto = imagenBytes;

            clienteDAO.Actualizar(cliente);

            MessageBox.Show("CLIENTE ACTUALIZADO");
            this.Close();
        }

        private void btnCargarFoto_Click(object sender, EventArgs e)
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Filter = "Imágenes|*.jpg;*.png;*.jpeg";

            if (ofd.ShowDialog() == DialogResult.OK)
            {
                imagenBytes = File.ReadAllBytes(ofd.FileName);
                pictureBoxFoto.Image = Image.FromFile(ofd.FileName);
            }
        }
    }
}
