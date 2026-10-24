using System;
using System.Drawing;
using System.Drawing.Imaging;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            Console.WriteLine(string.Format("Image size: {0}x{1}", bmp.Width, bmp.Height));
            
            // Let's sample pixel brightness across vertical column down the center (X = 800)
            int x = bmp.Width / 2;
            for (int y = 0; y < bmp.Height; y += 20)
            {
                Color c = bmp.GetPixel(x, y);
                Console.WriteLine(string.Format("Y={0,4}: R={1,3} G={2,3} B={3,3} (Brightness={4:F2})", y, c.R, c.G, c.B, c.GetBrightness()));
            }
        }
    }
}
