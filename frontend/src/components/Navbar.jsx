import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const { user, openModals, logout } = useContext(AuthContext);
    const location = useLocation();

    // Não renderiza a Navbar padrão dentro dos dashboards (pois eles têm header próprio)
    if (location.pathname.startsWith('/dashboard')) return null;

    return (
        <header className="navbar-direct">
            <div className="navbar-content">
                <div className="logo">
                    <Link to="/">
                        <img src="/logo.png" alt="WE CORP Logo" className="logo-img" />
                    </Link>
                </div>
                <nav>
                    <a href="/#eventos">Eventos</a>
                    <Link to="/servicos">Serviços</Link>
                    <a href="/#sobre">Sobre nós</a>
                    <a href="/#planos">Planos</a>
                    <a href="/#parceiros">Parceiros</a>
                    
                    {/* A MÁGICA DO AUTH.JS ACONTECE AQUI */}
                    {user ? (
                        <>
                            {user.tipo === 'admin' && (
                                <Link to="/dashboard/admin" style={{ color: 'var(--theme-teal-elegant)', fontWeight: '700' }}>
                                    <i className="fas fa-cogs"></i> Administrar
                                </Link>
                            )}
                            {(user.tipo === 'parceiro' || user.tipo === 'patrocinador') && (
                                <Link to="/dashboard/parceiro" style={{ color: 'var(--theme-teal-elegant)', fontWeight: '700' }}>
                                    Painel Parceiro
                                </Link>
                            )}
                            {user.tipo === 'prestador' && (
                                <Link to="/dashboard/prestador" style={{ color: 'var(--theme-teal-elegant)', fontWeight: '700' }}>
                                    Painel Prestador
                                </Link>
                            )}
                            <button className="btn-login logged-in" onClick={logout}>
                                <i className="fas fa-sign-out-alt"></i> Sair ({user.nome.split(' ')[0]})
                            </button>
                        </>
                    ) : (
                        <button className="btn-login" onClick={openModals.login}>
                            Minha conta
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;