using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class ProgramZoomer
{
    public static void Main(string[] args)
    {
        string inputPath = args.Length > 0 ? args[0] : @"c:\Users\CORSAIR\Desktop\gym\public\gym-background.jpg";
        string outputPath = args.Length > 1 ? args[1] : @"c:\Users\CORSAIR\Desktop\gym\public\gym-background-zoom8k.jpg";

        Console.WriteLine("Cargando imagen: " + inputPath);
        using (Bitmap src = new Bitmap(inputPath))
        {
            Console.WriteLine(string.Format("Tamaño fuente: {0} x {1}", src.Width, src.Height));

            // Target 8K UHD: 7680 x 4320 (16:9)
            int targetWidth = 7680;
            int targetHeight = 4320;

            // Zoom ~1.35x para acercamiento cinematográfico
            // Crop width y height manteniendo ratio exacto 16:9
            float zoom = 1.35f;
            int cropW = (int)(src.Width / zoom);   // 5688
            int cropH = (int)(src.Height / zoom);  // 3200

            // Centrado horizontal
            int cropX = (src.Width - cropW) / 2;

            // Vertical: recortamos el exceso de techo arriba (~780px desde el borde superior)
            // Esto deja exactamente un margen superior arquitectónico elegante sobre la tira LED del logo
            int cropY = (int)(src.Height * 0.18f); // ~777px

            // Aseguramos que no se salga de los límites
            if (cropY + cropH > src.Height) {
                cropY = src.Height - cropH;
            }

            Console.WriteLine(string.Format("Región de acercamiento (Crop): X={0}, Y={1}, W={2}, H={3}", cropX, cropY, cropW, cropH));

            using (Bitmap dest = new Bitmap(targetWidth, targetHeight, PixelFormat.Format24bppRgb))
            {
                using (Graphics g = Graphics.FromImage(dest))
                {
                    g.CompositingQuality = CompositingQuality.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                    // Ajuste sutil de nitidez y contraste 8K
                    float contrast = 1.06f;
                    float brightness = 0.01f;

                    ColorMatrix cm = new ColorMatrix(new float[][] {
                        new float[] {contrast, 0, 0, 0, 0},
                        new float[] {0, contrast, 0, 0, 0},
                        new float[] {0, 0, contrast, 0, 0},
                        new float[] {0, 0, 0, 1.0f, 0},
                        new float[] {brightness, brightness, brightness, 0, 1.0f}
                    });

                    using (ImageAttributes ia = new ImageAttributes())
                    {
                        ia.SetColorMatrix(cm, ColorMatrixFlag.Default, ColorAdjustType.Bitmap);
                        Rectangle destRect = new Rectangle(0, 0, targetWidth, targetHeight);
                        g.DrawImage(src, destRect, cropX, cropY, cropW, cropH, GraphicsUnit.Pixel, ia);
                    }
                }

                ImageCodecInfo jpgEncoder = null;
                foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
                {
                    if (codec.MimeType == "image/jpeg") { jpgEncoder = codec; break; }
                }

                EncoderParameters encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 96L);

                string tempOut = outputPath + ".tmp.jpg";
                dest.Save(tempOut, jpgEncoder, encoderParams);

                src.Dispose();
                if (System.IO.File.Exists(outputPath)) {
                    System.IO.File.Delete(outputPath);
                }
                System.IO.File.Move(tempOut, outputPath);

                Console.WriteLine("¡Acercamiento 8K completado con éxito!: " + outputPath);
            }
        }
    }
}
