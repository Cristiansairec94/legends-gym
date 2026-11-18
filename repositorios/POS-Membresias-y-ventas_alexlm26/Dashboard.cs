using MaterialSkin.Controls;
using MaterialSkin;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ImpresionPOS58
{
    public partial class Dashboard : MaterialForm
    {
        private readonly MaterialSkinManager skinManager;

        public Dashboard()
        {
            InitializeComponent();

            skinManager = MaterialSkinManager.Instance;
            skinManager.AddFormToManage(this);
            skinManager.Theme = MaterialSkinManager.Themes.LIGHT;
            skinManager.ColorScheme = new ColorScheme(
                Primary.BlueGrey800, Primary.BlueGrey900,
                Primary.BlueGrey500, Accent.LightBlue200,
                TextShade.WHITE
            );

            switchTema.Checked = false;
            switchTema.CheckedChanged += SwitchTema_CheckedChanged;

            CargarDatosEjemplo();
        }

        private void SwitchTema_CheckedChanged(object sender, EventArgs e)
        {
            if (switchTema.Checked)
                skinManager.Theme = MaterialSkinManager.Themes.DARK;
            else
                skinManager.Theme = MaterialSkinManager.Themes.LIGHT;
        }

        private void CargarDatosEjemplo()
        {
            lblVentasHoy.Text = "$1500";
            lblVentasSemana.Text = "$8900";
            lblClientesActivos.Text = "25";
            lblProductosBajos.Text = "3";
        }
    }
}
