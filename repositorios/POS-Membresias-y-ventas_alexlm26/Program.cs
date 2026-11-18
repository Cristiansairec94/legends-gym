using ImpresionPOS58.DAOs;
using ImpresionPOS58.VENTANAS;

namespace ImpresionPOS58
{
    internal static class Program
    {
        /// <summary>
        ///  The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main()
        {
            // To customize application configuration such as set high DPI settings or default font,
            // see https://aka.ms/applicationconfiguration.
            ApplicationConfiguration.Initialize();
            //Application.Run(new EliminarVentasMembresia());
            Application.Run(new Login());
            //UsuarioDAO a = new UsuarioDAO();
            //   Application.Run(new AgregarCliente(a.ObtenerPorId(4)));
//            Application.Run(new ResumenMembresiasForm());

        }
    }
}