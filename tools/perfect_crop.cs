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
        string outputPath = "src/assets/gym-background-club-perfect.jpg";

        using (Bitmap src = new Bitmap(inputPath))
        {
            // Crop out ceiling completely:
            // Top neon starts ~490, letters start ~520.
            // Cropping at Y = 478 removes the entire ceiling and the beam!
            int cropY = 478;
            int cropHeight = src.Height - cropY; // 1200 - 478 = 722
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

                    g.Clear(Color.FromArgb(7, 8, 12));

                    // Draw image mapped so that:
                    // Top neon & "LEYENDS GYM" are at the top (with a nice 40px margin)
                    // Treadmills are grounded at the bottom
                    g.DrawImage(src, 
                        new Rectangle(0, 0, targetWidth, targetHeight),
                        new Rectangle(0, cropY, cropWidth, cropHeight),
                        GraphicsUnit.Pixel
                    );

                    // Smooth dark top gradient to make sure the top edge fades seamlessly into darkness
                    using (LinearGradientBrush topFade = new LinearGradientBrush(
                        new Point(0, 0),
                        new Point(0, 100),
                        Color.FromArgb(240, 7, 8, 12),
                        Color.FromArgb(0, 7, 8, 12)))
                    {
                        g.FillRectangle(topFade, 0, 0, targetWidth, 100);
                    }

                    // Add subtle glow to the top neon LED line
                    using (LinearGradientBrush neonGlow = new LinearGradientBrush(
                        new Point(0, 80),
                        new Point(0, 160),
                        Color.FromArgb(40, 255, 255, 255),
                        Color.FromArgb(0, 255, 255, 255)))
                    {
                        g.FillRectangle(neonGlow, 0, 80, targetWidth, 80);
                    }
                }

                // Save with maximum quality (98%)
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
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 98L);

                dest.Save(outputPath, jpgEncoder, encoderParams);
                Console.WriteLine("Saved: " + outputPath);

                File.Copy(outputPath, "src/assets/gym-background-club-4k.jpg", true);
                File.Copy(outputPath, "src/assets/gym-background-4k.jpg", true);
                File.Copy(outputPath, "src/assets/gym-background.jpg", true);
                Console.WriteLine("All assets successfully updated with perfect crop!");
            }
        }
    }
}
