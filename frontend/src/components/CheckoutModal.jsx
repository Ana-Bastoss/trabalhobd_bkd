import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toastError, toastSuccess } from '../lib/ui';
import './ui.css'; 

// Substitua pela sua Chave Pública (Publishable key) do Stripe
const stripePromise = loadStripe('pk_test_SUA_CHAVE_PUBLICA_AQUI');

// ==========================================
// SUB-COMPONENTE: O Formulário de Pagamento
// ==========================================
const CheckoutForm = ({ valor, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Impede a submissão se o Stripe ainda não carregou na tela
        if (!stripe || !elements) return;

        setIsProcessing(true);

        // Confirma o pagamento com o Stripe
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Para onde o usuário vai após pagar (ex: tela de sucesso)
                // Pagamentos com Boleto renderizam uma tela do próprio Stripe com o código de barras
                return_url: window.location.origin + '/?pagamento=sucesso',
            },
        });

        if (error) {
            toastError(error.message || 'Ocorreu um erro no pagamento.');
            setIsProcessing(false);
        } else {
            // Se não houver erro, a requisição deu certo!
            toastSuccess('Pagamento aprovado!');
            setIsProcessing(false);
            if (onSuccess) onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* PaymentElement é a mágica do Stripe. Ele renderiza os inputs de Cartão, Boleto, etc. */}
            <PaymentElement />
            
            <button 
                disabled={isProcessing || !stripe || !elements} 
                className="btn-search btn-block" 
                style={{ height: '50px', fontSize: '1.1rem', marginTop: '10px' }}
            >
                {isProcessing ? (
                    <><i className="fas fa-spinner fa-spin"></i> Processando...</>
                ) : (
                    <>Pagar R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                )}
            </button>
        </form>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL: O Modal
// ==========================================
const CheckoutModal = ({ isOpen, onClose, valor, descricao, id_evento, id_usuario, email_cliente }) => {
    const [clientSecret, setClientSecret] = useState('');

    useEffect(() => {
        // Só solicita a intenção de pagamento se o modal abrir e houver um valor a ser cobrado
        if (isOpen && valor > 0) {
            fetch('/api/comprar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valor, email_cliente, id_evento, id_usuario })
            })
            .then(res => res.json())
            .then(data => {
                if (data.sucesso && data.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    toastError('Erro ao iniciar comunicação com o banco.');
                }
            })
            .catch(() => toastError('Erro de conexão com o servidor.'));
        }
    }, [isOpen, valor, id_evento, id_usuario, email_cliente]);

    // Se o modal estiver fechado, não renderiza nada
    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
            <div className="admin-profile-modal" style={{ maxWidth: '500px' }}>
                <button className="close-modal" onClick={onClose}><i className="fas fa-times"></i></button>
                
                <div className="modal-header-profile">
                    <h2><i className="fas fa-shield-alt" style={{ color: 'var(--theme-teal-main)' }}></i> Checkout Seguro</h2>
                    <p>{descricao}</p>
                </div>

                <div style={{ padding: '10px 0' }}>
                    {/* Só exibe o formulário se já tiver recebido a autorização secreta da sua API */}
                    {clientSecret ? (
                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                            <CheckoutForm valor={valor} onSuccess={onClose} />
                        </Elements>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--theme-teal-main)' }}></i>
                            <p style={{ marginTop: '15px', color: '#666' }}>Conectando com ambiente seguro do Stripe...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;