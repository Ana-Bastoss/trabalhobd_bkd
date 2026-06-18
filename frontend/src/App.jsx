import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Importação dos Componentes Globais
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Modais from './components/Modais';

// Importação das Páginas
import Home from './pages/Home';
import Servicos from './pages/Servicos';
import EventoDetalhes from './pages/EventoDetalhes';
import AdminDashboard from './pages/AdminDashboard';
import ParceiroDashboard from './pages/ParceiroDashboard';
import PrestadorDashboard from './pages/PrestadorDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Componentes Globais (Aparecem inteligentemente onde devem) */}
        <Navbar />
        <Modais />
        
        {/* Gerenciador de Rotas */}
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/evento-detalhes" element={<EventoDetalhes />} />
          
          {/* Rotas Privadas (Dashboards) */}
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/parceiro" element={<ParceiroDashboard />} />
          <Route path="/dashboard/prestador" element={<PrestadorDashboard />} />
        </Routes>

        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;