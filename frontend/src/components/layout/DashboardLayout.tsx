import Navbar from "./Navbar";
import "./layout.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sf-layout">
      <Navbar />

      <main className="sf-layout-content">
        {children}
      </main>
    </div>
  );
}
