import React, { useState, useEffect } from 'react';
import '../assets/style.css';
import { toastSuccess, toastError, toastInfo } from '../lib/ui';
import UiHost from '../components/Ui';
// ── NOVO: Importando o componente global de Checkout ────────────────────────
import CheckoutModal from '../components/CheckoutModal';
// ────────────────────────────────────────────────────────────────────────────

const EventoDetalhes = () => {
    // ==========================================
    // ESTADOS DO REACT (Dados e Interface)
    // ==========================================
    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    
    // NOVO: Estado para abrir o Modal do Stripe
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Estados dos Modais (Login e Cadastro)
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // ==========================================
    // EFEITOS (Buscando dados da API ao carregar)
    // ==========================================
    useEffect(() => {
        // Carrega o usuário se já estiver logado
        const str = localStorage.getItem('usuarioLogado');
        if (str) setCurrentUser(JSON.parse(str));

        const carregarDetalhesEvento = async () => {
            const parametros = new URLSearchParams(window.location.search);
            const idEvento = parametros.get('id');

            if (!idEvento) {
                setErro("Nenhum evento selecionado.");
                setLoading(false);
                return;
            }

            try {
                const resposta = await fetch(`/api/eventos/${idEvento}`);
                const dados = await resposta.json();

                if (dados.sucesso) {
                    setEvento(dados.evento);
                } else {
                    setErro("Evento não encontrado.");
                }
            } catch (erro) {
                console.error("Erro:", erro);
                setErro("Erro ao carregar o evento.");
            }
            setLoading(false);
        };

        carregarDetalhesEvento();
    }, []);

    // ==========================================
    // FUNÇÕES DE CHECKOUT E PAGAMENTO
    // ==========================================
    const iniciarCompra = () => {
        // 1. Verifica se o usuário está logado
        const userStr = localStorage.getItem('usuarioLogado');
        if (!userStr) {
            toastInfo("Você precisa fazer login para adquirir um ingresso!");
            setIsLoginOpen(true);
            return;
        }

        const usuario = JSON.parse(userStr);
        setCurrentUser(usuario); // Atualiza o estado caso tenha acabado de logar

        if (evento.valor === 0) {
            toastSuccess("Este evento é gratuito! Inscrição confirmada.");
            return;
        }

        // 2. Abre o Modal Seguro do Stripe
        setIsCheckoutOpen(true);
    };

    // ==========================================
    // FUNÇÕES DOS MODAIS
    // ==========================================
    const closeModals = () => { setIsLoginOpen(false); setIsRegisterOpen(false); };
    const switchToRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };
    const switchToLogin = () => { setIsRegisterOpen(false); setIsLoginOpen(true); };

    // ==========================================
    // RENDERIZAÇÃO
    // ==========================================
    return (
        <>
            <UiHost />

            <div className="site-background-gradient"></div>

            <main>
                <section className="event-page-container">
                    {loading ? (
                        <h1 style={{ textAlign: 'center', marginTop: '50px' }}>Carregando evento...</h1>
                    ) : erro ? (
                        <h1 style={{ textAlign: 'center', marginTop: '50px', color: '#c62828' }}>{erro}</h1>
                    ) : (
                        <>
                            <div className="event-hero-header">
                                <span className="tag">{evento.categoria}</span>
                                <h1>{evento.titulo}</h1>
                                <div className="event-quick-info">
                                    <span><i className="far fa-calendar-alt"></i> <span>{new Date(evento.data_evento).toLocaleDateString('pt-BR')}</span></span>
                                    <span><i className="far fa-clock"></i> <span>{evento.horario}</span></span>
                                    <span><i className="fas fa-map-marker-alt"></i> <span>{evento.local}</span></span>
                                </div>
                            </div>

                            <div className="event-grid-layout">
                                <div className="event-info-col">
                                    <img 
                                        src={evento.imagem ? `/uploads/${evento.imagem}` : '/eventos.png'} 
                                        alt="Imagem do Evento" 
                                        className="event-main-img" 
                                    />
                                    
                                    <div className="info-section">
                                        <h3>Sobre o Evento</h3>
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{evento.descricao}</p>
                                    </div>

                                    {evento.conteudo && (
                                        <div className="info-section">
                                            <h3>Conteúdo Abordado</h3>
                                            <p style={{ whiteSpace: 'pre-wrap' }}>{evento.conteudo}</p>
                                        </div>
                                    )}

                                    <div className="info-section">
                                        <h3>Realização e Apoio</h3>
                                        <p><strong>Parceiro/Instituição:</strong> <span>{evento.parceiro}</span></p>
                                        <p><strong>Heads/Instrutores:</strong> <span>{evento.heads}</span></p>
                                    </div>

                                    {evento.certificacao_inclusa === 'sim' && (
                                        <div className="info-section certification-box">
                                            <i className="fas fa-award cert-icon"></i>
                                            <div>
                                                <h4>Certificação Inclusa</h4>
                                                <p>{evento.texto_certificacao || 'Ao finalizar o evento, você receberá um certificado digital de conclusão reconhecido.'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="info-section">
                                        <h3>Localização</h3>
                                        <div className="map-container">
                                            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3837.604928682025!2d-48.03617982390886!3d-15.87738278477439!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935a329d71c1b3f9%3A0x67aeb652d87ec9e0!2sUniversidade%20Cat%C3%B3lica%20de%20Bras%C3%ADlia!5e0!3m2!1spt-BR!2sbr!4v1715000000000!5m2!1spt-BR!2sbr" width="100%" height="250" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                                        </div>
                                    </div>
                                </div>

                                <div className="event-checkout-col">
                                    <div className="checkout-card">
                                        <h3>Adquirir Ingresso</h3>
                                        <div className="price-display">
                                            <span className="currency">R$</span>
                                            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--theme-blue-dark)' }}>
                                                {evento.valor === 0 ? '0,00 (Grátis)' : evento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <p className="checkout-subtitle">Lote 1 - Ingresso Profissional</p>

                                        {/* NOVO: Botão unificado que chama o Modal Seguro do Stripe */}
                                        <button 
                                            className="btn-search btn-checkout-final" 
                                            onClick={iniciarCompra}
                                        >
                                            Adquirir Ingresso <i className="fas fa-lock" style={{ marginLeft: '8px' }}></i>
                                        </button>

                                        <p className="secure-text" style={{ marginTop: '15px' }}><i className="fas fa-shield-alt"></i> Ambiente 100% Seguro</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>

            {/* ── MODAL DO STRIPE (SÓ RENDERIZA SE LOGADO E EVENTO CARREGADO) ── */}
            {evento && currentUser && (
                <CheckoutModal 
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    valor={evento.valor}
                    descricao={`Ingresso para: ${evento.titulo}`}
                    id_evento={evento.id}
                    id_usuario={currentUser.id}
                    email_cliente={currentUser.email}
                />
            )}

            {/* MODAIS AQUI PARA NÃO QUEBRAR O FLUXO DE LOGIN NA HORA DA COMPRA */}
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

export default EventoDetalhes;