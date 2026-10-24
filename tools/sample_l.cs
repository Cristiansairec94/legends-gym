using System;
using System.Drawing;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            // The letters LEYENDS GYM are centered around Y = 250 - 400? Or where are they?
            // Let's sample across the whole height from 0 to 1200 at X = 250 (where letter 'L' is!)
            int x = 250;
            Console.WriteLine(string.Format("Sampling at X={0} (Letter L column):", x));
            for (int y = 0; y < 1200; y += 30)
            {
                Color c = bmp.GetPixel(x, y);
                Console.WriteLine(string.Format("Y={0,4}: R={1,3} G={2,3} B={3,3}", y, c.R, c.G, c.B));
            }
        }
    }
}
