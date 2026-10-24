import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import SiteBackground from './SiteBackground';

export default function PublicLayout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteBackground />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
