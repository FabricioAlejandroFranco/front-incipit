import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Search from "./assets/components/pages/Search";

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-5xl mx-auto p-4">
        <nav className="flex gap-4 mb-4">
          <Link to="/" className="text-blue-700">
            Inicio
          </Link>
          <Link to="/search" className="text-blue-700">
            Buscar por Íncipit
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={<div>Inicio</div>} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
