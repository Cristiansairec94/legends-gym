using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class Program
{
    public static void Main(string[] args)
    {
        string inputPath = args[0];
        string outputPath = args[1];
        int targetWidth = 3840;
        int targetHeight = 2160;

        using (Bitmap src = new Bitmap(inputPath))
        {
            using (Bitmap dest = new Bitmap(targetWidth, targetHeight, PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(dest))
                {
                    g.CompositingQuality = CompositingQuality.HighQuality;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                    float contrast = 1.25f;
                    float brightness = -0.05f;

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
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 96L);

                dest.Save(outputPath, jpgEncoder, encoderParams);
                Console.WriteLine("4K Image Generated: " + outputPath);
            }
        }
    }
}
