using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using System.Security.Cryptography;
using System.Text;
using ImpresionPOS58.OBJETOS;
using ImpresionPOS58.DAOs;
using MaterialSkin;
using MaterialSkin.Controls;
namespace ImpresionPOS58
{
    public partial class RegistroUsuario : MaterialForm
    {
        byte[] imagenBytes;
        public RegistroUsuario()
        {
            InitializeComponent();
            var skinManager = MaterialSkinManager.Instance;
            skinManager.AddFormToManage(this);
            skinManager.Theme = MaterialSkinManager.Themes.DARK;
            skinManager.ColorScheme = new ColorScheme(
                Primary.Green600, Primary.Green700, // COLORES VERDES
                Primary.Green200, Accent.Green100,
                TextShade.WHITE // TEXTO BLANCO
            );
            if (pictureBoxFoto.Image != null)
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    pictureBoxFoto.Image.Save(ms, pictureBoxFoto.Image.RawFormat); // 📸➡️💾
                    imagenBytes = ms.ToArray();
                }
            }

        }
        public static string EncriptarSHA256(string texto)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = Encoding.UTF8.GetBytes(texto);
                byte[] hash = sha256.ComputeHash(bytes);

                StringBuilder builder = new StringBuilder();
                foreach (byte b in hash)
                {
                    builder.Append(b.ToString("x2"));
                }

                return builder.ToString();
            }
        }

        private void btnRegistrar_Click(object sender, EventArgs e)
        {
            // Validación básica
            if (string.IsNullOrEmpty(txtNombre.Text) || string.IsNullOrEmpty(txtCorreo.Text) || string.IsNullOrEmpty(txtContraseña.Text)
                || string.IsNullOrEmpty(txtCelular.Text) || string.IsNullOrEmpty(txtDomicilio.Text) || string.IsNullOrEmpty(txtUsername.Text)
                || string.IsNullOrEmpty(txtRango.Text) || string.IsNullOrEmpty(txtConfirmar.Text))
            {
                MessageBox.Show("Por favor, complete todos los campos.");
                return;
            }
            if (txtConfirmar.Text != txtContraseña.Text)
            {
                MessageBox.Show("ERROR AL CONFIRMAR LA CONTRASEÑA, VERIFICA");
                return;
            }
            int rango = 3;
            if (txtRango.Text == "ADMINISTRADOR") { rango = 1; }
            else if (txtRango.Text == "SUPERVISOR") { rango = 2; }


            // Aquí deberías encriptar la contraseña si es necesario
            string contrasenaEncriptada = EncriptarSHA256(txtContraseña.Text); // Añade la lógica de encriptación si es necesario

            // Obtener la foto como un arreglo de bytes
            Usuario a = new Usuario();
            a.NombreCompleto = txtNombre.Text;
            a.Username = txtUsername.Text;
            a.Celular = txtCelular.Text;
            a.RangoId = rango;
            a.Password = contrasenaEncriptada;
            a.CorreoElectronico = txtCorreo.Text;
            a.Foto = imagenBytes;

            UsuarioDAO x = new UsuarioDAO();
            x.Insertar(a);

            // Lógica para guardar el usuario, por ejemplo:
            // RegistrarUsuario(txtNombre.Text, txtCorreo.Text, contrasenaEncriptada, imagenBytes);

            MessageBox.Show("Usuario registrado exitosamente.");

            // Limpiar los campos después del registro
            txtNombre.Clear();
            txtCorreo.Clear();
            txtContraseña.Clear();
            pictureBoxFoto.Image = null;
            this.Close();
        }

        private void btnCargarImagen_Click(object sender, EventArgs e)
        {
            // Crear una instancia del formulario Camara
            Camara camaraForm = new Camara();

            // Mostrar el formulario Camara como un cuadro de diálogo
            DialogResult result = camaraForm.ShowDialog();

            // Depuración: Verificar si se cerró correctamente el formulario
            // Si se cerró correctamente, obtener la imagen capturada
            if (result == DialogResult.OK)
            {
                // Obtener la imagen capturada desde el formulario Camara
                imagenBytes = camaraForm.ObtenerImagenComoBytes();

                // Depuración: Verificar si la imagen no es nula
                if (imagenBytes != null)
                {

                    // Convertir los bytes de imagen en una imagen y mostrarla en el PictureBox
                    using (MemoryStream ms = new MemoryStream(imagenBytes))
                    {
                        pictureBoxFoto.Image = Image.FromStream(ms);

                    }
                }
                else
                {
                    MessageBox.Show("No se obtuvo ninguna imagen.");
                }
            }
            else
            {
                MessageBox.Show("El formulario Camara no devolvió un resultado exitoso.");
            }
        }



        public byte[] ObtenerImagenComoBytes()
        {
            if (pictureBoxFoto.Image == null) return null;

            using (MemoryStream ms = new MemoryStream())
            {
                pictureBoxFoto.Image.Save(ms, System.Drawing.Imaging.ImageFormat.Jpeg);
                return ms.ToArray();
            }
        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void label7_Click(object sender, EventArgs e)
        {

        }

        private void txtUsername_TextChanged(object sender, EventArgs e)
        {

        }
    }
}
