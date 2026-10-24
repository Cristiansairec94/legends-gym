using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class Program
{
    static void Main()
    {
        string inputPath = "WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg";
        string outputPath = "src/assets/gym-background-club-noceiling.jpg";

        using (Bitmap src = new Bitmap(inputPath))
        {
            // We crop starting from Y = 420
            int cropY = 420;
            int cropHeight = src.Height - cropY; // 780
            int cropWidth = src.Width; // 1600

            int targetWidth = 3840;
            int targetHeight = 2160;

            using (Bitmap dest = new Bitmap(targetWidth, targetHeight, PixelFormat.Format24bppRgb))
            {
                using (Graphics g = Graphics.FromImage(dest))
                {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.CompositingQuality = CompositingQuality.HighQuality;

                    g.Clear(Color.FromArgb(12, 14, 18));

                    // Draw image
                    g.DrawImage(src, 
                        new Rectangle(0, 0, targetWidth, targetHeight),
                        new Rectangle(0, cropY, cropWidth, cropHeight),
                        GraphicsUnit.Pixel
                    );

                    // Now let's cleanly mask any concrete beam at the top with a smooth dark gradient.
                    // The beam was around the top 0-90 pixels in 4K resolution.
                    // By fading from pure dark black/charcoal (#0a0c10) down to transparent around Y=110,
                    // any gray concrete from the ceiling/beam is completely hidden,
                    // while the neon light strip (around Y=80-120 in 4K) glows through gorgeously!
                    using (LinearGradientBrush topFade = new LinearGradientBrush(
                        new Point(0, 0),
                        new Point(0, 95),
                        Color.FromArgb(255, 10, 12, 16),
                        Color.FromArgb(0, 10, 12, 16)))
                    {
                        g.FillRectangle(topFade, 0, 0, targetWidth, 95);
                    }

                    // Let's also cover that specific triangular beam corner (X: 1300-1850 in 4K, Y: 0-110 in 4K)
                    // with a localized soft dark brush
                    using (GraphicsPath path = new GraphicsPath())
                    {
                        path.AddEllipse(1200, -50, 900, 180);
                        using (PathGradientBrush pgb = new PathGradientBrush(path))
                        {
                            pgb.CenterColor = Color.FromArgb(255, 10, 12, 16);
                            pgb.SurroundColors = new Color[] { Color.FromArgb(0, 10, 12, 16) };
                            g.FillPath(pgb, path);
                        }
                    }
                }

                // Save with maximum quality
                ImageCodecInfo jpgEncoder = null;
                foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
                {
                    if (codec.FormatID == ImageFormat.Jpeg.Guid)
                    {
                        jpgEncoder = codec;
                        break;
                    }
                }

                EncoderParameters encoderParams = new EncoderParameters(1);
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 97L);

                dest.Save(outputPath, jpgEncoder, encoderParams);
                Console.WriteLine("Saved: " + outputPath);

                File.Copy(outputPath, "src/assets/gym-background-club-4k.jpg", true);
                File.Copy(outputPath, "src/assets/gym-background-4k.jpg", true);
                File.Copy(outputPath, "src/assets/gym-background.jpg", true);
                Console.WriteLine("All assets updated!");
            }
        }
    }
}
