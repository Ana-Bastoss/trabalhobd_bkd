import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { toastError, toastSuccess } from '../lib/ui';
import './ui.css';

// Chave pública do Stripe (cartão + boleto)
const stripePromise = loadStripe(
    'pk_test_51TjiOjKovEjRHOi6VhqVricC537A0KtMBrCXWDl8rH853GesE34oI5XhK6nESK0GVsf15Jo37zf32BmxYniIMnO300vyiYcsys'
);

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Formulário Stripe (Cartão + Boleto)
// ─────────────────────────────────────────────────────────────
const StripeForm = ({ valor, onSuccess }) => {
    const stripe   = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg]         = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsProcessing(true);
        setErrorMsg('');

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setErrorMsg(submitError.message);
            setIsProcessing(false);
            return;
        }

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/?pagamento=sucesso',
            },
        });

        if (error) {
            if (error.type !== 'validation_error') {
                setErrorMsg(error.message || 'Ocorreu um erro no pagamento.');
                toastError(error.message || 'Ocorreu um erro no pagamento.');
            }
            setIsProcessing(false);
        } else {
            toastSuccess('Pagamento aprovado!');
            setIsProcessing(false);
            if (onSuccess) onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <PaymentElement options={{ layout: 'tabs' }} />

            {errorMsg && (
                <p style={{
                    color: '#c0392b', background: '#fce4e4',
                    padding: '10px 14px', borderRadius: '8px',
                    fontSize: '0.88rem', margin: 0
                }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                    {errorMsg}
                </p>
            )}

            <button
                disabled={isProcessing || !stripe || !elements}
                className="btn-search btn-block"
                style={{ height: '50px', fontSize: '1rem', marginTop: '4px' }}
            >
                {isProcessing
                    ? <><i className="fas fa-spinner fa-spin"></i>&nbsp; Processando...</>
                    : <><i className="fas fa-lock" style={{ marginRight: '8px' }}></i>
                       Pagar R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                }
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.76rem', color: '#aaa', margin: 0 }}>
                <i className="fas fa-shield-alt" style={{ color: '#27ae60', marginRight: '5px' }}></i>
                Cartão e Boleto processados com segurança pelo Stripe
            </p>
        </form>
    );
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Painel PIX (Mercado Pago)
// ─────────────────────────────────────────────────────────────
const PanelPix = ({ valor, id_evento, id_usuario, email_cliente }) => {
    const [loading,   setLoading]   = useState(false);
    const [qrBase64,  setQrBase64]  = useState('');
    const [copiaCola, setCopiaCola] = useState('');
    const [copied,    setCopied]    = useState(false);
    const [erro,      setErro]      = useState('');

    const gerarPix = async () => {
        setLoading(true);
        setErro('');
        setQrBase64('');
        setCopiaCola('');

        try {
            const res = await fetch('/api/comprar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metodo: 'pix',
                    valor,
                    id_evento,
                    id_usuario,
                    email_cliente
                })
            });
            const data = await res.json();
            if (data.sucesso && data.qr_code_base64) {
                setQrBase64(data.qr_code_base64);
                setCopiaCola(data.qr_code_copia_cola);
            } else {
                setErro(data.mensagem || 'Erro ao gerar PIX. Tente novamente.');
            }
        } catch {
            setErro('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const copiar = () => {
        navigator.clipboard.writeText(copiaCola).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {!qrBase64 && !loading && !erro && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <i className="fas fa-qrcode"
                       style={{ fontSize: '3rem', color: '#006666', marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ color: '#555', fontSize: '0.92rem', marginBottom: '16px', lineHeight: 1.5 }}>
                        Clique no botão abaixo para gerar o QR Code PIX via Mercado Pago.<br />
                        O código expira em <strong>10 minutos</strong>.
                    </p>
                    <button className="btn-search" style={{ minWidth: '220px', height: '48px' }} onClick={gerarPix}>
                        <i className="fas fa-bolt" style={{ marginRight: '8px' }}></i>
                        Gerar QR Code PIX
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <i className="fas fa-spinner fa-spin"
                       style={{ fontSize: '2.2rem', color: '#006666' }}></i>
                    <p style={{ color: '#666', marginTop: '12px', fontSize: '0.9rem' }}>
                        Gerando PIX com o Mercado Pago...
                    </p>
                </div>
            )}

            {erro && !loading && (
                <div style={{
                    width: '100%', padding: '14px', background: '#fce4e4',
                    borderRadius: '8px', color: '#c0392b',
                    fontSize: '0.88rem', textAlign: 'center'
                }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    {erro}
                    <br />
                    <button
                        onClick={gerarPix}
                        style={{
                            marginTop: '10px', background: 'transparent', border: 'none',
                            color: '#c0392b', fontWeight: 700, cursor: 'pointer',
                            textDecoration: 'underline', fontSize: '0.88rem'
                        }}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {qrBase64 && !loading && (
                <>
                    <div style={{
                        background: '#fff', padding: '16px', borderRadius: '12px',
                        border: '2px solid #b2e0e0', display: 'inline-block'
                    }}>
                        <img
                            src={`data:image/png;base64,${qrBase64}`}
                            alt="QR Code PIX"
                            style={{ width: '200px', height: '200px', display: 'block' }}
                        />
                    </div>

                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#333' }}>
                        Valor:&nbsp;
                        <strong style={{ color: '#006666' }}>
                            R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                    </p>

                    <div style={{ width: '100%' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#666', textAlign: 'center' }}>
                            Ou copie o código abaixo e cole no seu banco:
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                            <input
                                readOnly
                                value={copiaCola}
                                style={{
                                    flex: 1, padding: '9px 12px', border: '1px solid #ccc',
                                    borderRadius: '8px', fontSize: '0.78rem',
                                    background: '#f8f9fa', color: '#444',
                                    fontFamily: 'monospace', overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}
                            />
                            <button
                                onClick={copiar}
                                className="btn-search"
                                style={{ padding: '0 16px', fontSize: '0.85rem', flexShrink: 0 }}
                            >
                                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}
                                   style={{ marginRight: '5px' }}></i>
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#f39c12', textAlign: 'center' }}>
                        <i className="fas fa-clock" style={{ marginRight: '5px' }}></i>
                        Este código expira em 10 minutos.
                    </p>

                    <button
                        onClick={gerarPix}
                        style={{
                            background: 'transparent', border: 'none', color: '#888',
                            fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline'
                        }}
                    >
                        Gerar novo código
                    </button>
                </>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.76rem', color: '#aaa', margin: 0 }}>
                <i className="fas fa-shield-alt" style={{ color: '#27ae60', marginRight: '5px' }}></i>
                PIX processado com segurança pelo Mercado Pago
            </p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: Modal com abas PIX | Cartão/Boleto
// ─────────────────────────────────────────────────────────────
const CheckoutModal = ({
    isOpen,
    onClose,
    valor,
    descricao,
    id_evento,
    id_usuario,
    email_cliente
}) => {
    const [aba,           setAba]          = useState('pix');
    const [clientSecret,  setClientSecret] = useState('');
    const [loadingSecret, setLoadingSecret] = useState(false);
    const [erroStripe,    setErroStripe]   = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAba('pix');
            setClientSecret('');
            setErroStripe('');
        }
    }, [isOpen]);

    // Busca clientSecret do Stripe apenas quando a aba é selecionada (lazy)
    useEffect(() => {
        if (!isOpen || aba !== 'stripe' || clientSecret || valor <= 0) return;

        setLoadingSecret(true);
        setErroStripe('');

        fetch('/api/comprar-stripe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor, email_cliente, id_evento, id_usuario })
        })
            .then(r => r.json())
            .then(data => {
                if (data.sucesso && data.clientSecret) setClientSecret(data.clientSecret);
                else setErroStripe(data.mensagem || 'Erro ao conectar com o Stripe.');
            })
            .catch(() => setErroStripe('Erro de conexão com o servidor.'))
            .finally(() => setLoadingSecret(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, aba]);

    if (!isOpen) return null;

    const elementsOptions = {
        clientSecret,
        locale: 'pt-BR',
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#006666',
                colorText:    '#333333',
                colorDanger:  '#c0392b',
                fontFamily:   "'Poppins', sans-serif",
                borderRadius: '8px',
            },
            rules: {
                '.Tab':           { border: '1px solid #e0e0e0', borderRadius: '8px' },
                '.Tab--selected': { borderColor: '#006666', boxShadow: '0 0 0 2px rgba(0,102,102,0.2)' },
                '.Input':         { border: '1px solid #cccccc', padding: '10px 12px' },
                '.Input:focus':   { borderColor: '#006666', boxShadow: '0 0 0 2px rgba(0,102,102,0.15)' },
            }
        }
    };

    const styleAba = (alvo) => ({
        flex: 1, padding: '10px 0', border: 'none',
        borderBottom: `3px solid ${aba === alvo ? '#006666' : 'transparent'}`,
        background: 'transparent',
        fontWeight: aba === alvo ? 700 : 500,
        color: aba === alvo ? '#006666' : '#888',
        cursor: 'pointer', fontSize: '0.92rem',
        transition: 'all 0.2s', fontFamily: 'inherit',
    });

    return (
        <div
            className="modal-overlay active"
            onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}
        >
            <div className="admin-profile-modal" style={{ maxWidth: '500px' }}>
                <button className="close-modal" onClick={onClose}>
                    <i className="fas fa-times"></i>
                </button>

                <div className="modal-header-profile">
                    <h2>
                        <i className="fas fa-shield-alt" style={{ color: 'var(--theme-teal-main)' }}></i>
                        &nbsp;Checkout Seguro
                    </h2>
                    <p style={{ color: '#555', fontSize: '0.88rem' }}>{descricao}</p>
                </div>

                {/* Valor em destaque */}
                <div style={{
                    textAlign: 'center', marginBottom: '20px', padding: '14px',
                    background: '#f0fafa', borderRadius: '10px', border: '1px solid #b2e0e0'
                }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#555', marginBottom: '3px' }}>Valor a pagar</p>
                    <p style={{ margin: 0, fontSize: '1.9rem', fontWeight: 700, color: '#006666' }}>
                        R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* Abas */}
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '24px' }}>
                    <button style={styleAba('pix')} onClick={() => setAba('pix')}>
                        <i className="fas fa-qrcode" style={{ marginRight: '7px' }}></i>PIX
                    </button>
                    <button style={styleAba('stripe')} onClick={() => setAba('stripe')}>
                        <i className="fas fa-credit-card" style={{ marginRight: '7px' }}></i>Cartão / Boleto
                    </button>
                </div>

                {/* Conteúdo da aba PIX */}
                {aba === 'pix' && (
                    <PanelPix
                        valor={valor}
                        id_evento={id_evento}
                        id_usuario={id_usuario}
                        email_cliente={email_cliente}
                    />
                )}

                {/* Conteúdo da aba Stripe */}
                {aba === 'stripe' && (
                    <>
                        {loadingSecret && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <i className="fas fa-spinner fa-spin"
                                   style={{ fontSize: '2rem', color: '#006666' }}></i>
                                <p style={{ marginTop: '14px', color: '#666', fontSize: '0.9rem' }}>
                                    Conectando ao ambiente seguro...
                                </p>
                            </div>
                        )}
                        {erroStripe && !loadingSecret && (
                            <div style={{
                                padding: '16px', background: '#fce4e4', borderRadius: '8px',
                                color: '#c0392b', fontSize: '0.88rem', textAlign: 'center'
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                                {erroStripe}
                            </div>
                        )}
                        {clientSecret && !loadingSecret && (
                            <Elements stripe={stripePromise} options={elementsOptions}>
                                <StripeForm valor={valor} onSuccess={onClose} />
                            </Elements>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CheckoutModal;