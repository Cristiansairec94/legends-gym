using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace GymManagementBLL.Services.AttachmentService
{
    public class AttachmentService : IAttachmentService
    {
        private readonly IWebHostEnvironment _webHost;
        private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png" };
        private readonly long _maxFileSize = 5 * 1024 * 1024;

        public AttachmentService(IWebHostEnvironment webHost)
        {
            _webHost = webHost;
        }

        public string? Upload(string folderName, IFormFile file)
        {
            try
            {
                if (string.IsNullOrEmpty(folderName) || file == null || file.Length == 0)
                    return null;

                var extension = Path.GetExtension(file.FileName).ToLower();
                if (!_allowedExtensions.Contains(extension))
                    return null;

                if (file.Length > _maxFileSize)
                    return null;

                var folderPath = Path.Combine(_webHost.WebRootPath, "images", folderName);
                if (!Directory.Exists(folderPath))
                    Directory.CreateDirectory(folderPath);

                var fileName = Guid.NewGuid() + extension;
                var filePath = Path.Combine(folderPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    file.CopyTo(stream);
                }

                return fileName;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public bool Delete(string fileName, string folderName)
        {
            try
            {
                if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(folderName))
                    return false;

                var filePath = Path.Combine(_webHost.WebRootPath, "images", folderName, fileName);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return true;
                }

                return false;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
