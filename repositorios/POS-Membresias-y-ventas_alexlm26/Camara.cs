using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using AForge.Video;
using AForge.Video.DirectShow;
using MaterialSkin;

namespace ImpresionPOS58
{
    public partial class Camara : MaterialSkin.Controls.MaterialForm
    {
        private FilterInfoCollection Dispositivos;
        private VideoCaptureDevice CamaraVideo;
        private Bitmap imagenCapturada;

        public Camara()
        {

            InitializeComponent();

            Dispositivos = new FilterInfoCollection(FilterCategory.VideoInputDevice);
            foreach (FilterInfo dispositivo in Dispositivos)
            {
                materialComboBox1.Items.Add(dispositivo.Name); // 🧩 AGREGAR NOMBRE AL COMBOBOX
            }
            if (materialComboBox1.Items.Count > 0)
            {
                materialComboBox1.SelectedIndex = 0; // 📍 SELECCIONA LA PRIMERA CÁMARA POR DEFAULT
            }
            if (Dispositivos.Count > 0)
            {
                CamaraVideo = new VideoCaptureDevice(Dispositivos[0].MonikerString);
                CamaraVideo.NewFrame += new NewFrameEventHandler(Captura);
                CamaraVideo.Start();
            }
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

            pictureBoxFoto.SizeMode = PictureBoxSizeMode.StretchImage;

        }

        private void Captura(object sender, NewFrameEventArgs eventArgs)
        {
            Bitmap bitmap = (Bitmap)eventArgs.Frame.Clone();
            pictureBoxFoto.Image = bitmap;
        }

        private void BtnCapturar_Click(object sender, EventArgs e)
        {
            if (pictureBoxFoto.Image != null)
            {
                imagenCapturada = new Bitmap(pictureBoxFoto.Image);
               
                MessageBox.Show("IMAGEN CAPTURADA 📸✨");
                this.DialogResult = DialogResult.OK;
                this.Close();
            }
            else
            {
                MessageBox.Show("No se capturó ninguna imagen.");
            }
        }

        private void BtnCargarDesdeArchivo_Click(object sender, EventArgs e)
        {
            OpenFileDialog openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Archivos de imagen|*.jpg;*.jpeg;*.png;*.bmp";

            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                imagenCapturada = new Bitmap(openFileDialog.FileName);
                pictureBoxFoto.Image = imagenCapturada;
                MessageBox.Show("IMAGEN CARGADA DESDE ARCHIVO 🖼️✅");

                // Establecer el resultado OK y cerrar el formulario
                this.DialogResult = DialogResult.OK;
                this.Close();
            }
            else
            {
                MessageBox.Show("No se seleccionó ninguna imagen.");
            }
        }

        public byte[] ObtenerImagenComoBytes()
        {
            if (imagenCapturada == null) return null;

            using (MemoryStream ms = new MemoryStream())
            {
                imagenCapturada.Save(ms, System.Drawing.Imaging.ImageFormat.Jpeg);
                return ms.ToArray();
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (CamaraVideo != null && CamaraVideo.IsRunning)
            {
                CamaraVideo.SignalToStop();
                CamaraVideo.WaitForStop();
                CamaraVideo.Stop();
            }
            base.OnFormClosing(e);
        }

        private void materialComboBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            if (CamaraVideo != null && CamaraVideo.IsRunning)
            {
                CamaraVideo.SignalToStop();
                CamaraVideo.WaitForStop();
                CamaraVideo.Stop();
            }

            CamaraVideo = new VideoCaptureDevice(Dispositivos[materialComboBox1.SelectedIndex].MonikerString);
            CamaraVideo.NewFrame += new NewFrameEventHandler(Captura);
            CamaraVideo.Start();
        }
    }
}

