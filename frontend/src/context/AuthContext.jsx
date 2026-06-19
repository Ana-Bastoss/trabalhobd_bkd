import React, { createContext, useState, useEffect } from 'react';
import { toastError, confirmDialog } from '../lib/ui';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // ==========================================
    // ESTADOS GERAIS DE AUTENTICAÇÃO E MODAIS
    // ==========================================
    const [user, setUser] = useState(null);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // ==========================================
    // EFEITO: Checar se já existe alguém logado
    // ==========================================
    useEffect(() => {
        const storedUser = localStorage.getItem('usuarioLogado');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (email, senha) => {
        try {
            const resposta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const dados = await resposta.json();

            if (dados.sucesso) {
                setUser(dados.usuario);
                localStorage.setItem('usuarioLogado', JSON.stringify(dados.usuario));
                setIsLoginOpen(false); // Fecha o modal ao logar
                return { sucesso: true, usuario: dados.usuario };
            } else {
                return { sucesso: false, mensagem: dados.mensagem };
            }
        } catch (erro) {
            console.error("Erro no login:", erro);
            return { sucesso: false, mensagem: "Erro ao conectar com o servidor." };
        }
    };

    const logout = async () => {
        const ok = await confirmDialog({
            title: 'Encerrar sessão',
            message: 'Deseja sair da sua conta?',
            confirmLabel: 'Sair',
            cancelLabel: 'Continuar'
        });
        if (ok) {
            setUser(null);
            localStorage.removeItem('usuarioLogado');
            window.location.href = '/';
        }
    };

    const openModals = {
        login: () => {
            setIsRegisterOpen(false);
            setIsLoginOpen(true);
        },
        register: () => {
            setIsLoginOpen(false);
            setIsRegisterOpen(true);
        },
        closeAll: () => {
            setIsLoginOpen(false);
            setIsRegisterOpen(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoginOpen, isRegisterOpen, openModals }}>
            {children}
        </AuthContext.Provider>
    );
};
