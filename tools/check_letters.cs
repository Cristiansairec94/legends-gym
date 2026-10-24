using System;
using System.Drawing;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            for (int y = 520; y <= 750; y += 10)
            {
                int whitePixels = 0;
                for (int x = 200; x < 1400; x++)
                {
                    Color c = bmp.GetPixel(x, y);
                    if (c.R > 180 && c.G > 180 && c.B > 180) whitePixels++;
                }
                Console.WriteLine(string.Format("Y={0}: {1} white pixels", y, whitePixels));
            }
        }
    }
}
