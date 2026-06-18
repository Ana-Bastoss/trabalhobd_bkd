import React, { useState, useEffect } from 'react';
import '../assets/style.css';
// ── Única adição: importar os helpers de UI ──────────────────────────────────
import { toastSuccess, toastError, toastInfo } from '../lib/ui';
import UiHost from '../components/Ui';
// ────────────────────────────────────────────────────────────────────────────

const EventoDetalhes = () => {
    // ==========================================
    // ESTADOS DO REACT (Dados e Interface)
    // ==========================================
    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');
    
    // Estados do Checkout
    const [metodoPagamento, setMetodoPagamento] = useState('pix');
    const [isProcessing, setIsProcessing] = useState(false);
    const [pixData, setPixData] = useState(null); // Armazenará os dados do QR Code

    // Estados dos Modais (Login e Cadastro)
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // ==========================================
    // EFEITOS (Buscando dados da API ao carregar)
    // ==========================================
    useEffect(() => {
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
    const openPayment = (method) => {
        setMetodoPagamento(method);
    };

    const processarPagamento = async () => {
        // 1. Verifica se o usuário está logado
        const userStr = localStorage.getItem('usuarioLogado');
        if (!userStr) {
            // ── alert → toastInfo ────────────────────────────────────────────
            toastInfo("Você precisa fazer login para adquirir um ingresso!");
            setIsLoginOpen(true);
            return;
        }

        const usuario = JSON.parse(userStr);
        const idEvento = new URLSearchParams(window.location.search).get('id');
        const valor = evento.valor;

        if (valor === 0) {
            // ── alert → toastSuccess ─────────────────────────────────────────
            toastSuccess("Este evento é gratuito! Inscrição confirmada.");
            return;
        }

        // Bloqueia o botão e mostra o loading
        setIsProcessing(true);

        try {
            // 2. Chama a API do servidor (Mercado Pago)
            const resposta = await fetch('/api/comprar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_evento: idEvento,
                    id_usuario: usuario.id,
                    email_cliente: usuario.email,
                    metodo: metodoPagamento,
                    valor: valor
                })
            });

            const dados = await resposta.json();

            // 3. Atualiza a tela com o QR Code se for PIX
            if (dados.sucesso && metodoPagamento === 'pix') {
                setPixData({
                    base64: dados.qr_code_base64,
                    copiaCola: dados.qr_code_copia_cola
                });
            } else {
                // ── alert → toastError ───────────────────────────────────────
                toastError("Aviso: " + dados.mensagem);
                setIsProcessing(false);
            }

        } catch (error) {
            console.error(error);
            // ── alert → toastError ───────────────────────────────────────────
            toastError("Erro ao conectar com o sistema de pagamento.");
            setIsProcessing(false);
        }
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
            {/* ── UiHost renderiza toasts flutuantes ── */}
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

                                        {!pixData && (
                                            <div className="payment-tabs">
                                                <button className={`payment-tab ${metodoPagamento === 'pix' ? 'active' : ''}`} onClick={() => openPayment('pix')}><i className="fab fa-pix"></i> PIX</button>
                                                <button className={`payment-tab ${metodoPagamento === 'cartao' ? 'active' : ''}`} onClick={() => openPayment('cartao')}><i className="far fa-credit-card"></i> Cartão</button>
                                                <button className={`payment-tab ${metodoPagamento === 'boleto' ? 'active' : ''}`} onClick={() => openPayment('boleto')}><i className="fas fa-barcode"></i> Boleto</button>
                                            </div>
                                        )}

                                        {/* EXIBIÇÃO DE PIX ANTES DO PAGAMENTO */}
                                        {metodoPagamento === 'pix' && !pixData && (
                                            <div className="payment-content">
                                                <div className="pix-area">
                                                    <i className="fas fa-qrcode" style={{ fontSize: '3rem', color: 'var(--theme-teal-main)', marginBottom: '10px' }}></i>
                                                    <p>O QR Code será gerado após clicar em Finalizar.</p>
                                                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Aprovação imediata.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* EXIBIÇÃO DE PIX APÓS O PAGAMENTO (GERADO PELA API) */}
                                        {metodoPagamento === 'pix' && pixData && (
                                            <div className="payment-content">
                                                <div className="pix-area">
                                                    <h4 style={{ color: 'var(--theme-teal-main)', marginBottom: '10px' }}>Pagamento Gerado!</h4>
                                                    <img src={`data:image/jpeg;base64,${pixData.base64}`} alt="QR Code PIX" style={{ width: '200px', height: '200px', borderRadius: '10px', border: '1px solid #ccc' }} />
                                                    <p style={{ fontSize: '0.85rem', marginTop: '10px', color: '#666' }}>Ou use o código Copia e Cola:</p>
                                                    {/* ── alert → toastSuccess ao copiar ─────────────────────────── */}
                                                    <input type="text" value={pixData.copiaCola} className="search-input" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '5px' }} readOnly onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); toastSuccess('Código copiado!'); }} />
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--theme-terracotta)', marginTop: '15px', fontWeight: 600 }}>Aguardando pagamento...</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* CARTÃO E BOLETO */}
                                        {metodoPagamento === 'cartao' && !pixData && (
                                            <div className="payment-content">
                                                <div className="checkout-form">
                                                    <div className="input-group-search" style={{ marginBottom: '15px' }}>
                                                        <label>Número do Cartão</label>
                                                        <input type="text" placeholder="0000 0000 0000 0000" className="search-input" />
                                                    </div>
                                                    <div className="input-group-search" style={{ marginBottom: '15px' }}>
                                                        <label>Nome no Cartão</label>
                                                        <input type="text" placeholder="Nome impresso" className="search-input" />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                        <div className="input-group-search" style={{ flex: 1 }}>
                                                            <label>Validade</label>
                                                            <input type="text" placeholder="MM/AA" className="search-input" />
                                                        </div>
                                                        <div className="input-group-search" style={{ flex: 1 }}>
                                                            <label>CVV</label>
                                                            <input type="text" placeholder="123" className="search-input" />
                                                        </div>
                                                    </div>
                                                    <div className="input-group-search">
                                                        <label>Parcelamento</label>
                                                        <select className="filter-select">
                                                            <option>1x de R$ {evento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros</option>
                                                            <option>2x de R$ {(evento.valor / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sem juros</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {metodoPagamento === 'boleto' && !pixData && (
                                            <div className="payment-content">
                                                <div className="boleto-area">
                                                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '3rem', color: 'var(--theme-teal-main)', marginBottom: '10px' }}></i>
                                                    <p>O boleto será enviado para o seu e-mail.</p>
                                                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Pode levar até 3 dias úteis para compensar.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Botão esconde ao gerar o PIX */}
                                        {!pixData && (
                                            <button 
                                                className="btn-search btn-checkout-final" 
                                                onClick={processarPagamento}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> Processando...</> : <>Finalizar Compra <i className="fas fa-lock" style={{ marginLeft: '8px' }}></i></>}
                                            </button>
                                        )}
                                        <p className="secure-text"><i className="fas fa-shield-alt"></i> Ambiente 100% Seguro</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
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
                        <a href="/#parceiros">Parceiros</a>
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