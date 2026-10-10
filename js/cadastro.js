
/* ==========================================
   NA RUA - CADASTRO DE MANIFESTAÇÕES
   Arquivo: js/cadastro.js
   ========================================== */

(() => {
    "use strict";

    // Interface de envio habilitada.
    // O servidor também precisa estar ativo.

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

    const textoOriginal =
        "Enviar para aprovação";

    /* ======================================
       1. MENSAGENS AO VISITANTE
       ====================================== */

    function mostrarMensagem(
        mensagem,
        erro = false
    ) {

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

    /* ======================================
       2. LEITURA DOS CAMPOS
       ====================================== */

    function campo(formData, nome) {

        const valor = formData.get(nome);

        return typeof valor === "string"
            ? valor.trim()
            : "";
    }

    function opcional(formData, nome) {
        return campo(formData, nome) || null;
    }

    /* ======================================
       3. PREPARAR OS DADOS
       ====================================== */

    function prepararDados() {

        const valores = new FormData(formulario);

        return {

            titulo: campo(
                valores, "titulo"
            ),

            categoria: campo(
                valores, "categoria"
            ),

            descricao: campo(
                valores, "descricao"
            ),

            data: campo(
                valores, "data"
            ),

            horario: campo(
                valores, "horario"
            ),

            estado: campo(
                valores, "estado"
            ),

            cidade: campo(
                valores, "cidade"
            ),

            local: campo(
                valores, "local"
            ),

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

            representante_nome: campo(
                valores,
                "representante_nome"
            ),

            representante_email: campo(
                valores,
                "representante_email"
            ),

            representante_telefone: opcional(
                valores,
                "representante_telefone"
            ),

            representante_funcao: opcional(
                valores,
                "representante_funcao"
            ),

            fonte: opcional(
                valores, "fonte"
            ),

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

            // Token Cloudflare Turnstile.

            turnstileToken:
                window.turnstile?.getResponse?.() || ""
        };
    }

    /* ======================================
       4. LER ERROS DO SUPABASE
       ====================================== */

    async function mensagemDaFuncao(erro) {

        try {

            if (
                erro?.context &&
                typeof erro.context.json ===
                    "function"
            ) {

                const resposta =
                    await erro.context.json();

                if (
                    typeof resposta?.erro === "string"
                ) {
                    return resposta.erro;
                }

            }

        } catch {
            // Mantém mensagem genérica.
        }

        return (
            "Não foi possível enviar a solicitação. " +
            "Verifique sua conexão e tente novamente."
        );
    }

    /* ======================================
       5. ENVIAR O FORMULÁRIO
       ====================================== */

    formulario.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (!HABILITAR_ENVIO) {

                mostrarMensagem(
                    "O cadastro está temporariamente desativado.",
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

            const cliente =
                window.naRuaSupabase;

            if (
                !cliente ||
                typeof cliente.functions?.invoke !==
                    "function"
            ) {

                mostrarMensagem(
                    "Não foi possível conectar ao Supabase. " +
                    "Atualize a página.",
                    true
                );

                return;
            }

            const dados = prepararDados();

            // Confirma declarações obrigatórias.

            if (
                !dados.declaracao_autorizacao ||
                !dados.declaracao_privacidade
            ) {

                mostrarMensagem(
                    "Aceite as declarações obrigatórias.",
                    true
                );

                return;
            }

            // Confirma verificação de segurança.

            if (!dados.turnstileToken) {

                mostrarMensagem(
                    "Conclua a verificação de segurança " +
                    "antes de enviar.",
                    true
                );

                return;
            }

            // Impede envios simultâneos.

            enviando = true;

            botao.disabled = true;

            botao.textContent =
                "Enviando solicitação...";

            mostrarMensagem(
                "Enviando sua solicitação para análise..."
            );

            try {

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

                // Cadastro aceito.
                // Ainda depende de aprovação.

                mostrarMensagem(
                    "Solicitação recebida com sucesso! " +
                    "Protocolo: " +
                    data.protocolo +
                    ". A manifestação será analisada " +
                    "antes de aparecer na agenda."
                );

                formulario.reset();

                // Token é de uso único.

                window.turnstile?.reset?.();

            } catch (erro) {

                mostrarMensagem(
                    erro instanceof Error
                        ? erro.message
                        : "Falha ao enviar a solicitação.",
                    true
                );

                // Solicita novo token para
                // uma eventual nova tentativa.

                window.turnstile?.reset?.();

            } finally {

                enviando = false;

                botao.disabled =
                    !HABILITAR_ENVIO;

                botao.textContent =
                    HABILITAR_ENVIO
                        ? textoOriginal
                        : "Enviar para aprovação (em breve)";
            }
        }
    );

    /* ======================================
       6. CONFIGURAÇÃO INICIAL
       ====================================== */

    botao.disabled = !HABILITAR_ENVIO;

    botao.textContent =
        HABILITAR_ENVIO
            ? textoOriginal
            : "Enviar para aprovação (em breve)";

})();
