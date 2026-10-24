using System;
using System.Drawing;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            int minY = 1200, maxY = 0;
            for (int y = 430; y < 800; y++)
            {
                for (int x = 200; x < 1400; x++)
                {
                    Color c = bmp.GetPixel(x, y);
                    if (c.R > 180 && c.G > 180 && c.B > 180)
                    {
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            Console.WriteLine(string.Format("White letters Y range: {0} to {1}", minY, maxY));
        }
    }
}
