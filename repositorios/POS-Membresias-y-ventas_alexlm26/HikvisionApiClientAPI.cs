using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace ImpresionPOS58
{
    public class UsuarioAPI
    {
        public string EmployeeNo { get; set; }
        public string NombreCompleto { get; set; }
        public DateTime FechaVencimiento { get; set; }
        public byte[] FotoBytes { get; set; } // FOTO EN BYTE[]
    }

    public class HikvisionApiClientAPI
    {
        private readonly HttpClient _client;
        private readonly string _baseUrl;
        private readonly string _usuario;
        private readonly string _contrasena;

        public HikvisionApiClientAPI(string baseUrl, string usuario, string contrasena)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _usuario = usuario;
            _contrasena = contrasena;

            var handler = new HttpClientHandler
            {
                Credentials = new NetworkCredential(_usuario, _contrasena)
            };

            _client = new HttpClient(handler);
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<bool> AgregarUsuarioAPIAsync(UsuarioAPI usuario)
        {
            var userJson = new
            {
                UserInfo = new
                {
                    employeeNo = usuario.EmployeeNo,
                    name = usuario.NombreCompleto,
                    userType = "normal",
                    Valid = new
                    {
                        enable = true,
                        beginTime = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss"),
                        endTime = usuario.FechaVencimiento.ToString("yyyy-MM-ddTHH:mm:ss")
                    },
                    doorRight = "1",
                    maxOpenDoorTime = 10,
                    floorNumber = 1
                }
            };

            var jsonString = JsonConvert.SerializeObject(userJson);
            var urlAgregar = $"{_baseUrl}/ISAPI/AccessControl/UserInfo/Record?format=json";
            var contentUser = new StringContent(jsonString, Encoding.UTF8, "application/json");

            var responseUser = await _client.PostAsync(urlAgregar, contentUser);
            if (!responseUser.IsSuccessStatusCode) return false;
            return true;
        }

        public async Task<bool> ModificarFechaAPIAsync(string employeeNo, DateTime nuevaFecha)
        {
            var userJson = new
            {
                UserInfo = new
                {
                    employeeNo = employeeNo,
                    Valid = new
                    {
                        enable = true,
                        beginTime = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss"),
                        endTime = nuevaFecha.ToString("yyyy-MM-ddTHH:mm:ss")
                    }
                }
            };

            var jsonString = JsonConvert.SerializeObject(userJson);
            var urlModificar = $"{_baseUrl}/ISAPI/AccessControl/UserInfo/Modify?format=json&UserID={employeeNo}";
            var content = new StringContent(jsonString, Encoding.UTF8, "application/json");

            var response = await _client.PutAsync(urlModificar, content);

            return response.IsSuccessStatusCode;
        }
    }
}