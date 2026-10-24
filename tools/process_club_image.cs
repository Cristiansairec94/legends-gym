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
        string outputPath = "src/assets/gym-background-club-4k.jpg";

        if (!File.Exists(inputPath))
        {
            Console.WriteLine("Input file not found: " + inputPath);
            return;
        }

        using (Image src = Image.FromFile(inputPath))
        {
            Console.WriteLine(string.Format("Source image size: {0}x{1}", src.Width, src.Height));

            // Target 4K UHD: 3840 x 2160
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

                    // Fill background with black
                    g.Clear(Color.Black);

                    // Compute aspect fill rectangle
                    float srcRatio = (float)src.Width / src.Height;
                    float destRatio = (float)targetWidth / targetHeight;

                    float drawWidth, drawHeight, drawX, drawY;

                    if (srcRatio > destRatio)
                    {
                        drawHeight = targetHeight;
                        drawWidth = targetHeight * srcRatio;
                        drawX = (targetWidth - drawWidth) / 2f;
                        drawY = 0;
                    }
                    else
                    {
                        drawWidth = targetWidth;
                        drawHeight = targetWidth / srcRatio;
                        drawX = 0;
                        drawY = (targetHeight - drawHeight) / 2f;
                    }

                    // Draw image with high quality
                    using (ImageAttributes wrapMode = new ImageAttributes())
                    {
                        wrapMode.SetWrapMode(WrapMode.TileFlipXY);
                        g.DrawImage(src, new Rectangle((int)drawX, (int)drawY, (int)drawWidth, (int)drawHeight), 0, 0, src.Width, src.Height, GraphicsUnit.Pixel, wrapMode);
                    }
                }

                // Save with maximum JPEG quality 96%
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
                encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 96L);

                dest.Save(outputPath, jpgEncoder, encoderParams);
                Console.WriteLine("Saved 4K image to: " + outputPath);

                // Also copy to src/assets/gym-background-4k.jpg so all components use it
                File.Copy(outputPath, "src/assets/gym-background-4k.jpg", true);
                Console.WriteLine("Overwritten src/assets/gym-background-4k.jpg successfully");
            }
        }
    }
}
