using System;
using System.Drawing;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            // Find top of letters:
            // Check rows from 440 to 520
            for (int y = 440; y <= 520; y++)
            {
                int whitePixels = 0;
                for (int x = 200; x < 1400; x++)
                {
                    Color c = bmp.GetPixel(x, y);
                    if (c.R > 200 && c.G > 200 && c.B > 200)
                    {
                        whitePixels++;
                    }
                }
                Console.WriteLine(string.Format("Y={0}: {1} white pixels", y, whitePixels));
            }
        }
    }
}
