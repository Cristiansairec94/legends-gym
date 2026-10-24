using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class Program
{
    public static void Main(string[] args)
    {
        string inputPath = args.Length > 0 ? args[0] : @"c:\Users\CORSAIR\Desktop\gym\public\gym-background-club-8k.jpg";
        string outputPath = args.Length > 1 ? args[1] : @"c:\Users\CORSAIR\Desktop\gym\public\gym-background-club-8k.jpg";
        
        // 8K UHD Standard: 7680 x 4320
        int targetWidth = 7680;
        int targetHeight = 4320;

        Console.WriteLine("Cargando imagen: " + inputPath);
        using (Bitmap src = new Bitmap(inputPath))
        {
            Console.WriteLine(string.Format("Dimensiones originales: {0} x {1}", src.Width, src.Height));
            Console.WriteLine(string.Format("Procesando reescalado a 8K UHD: {0} x {1}...", targetWidth, targetHeight));

            using (Bitmap dest = new Bitmap(targetWidth, targetHeight, PixelFormat.Format24bppRgb))
            {
                using (Graphics g = Graphics.FromImage(dest))
                {
                    g.CompositingQuality = CompositingQuality.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                    // Ajuste sutil de nitidez y contraste para aspecto 8K cinematográfico
                    float contrast = 1.08f;
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
                        g.DrawImage(src, new Rectangle(0, 0, targetWidth, targetHeight), 0, 0, src.Width, src.Height, GraphicsUnit.Pixel, ia);
                    }
                }

                ImageCodecInfo jpgEncoder = null;
                foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
                {
                    if (codec.MimeType == "image/jpeg") { jpgEncoder = codec; break; }
                }

                EncoderParameters encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 95L);

                string tempOut = outputPath + ".tmp.jpg";
                dest.Save(tempOut, jpgEncoder, encoderParams);
                
                src.Dispose();
                if (System.IO.File.Exists(outputPath)) {
                    System.IO.File.Delete(outputPath);
                }
                System.IO.File.Move(tempOut, outputPath);

                Console.WriteLine("¡Imagen 8K UHD guardada con éxito!: " + outputPath);
            }
        }
    }
}
