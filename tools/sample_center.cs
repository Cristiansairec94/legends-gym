using System;
using System.Drawing;

class Program
{
    static void Main()
    {
        using (Bitmap bmp = new Bitmap("WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg"))
        {
            // Center X=700, 750, 800, 850
            int[] xs = new int[] { 650, 700, 750, 800, 850, 900 };
            foreach (int x in xs)
            {
                for (int y = 440; y <= 510; y += 10)
                {
                    Color c = bmp.GetPixel(x, y);
                    Console.WriteLine(string.Format("X={0} Y={1}: R={2,3} G={3,3} B={4,3}", x, y, c.R, c.G, c.B));
                }
            }
        }
    }
}
