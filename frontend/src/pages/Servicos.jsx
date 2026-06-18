import React, { useState, useEffect } from 'react';
import '../assets/style.css';
// ── Única adição: importar os helpers de UI ──────────────────────────────────
import { toastSuccess } from '../lib/ui';
import UiHost from '../components/Ui';
// ────────────────────────────────────────────────────────────────────────────

const Servicos = () => {
    const [servicosGlobais, setServicosGlobais] = useState([]);
    
    // Estados para os filtros
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroSetor, setFiltroSetor] = useState('all');
    const [filtroAvaliacao, setFiltroAvaliacao] = useState('all');

    // Estados para Modais
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [servicoSelecionado, setServicoSelecionado] = useState(null);

    useEffect(() => {
        const carregarServicosPublicos = async () => {
            try {
                const resposta = await fetch('/api/servicos');
                const dados = await resposta.json();
                if (dados.sucesso) {
                    // Apenas serviços Ativos aparecem na vitrine pública
                    setServicosGlobais(dados.servicos.filter(s => s.status === 'Ativo'));
                }
            } catch (erro) {
                console.error('Erro ao carregar serviços:', erro);
            }
        };

        carregarServicosPublicos();
    }, []);

    const servicosFiltrados = servicosGlobais.filter(s => {
        const matchTexto = s.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) || 
                           (s.nome_prestador && s.nome_prestador.toLowerCase().includes(filtroTexto.toLowerCase()));
        const matchSetor = filtroSetor === 'all' ? true : s.categoria === filtroSetor;
        
        let matchAvaliacao = true;
        if (filtroAvaliacao === '5') matchAvaliacao = s.avaliacao >= 4.9;
        else if (filtroAvaliacao === '4up') matchAvaliacao = s.avaliacao >= 4.0;
        
        return matchTexto && matchSetor && matchAvaliacao;
    });

    const destaques = servicosFiltrados.filter(s => s.destaque == 1);
    const gerais = servicosFiltrados.filter(s => !s.destaque || s.destaque == 0);

    // Helper para gerar as estrelas de avaliação
    const renderEstrelas = (avaliacao) => {
        const estrelas = [];
        for (let i = 1; i <= 5; i++) {
            if (avaliacao >= i) estrelas.push(<i key={i} className="fas fa-star"></i>);
            else if (avaliacao >= i - 0.5) estrelas.push(<i key={i} className="fas fa-star-half-alt"></i>);
            else estrelas.push(<i key={i} className="far fa-star"></i>);
        }
        return estrelas;
    };

    const openLogin = () => setIsLoginOpen(true);
    const closeModals = () => {
        setIsLoginOpen(false);
        setIsRegisterOpen(false);
        setServicoSelecionado(null);
    };
    const switchToRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };
    const switchToLogin = () => { setIsRegisterOpen(false); setIsLoginOpen(true); };

    return (
        <>
            {/* ── UiHost renderiza toasts flutuantes ── */}
            <UiHost />

            <div className="site-background-gradient"></div>

            <main>
                <section className="services-section">
                    <h2>Nossos Serviços</h2>
                    
                    <div className="search-wrapper">
                        <div className="search-container">
                            <div className="input-group-search">
                                <label>Pesquisar</label>
                                <input 
                                    type="text" 
                                    placeholder="Buscar serviço ou empresa..." 
                                    className="search-input" 
                                    value={filtroTexto}
                                    onChange={(e) => setFiltroTexto(e.target.value)} 
                                />
                            </div>
                            
                            <div className="input-group-search">
                                <label>Setor</label>
                                <select 
                                    className="filter-select" 
                                    value={filtroSetor}
                                    onChange={(e) => setFiltroSetor(e.target.value)}
                                >
                                    <option value="all">Todos os Setores</option>
                                    <option value="Engenharia">Engenharia</option>
                                    <option value="Tecnologia">Tecnologia</option>
                                    <option value="Educação">Educação</option>
                                </select>
                            </div>

                            <div className="input-group-search">
                                <label>Avaliação</label>
                                <select 
                                    className="filter-select" 
                                    value={filtroAvaliacao}
                                    onChange={(e) => setFiltroAvaliacao(e.target.value)}
                                >
                                    <option value="all">Todas as Avaliações</option>
                                    <option value="5">5 Estrelas</option>
                                    <option value="4up">4 Estrelas ou mais</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Recomendações do Mês (destaques) */}
                    {destaques.length > 0 && (
                        <div className="services-block recommendations-block">
                            <h3 className="section-subtitle"><i className="fas fa-star highlight-icon"></i> Recomendações do Mês</h3>
                            <div className="services-grid">
                                {destaques.map(s => (
                                    <div key={s.id} className="service-card highlight-card">
                                        <div className="service-header">
                                            <span className="tag">{s.categoria || '-'}</span>
                                            <div className="service-rating">
                                                {renderEstrelas(s.avaliacao)} <span>({Number(s.avaliacao).toFixed(1)})</span>
                                            </div>
                                        </div>
                                        <h4>{s.titulo}</h4>
                                        <p className="service-provider">por <strong style={{ color: 'var(--theme-teal-elegant)' }}>{s.nome_prestador || '-'}</strong></p>
                                        <p className="service-desc">{s.descricao || ''}</p>
                                        <button className="btn-service" onClick={() => setServicoSelecionado(s)}>
                                            Ver Detalhes <i className="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Explorar Serviços (gerais) */}
                    <div className="services-block">
                        <h3 className="section-subtitle">Explorar Serviços</h3>
                        <div className="services-grid general-grid">
                            {gerais.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', width: '100%', marginTop: '20px' }}>
                                    Nenhum serviço encontrado com estes filtros.
                                </p>
                            ) : (
                                gerais.map(s => (
                                    <div key={s.id} className="service-card">
                                        <div className="service-header">
                                            <span className="tag">{s.categoria || '-'}</span>
                                            <div className="service-rating">
                                                {renderEstrelas(s.avaliacao)} <span>({Number(s.avaliacao).toFixed(1)})</span>
                                            </div>
                                        </div>
                                        <h4>{s.titulo}</h4>
                                        <p className="service-provider">por <strong style={{ color: 'var(--theme-teal-elegant)' }}>{s.nome_prestador || '-'}</strong></p>
                                        <p className="service-desc">{s.descricao || ''}</p>
                                        <button className="btn-service" onClick={() => setServicoSelecionado(s)}>
                                            Ver Detalhes <i className="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </section>
            </main>

            <footer>
                <div className="footer-content">
                    <div className="footer-brand">
                        <img src="/logo.png" alt="WE CORP Logo" className="footer-logo" />
                        <p>We empower your enterprise</p>
                    </div>
                    <div className="footer-links">
                        <h4>Navegação</h4>
                        <a href="/#eventos">Eventos</a>
                        <a href="/servicos">Serviços</a>
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

            {/* =========================================
                MODAIS (Detalhes, Login e Cadastro)
            ========================================= */}
            
            {/* Modal de Detalhes do Serviço */}
            {servicoSelecionado && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="admin-profile-modal" style={{ maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        
                        <div className="modal-header-profile" style={{ borderBottom: 'none', marginBottom: '10px' }}>
                            <h2>{servicoSelecionado.titulo}</h2>
                            <p>Oferecido por: <strong style={{ color: 'var(--theme-teal-elegant)' }}>{servicoSelecionado.nome_prestador || '-'}</strong>
                               <span className="tag" style={{ marginLeft: '10px', background: '#e0f7fa', color: '#00838f' }}>{servicoSelecionado.categoria}</span>
                            </p>
                        </div>

                        <div className="event-grid-layout" style={{ gap: '30px', gridTemplateColumns: '1.5fr 1fr' }}>
                            <div>
                                <div className="info-section" style={{ padding: '20px', marginBottom: '25px' }}>
                                    <h3>Sobre o Serviço</h3>
                                    <p style={{ fontSize: '0.95rem', color: '#555' }}>{servicoSelecionado.descricao}</p>
                                </div>

                                <div className="info-section" style={{ padding: '20px' }}>
                                    <h3>Avaliações de Clientes</h3>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', background: '#fdfdfd', padding: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
                                        <h1 style={{ margin: 0, color: '#f39c12', fontSize: '3rem', lineHeight: 1 }}>{Number(servicoSelecionado.avaliacao).toFixed(1)}</h1>
                                        <div>
                                            <div style={{ color: '#f39c12', fontSize: '1.2rem' }}>{renderEstrelas(servicoSelecionado.avaliacao)}</div>
                                            <span style={{ color: '#666', fontSize: '0.85rem' }}>Baseado em {servicoSelecionado.total_avaliacoes || 0} avaliações</span>
                                        </div>
                                    </div>

                                    <div className="reviews-list" style={{ marginBottom: '30px' }}>
                                        <div className="review-item" style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <strong>Carlos E. <span style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'normal', marginLeft: '5px' }}>- Há 2 semanas</span></strong>
                                                <span style={{ color: '#f39c12', fontSize: '0.8rem' }}><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i></span>
                                            </div>
                                            <p style={{ fontSize: '0.9rem', color: '#555' }}>Serviço excelente! Identificaram falhas críticas na nossa rede que nem imaginávamos. Recomendo muito.</p>
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px dashed #ccc' }}>
                                        <h4 style={{ marginBottom: '10px', color: '#333' }}>Deixe sua avaliação</h4>
                                        <div className="star-rating-input" style={{ color: '#ccc', fontSize: '1.5rem', marginBottom: '15px', cursor: 'pointer' }}>
                                            <i className="far fa-star"></i><i className="far fa-star"></i><i className="far fa-star"></i><i className="far fa-star"></i><i className="far fa-star"></i>
                                        </div>
                                        <textarea className="search-input" rows="3" placeholder="Conte-nos como foi sua experiência com este serviço..." style={{ marginBottom: '10px', resize: 'none' }}></textarea>
                                        {/* ── alert → toastSuccess ──────────────────────────────────── */}
                                        <button className="btn-search" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={() => toastSuccess('Obrigado! Sua avaliação foi enviada para publicação.')}>Publicar Avaliação</button>
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-col">
                                <div className="checkout-card" style={{ position: 'sticky', top: '0', padding: '25px', backgroundColor: '#f4f7f6', border: '2px solid var(--theme-teal-light)' }}>
                                    <h3 style={{ marginBottom: '5px', color: 'var(--theme-teal-elegant)' }}>Pedir Orçamento</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#666', textAlign: 'center', marginBottom: '25px' }}>Preencha os dados e a empresa entrará em contato.</p>

                                    <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div className="input-group-search">
                                            <label style={{ fontSize: '0.8rem', color: '#555' }}>Nome Completo</label>
                                            <input type="text" className="search-input" placeholder="Seu nome" />
                                        </div>
                                        <div className="input-group-search">
                                            <label style={{ fontSize: '0.8rem', color: '#555' }}>E-mail</label>
                                            <input type="email" className="search-input" placeholder="exemplo@email.com" />
                                        </div>
                                        <div className="input-group-search">
                                            <label style={{ fontSize: '0.8rem', color: '#555' }}>Telefone / WhatsApp</label>
                                            <input type="tel" className="search-input" placeholder="(00) 00000-0000" />
                                        </div>
                                        <div className="input-group-search">
                                            <label style={{ fontSize: '0.8rem', color: '#555' }}>Sua necessidade (Opcional)</label>
                                            <textarea className="search-input" rows="2" style={{ resize: 'none' }} placeholder="Do que você precisa?"></textarea>
                                        </div>
                                        {/* ── alert → toastSuccess ──────────────────────────────────── */}
                                        <button type="button" className="btn-search" style={{ width: '100%', height: '50px', marginTop: '10px' }} onClick={() => toastSuccess('Orçamento solicitado! A empresa entrará em contato em breve.')}>
                                            <i className="fas fa-paper-plane" style={{ marginRight: '5px' }}></i> Enviar Solicitação
                                        </button>
                                    </form>

                                    <div style={{ textAlign: 'center', margin: '20px 0', position: 'relative' }}>
                                        <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />
                                        <span style={{ background: '#f4f7f6', padding: '0 10px', color: '#aaa', fontSize: '0.8rem', position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)' }}>OU CONTATE AGORA</span>
                                    </div>

                                    <button className="btn-search" style={{ width: '100%', height: '50px', backgroundColor: '#25D366', color: 'white' }} onClick={() => window.open('https://wa.me/5511999999999', '_blank')}>
                                        <i className="fab fa-whatsapp" style={{ fontSize: '1.3rem', marginRight: '8px' }}></i> Falar no WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais de Login/Cadastro */}
            {isLoginOpen && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="login-container">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="login-art">
                            <img src="/login.png" alt="Arte WE Corp" className="login-bg-image" />
                        </div>
                        <div className="login-form-box">
                            <h2>Login</h2>
                            <form>
                                <div className="input-group">
                                    <label>E-mail</label>
                                    <input type="email" placeholder="Digite seu e-mail" required />
                                </div>
                                <div className="input-group">
                                    <label>Senha</label>
                                    <input type="password" placeholder="Digite sua senha" required />
                                </div>
                                <a href="#" className="forgot-pass">Esqueci minha senha</a>
                                <button type="submit" className="btn-submit">Acessar</button>
                            </form>
                            <div className="register-link">
                                <p>Ainda não possui uma conta?</p>
                                <button className="btn-register" onClick={switchToRegister}>Criar conta</button>
                            </div>
                            <div className="social-login">
                                <a href="#"><i className="fab fa-facebook social-icon-fb"></i></a>
                                <a href="#"><i className="fab fa-google social-icon-g"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRegisterOpen && (
                <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }}>
                    <div className="login-container">
                        <button className="close-modal" onClick={closeModals}><i className="fas fa-times"></i></button>
                        <div className="login-art">
                            <img src="/login.png" alt="Arte WE Corp" className="login-bg-image" />
                        </div>
                        <div className="login-form-box">
                            <h2>Criar Conta</h2>
                            <form>
                                <div className="input-group">
                                    <label>Nome Completo</label>
                                    <input type="text" placeholder="Digite seu nome" />
                                </div>
                                <div className="input-group">
                                    <label>E-mail</label>
                                    <input type="email" placeholder="Digite seu e-mail" />
                                </div>
                                <div className="input-group">
                                    <label>Senha</label>
                                    <input type="password" placeholder="Crie uma senha" />
                                </div>
                                <button type="submit" className="btn-submit" style={{ marginTop: '15px' }}>Cadastrar</button>
                            </form>
                            <div className="register-link">
                                <p>Já possui uma conta?</p>
                                <button className="btn-register" onClick={switchToLogin}>Fazer Login</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Servicos;