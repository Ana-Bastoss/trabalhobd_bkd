import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Footer = () => {
    const location = useLocation();
    
    // Esconde o footer nos dashboards
    if (location.pathname.startsWith('/dashboard')) return null;

    return (
        <footer>
            <div className="footer-content">
                <div className="footer-brand">
                    <img src="/logo.png" alt="WE CORP Logo" className="footer-logo" />
                    <p>We empower your enterprise</p>
                </div>
                <div className="footer-links">
                    <h4>Navegação</h4>
                    <a href="/#eventos">Eventos</a>
                    <Link to="/servicos">Serviços</Link>
                    <a href="/#sobre">Sobre nós</a>
                </div>
                <div className="footer-social">
                    <h4>Redes Sociais</h4>
                    <div className="social-icons">
                        <a href="#"><i className="fab fa-linkedin"></i> LinkedIn</a>
                        <a href="#"><i className="fab fa-instagram"></i> Instagram</a>
                        <a href="#"><i className="fab fa-youtube"></i> YouTube</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;