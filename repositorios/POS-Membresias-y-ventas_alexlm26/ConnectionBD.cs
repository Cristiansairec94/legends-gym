using System;
using System.Collections.Generic;
using System.Data;
using MySql.Data.MySqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ImpresionPOS58
{
    public static class ConnectionBD

    {
       //private static string connectionString = "server=localhost;database=mydb;user=GymEgo2025;password=eLdIabl0360.;";
       private static string connectionString = "server=192.168.1.27;database=mydb;user=GymEgo2025;password=eLdIabl0360.;";
       //private static string connectionString = "server=localhost;database=mydb;user=root;password=root;";
        public static IDbConnection GetConnection()
        {
            return new MySqlConnection(connectionString);
        }
    }
}

