
/* ==========================================
   NA RUA - CADASTRO DE MANIFESTAÇÕES
   Arquivo: js/cadastro.js
   ========================================== */

(() => {
    "use strict";

    // Mantenha false até concluirmos
    // os testes de segurança e privacidade.
    const HABILITAR_ENVIO = true;

    const NOME_FUNCAO = "enviar-manifestacao";

    const formulario =
        document.getElementById("form-cadastro");

    const botao =
        document.getElementById("botao-enviar");

    const status =
        document.getElementById("cad-status");

    if (!formulario || !botao || !status) {
        console.error(
            "Elementos do formulário não encontrados."
        );
        return;
    }

    let enviando = false;


    // ======================================
    // 1. MENSAGENS AO VISITANTE
    // ======================================

    function mostrarMensagem(mensagem, erro = false) {
        status.textContent = mensagem;

        status.setAttribute(
            "role",
            erro ? "alert" : "status"
        );

        status.setAttribute(
            "aria-live",
            erro ? "assertive" : "polite"
        );
    }


    // ======================================
    // 2. LEITURA DOS CAMPOS
    // ======================================

    function campo(formData, nome) {
        const valor = formData.get(nome);

        return typeof valor === "string"
            ? valor.trim()
            : "";
    }

    function opcional(formData, nome) {
        return campo(formData, nome) || null;
    }


    // ======================================
    // 3. PREPARAÇÃO DOS DADOS
    // ======================================

    function prepararDados() {
        const valores = new FormData(formulario);

        return {
            titulo: campo(valores, "titulo"),

            categoria: campo(
                valores, "categoria"
            ),

            descricao: campo(
                valores, "descricao"
            ),

            data: campo(valores, "data"),

            horario: campo(
                valores, "horario"
            ),

            estado: campo(valores, "estado"),

            cidade: campo(valores, "cidade"),

            local: campo(valores, "local"),

            referencia: opcional(
                valores, "referencia"
            ),

            trajeto: opcional(
                valores, "trajeto"
            ),

            organizador: campo(
                valores, "organizador"
            ),

            // Dados privados do responsável.
            // Enviados somente à Edge Function.

            representante_nome: campo(
                valores, "representante_nome"
            ),

            representante_email: campo(
                valores, "representante_email"
            ),

            representante_telefone: opcional(
                valores, "representante_telefone"
            ),

            representante_funcao: opcional(
                valores, "representante_funcao"
            ),

            fonte: opcional(valores, "fonte"),

            cartaz_url: opcional(
                valores, "cartaz_url"
            ),

            observacoes: opcional(
                valores, "observacoes"
            ),

            declaracao_autorizacao:
                formulario.elements.namedItem(
                    "declaracao_autorizacao"
                )?.checked === true,

            declaracao_privacidade:
                formulario.elements.namedItem(
                    "declaracao_privacidade"
                )?.checked === true,

            // Token gerado pelo Cloudflare.
            turnstileToken:
                window.turnstile?.getResponse?.() || ""
        };
    }


    // ======================================
    // 4. LER ERROS DA EDGE FUNCTION
    // ======================================

    async function mensagemDaFuncao(erro) {
        try {
            if (erro?.context?.json) {
                const resposta =
                    await erro.context.json();

                if (
                    typeof resposta?.erro === "string"
                ) {
                    return resposta.erro;
                }
            }
        } catch (_) {
            // Retorna mensagem genérica
            // caso a resposta não seja JSON.
        }

        return (
            "Não foi possível enviar. " +
            "Verifique a conexão e tente novamente."
        );
    }


    // ======================================
    // 5. ENVIO DO FORMULÁRIO
    // ======================================

    formulario.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            // Bloqueio temporário de testes.

            if (!HABILITAR_ENVIO) {
                mostrarMensagem(
                    "Cadastro em preparação. " +
                    "O envio ainda está desativado.",
                    true
                );
                return;
            }

            if (
                enviando ||
                !formulario.reportValidity()
            ) {
                return;
            }

            // Cliente Supabase inicializado
            // no arquivo js/supabase.js.

            const cliente = window.naRuaSupabase;

            if (
                !cliente ||
                typeof cliente.functions?.invoke !==
                    "function"
            ) {
                mostrarMensagem(
                    "Não foi possível conectar ao " +
                    "Supabase. Atualize a página.",
                    true
                );
                return;
            }

            // Reúne os dados e o token.

            const dados = prepararDados();

            if (!dados.turnstileToken) {
                mostrarMensagem(
                    "Conclua a verificação de " +
                    "segurança antes de enviar.",
                    true
                );
                return;
            }

            enviando = true;
            botao.disabled = true;
            botao.textContent =
                "Enviando solicitação...";

            mostrarMensagem(
                "Enviando sua solicitação " +
                "para análise..."
            );

            try {

                // Envia para a Edge Function.
                // Não envia diretamente à
                // tabela privada solicitacoes.

                const { data, error } =
                    await cliente.functions.invoke(
                        NOME_FUNCAO,
                        {
                            body: dados
                        }
                    );

                if (error) {
                    throw new Error(
                        await mensagemDaFuncao(error)
                    );
                }

                if (
                    data?.ok !== true ||
                    !data?.protocolo
                ) {
                    throw new Error(
                        "Resposta inesperada do servidor."
                    );
                }

                // Confirma o recebimento.

                mostrarMensagem(
                    "Solicitação recebida para análise! " +
                    "Protocolo: " + data.protocolo +
                    ". A publicação depende de " +
                    "aprovação administrativa."
                );

                formulario.reset();

                // Limpa o token utilizado.
                window.turnstile?.reset?.();

            } catch (erro) {

                mostrarMensagem(
                    erro instanceof Error
                        ? erro.message
                        : "Falha ao enviar solicitação.",
                    true
                );

                // Tokens são de uso único.
                window.turnstile?.reset?.();

            } finally {

                enviando = false;

                botao.disabled = !HABILITAR_ENVIO;

                botao.textContent =
                    HABILITAR_ENVIO
                        ? "Enviar para aprovação"
                        : "Enviar para aprovação (em breve)";
            }
        }
    );


    // ======================================
    // 6. CONFIGURAÇÃO INICIAL
    // ======================================

    botao.disabled = !HABILITAR_ENVIO;

    botao.textContent =
        HABILITAR_ENVIO
            ? "Enviar para aprovação"
            : "Enviar para aprovação (em breve)";

})();
