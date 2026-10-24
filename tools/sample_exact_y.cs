using System;
using System.Drawing;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            // Sample X=250 between 460 and 550
            for (int y = 460; y <= 550; y += 2)
            {
                Color c = bmp.GetPixel(250, y);
                Console.WriteLine(string.Format("Y={0}: R={1,3} G={2,3} B={3,3}", y, c.R, c.G, c.B));
            }
        }
    }
}
