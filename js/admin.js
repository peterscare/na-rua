
/* ==========================================
   NA RUA - PAINEL ADMINISTRATIVO
   Arquivo: js/admin.js
   ========================================== */

(() => {
    "use strict";

    const cliente = window.naRuaSupabase;
    const porId = (id) => document.getElementById(id);

    // ======================================
    // 1. ELEMENTOS DO HTML
    // ======================================

    const telas = {
        carregamento: porId("admin-carregamento"),
        login: porId("admin-login"),
        painel: porId("admin-painel")
    };

    const formLogin = porId("form-login");
    const botaoEntrar = porId("admin-entrar");
    const botaoSair = porId("admin-sair");
    const botaoAtualizar = porId("admin-atualizar");
    const filtroStatus = porId("admin-filtro-status");

    const lista = porId("admin-lista");
    const total = porId("admin-total");
    const painelDetalhes = porId("admin-detalhes");
    const detalheTitulo = porId("admin-detalhe-titulo");
    const detalheCampos = porId("admin-detalhe-campos");

    // Botões administrativos
    const acoes = porId("admin-acoes");
    const botaoAprovar = porId("admin-aprovar");
    const botaoRejeitar = porId("admin-rejeitar");
    const mensagemAcao = porId("admin-acao-mensagem");

    const emailUsuario = porId("admin-usuario-email");
    const aviso = porId("admin-aviso");
    const mensagemLogin = porId("admin-login-mensagem");

    let solicitacaoSelecionada = null;
    let operacaoEmAndamento = false;
    let versaoConsulta = 0;


    // ======================================
    // 2. CONTROLE DAS TELAS
    // ======================================

    function limparDetalhes() {

        solicitacaoSelecionada = null;

        detalheCampos.replaceChildren();

        detalheTitulo.textContent =
            "Detalhes da solicitação";

        mensagemAcao.textContent = "";

        acoes.hidden = true;

        botaoAprovar.disabled = true;
        botaoRejeitar.disabled = true;

        painelDetalhes.hidden = true;
    }


    function mostrarTela(nome) {

        for (const [chave, elemento] of
            Object.entries(telas)) {

            elemento.hidden = chave !== nome;
        }

        if (nome !== "painel") {

            // Invalida consultas anteriores.
            ++versaoConsulta;

            // Limpa os dados privados.
            lista.replaceChildren();
            limparDetalhes();

            total.textContent = "0";
            emailUsuario.textContent = "";
            aviso.textContent = "";
        }
    }


    function mostrarAviso(texto) {
        aviso.textContent = texto;
    }


    function ajustarBotoes() {

        const pendente =
            solicitacaoSelecionada?.status ===
            "pendente";

        acoes.hidden = !pendente;

        botaoAprovar.disabled =
            !pendente || operacaoEmAndamento;

        botaoRejeitar.disabled =
            !pendente || operacaoEmAndamento;

        botaoAtualizar.disabled =
            operacaoEmAndamento;

        filtroStatus.disabled =
            operacaoEmAndamento;

        botaoSair.disabled =
            operacaoEmAndamento;
    }


    function criarParagrafo(texto) {

        const p = document.createElement("p");

        p.textContent = texto;

        return p;
    }


    // ======================================
    // 3. VERIFICAR ADMINISTRADOR
    // ======================================

    async function verificarAdministrador() {

        // Consulta o usuário autenticado.

        const { data, error } =
            await cliente.auth.getUser();

        if (error || !data?.user) {

            mostrarTela("login");
            return;
        }

        const usuario = data.user;

        // Verifica se o usuário possui
        // permissão administrativa.
        //
        // A consulta também é protegida
        // pelo RLS do Supabase.

        const {
            data: administrador,
            error: erroPermissao
        } = await cliente
            .from("administradores")
            .select("user_id")
            .eq("user_id", usuario.id)
            .maybeSingle();

        if (erroPermissao) {

            throw new Error(
                "Não foi possível verificar a permissão: " +
                erroPermissao.message
            );
        }

        if (!administrador) {

            await cliente.auth.signOut();

            mostrarTela("login");

            mensagemLogin.textContent =
                "Esta conta não possui acesso administrativo.";

            return;
        }

        // Administrador confirmado.

        emailUsuario.textContent =
            usuario.email || "Administrador";

        mostrarTela("painel");

        await carregarSolicitacoes();
    }


    // ======================================
    // 4. FORMATAÇÃO DE DATAS
    // ======================================

    function formatarData(valor) {

        if (
            typeof valor !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(valor)
        ) {
            return valor || "Não informada";
        }

        const [ano, mes, dia] =
            valor.split("-");

        return `${dia}/${mes}/${ano}`;
    }


    // ======================================
    // 5. CRIAR ITEM NA LISTA
    // ======================================

    function criarItem(solicitacao) {

        const botao =
            document.createElement("button");

        botao.type = "button";
        botao.className = "admin-item";

        // Título

        const titulo =
            document.createElement("h3");

        titulo.textContent =
            solicitacao.titulo || "Sem título";

        // Localização

        const local = criarParagrafo(
            `${solicitacao.cidade || ""} - ` +
            `${solicitacao.estado || ""}`
        );

        // Data

        const data = criarParagrafo(
            "Data: " +
            formatarData(solicitacao.data)
        );

        // Situação

        const situacao = criarParagrafo(
            "Situação: " + solicitacao.status
        );

        botao.append(
            titulo,
            local,
            data,
            situacao
        );

        // Abre os detalhes do evento.

        botao.addEventListener(
            "click",
            () => {

                if (!operacaoEmAndamento) {
                    mostrarDetalhes(solicitacao);
                }
            }
        );

        return botao;
    }


    // ======================================
    // 6. EXIBIR DETALHES
    // ======================================

    function adicionarDetalhe(rotulo, valor) {

        const dt =
            document.createElement("dt");

        const dd =
            document.createElement("dd");

        dt.textContent = rotulo;

        // textContent impede que HTML
        // fornecido pelo visitante seja
        // executado dentro do painel.

        dd.textContent =
            valor === null ||
            valor === undefined ||
            valor === ""
                ? "Não informado"
                : String(valor);

        detalheCampos.append(dt, dd);
    }


    function mostrarDetalhes(solicitacao) {

        limparDetalhes();

        solicitacaoSelecionada =
            solicitacao;

        detalheTitulo.textContent =
            solicitacao.titulo || "Sem título";


        // INFORMAÇÕES GERAIS

        adicionarDetalhe(
            "Protocolo",
            solicitacao.id
        );

        adicionarDetalhe(
            "Status",
            solicitacao.status
        );

        adicionarDetalhe(
            "Categoria",
            solicitacao.categoria
        );

        adicionarDetalhe(
            "Descrição",
            solicitacao.descricao
        );


        // DATA E LOCALIZAÇÃO

        adicionarDetalhe(
            "Data",
            formatarData(solicitacao.data)
        );

        adicionarDetalhe(
            "Horário",
            solicitacao.horario?.slice(0, 5)
        );

        adicionarDetalhe(
            "Estado",
            solicitacao.estado
        );

        adicionarDetalhe(
            "Cidade",
            solicitacao.cidade
        );

        adicionarDetalhe(
            "Local de concentração",
            solicitacao.local
        );

        adicionarDetalhe(
            "Referência",
            solicitacao.referencia
        );

        adicionarDetalhe(
            "Trajeto",
            solicitacao.trajeto
        );


        // ORGANIZAÇÃO

        adicionarDetalhe(
            "Organização",
            solicitacao.organizador
        );


        // DADOS PRIVADOS
        // Nunca publicar na agenda.

        adicionarDetalhe(
            "Nome do responsável (privado)",
            solicitacao.representante_nome
        );

        adicionarDetalhe(
            "E-mail do responsável (privado)",
            solicitacao.representante_email
        );

        adicionarDetalhe(
            "Telefone do responsável (privado)",
            solicitacao.representante_telefone
        );

        adicionarDetalhe(
            "Função do responsável (privado)",
            solicitacao.representante_funcao
        );


        // FONTES E OBSERVAÇÕES

        adicionarDetalhe(
            "Fonte de divulgação",
            solicitacao.fonte
        );

        adicionarDetalhe(
            "Link do cartaz",
            solicitacao.cartaz_url
        );

        adicionarDetalhe(
            "Observações administrativas",
            solicitacao.observacoes
        );


        // Exibe os detalhes.

        painelDetalhes.hidden = false;

        // Os botões ficam disponíveis
        // somente quando o status é pendente.

        ajustarBotoes();
    }


    // ======================================
    // 7. CARREGAR SOLICITAÇÕES
    // ======================================

    async function carregarSolicitacoes() {

        if (operacaoEmAndamento) {
            return;
        }

        const consultaAtual = ++versaoConsulta;

        const status = filtroStatus.value;

        mostrarAviso(
            "Carregando solicitações..."
        );

        lista.replaceChildren();

        limparDetalhes();

        total.textContent = "0";


        // Consulta as solicitações privadas.
        // O RLS exige permissão administrativa.

        const { data, error } = await cliente
            .from("solicitacoes")
            .select(
                "id,titulo,categoria,descricao,data," +
                "horario,estado,cidade,local,referencia," +
                "trajeto,organizador,representante_nome," +
                "representante_email,representante_telefone," +
                "representante_funcao,fonte,cartaz_url," +
                "observacoes,status,criado_em"
            )
            .eq("status", status)
            .order("criado_em", {
                ascending: false
            })
            .limit(100);


        // Impede mostrar resultados de consultas
        // antigas ou de sessões encerradas.

        if (
            consultaAtual !== versaoConsulta ||
            telas.painel.hidden
        ) {
            return;
        }


        // ERRO NA CONSULTA

        if (error) {

            lista.appendChild(
                criarParagrafo(
                    "Falha ao carregar a lista."
                )
            );

            mostrarAviso(
                "Erro ao consultar solicitações: " +
                error.message
            );

            return;
        }


        const registros = data || [];

        total.textContent =
            String(registros.length);


        // NENHUMA SOLICITAÇÃO

        if (registros.length === 0) {

            lista.appendChild(
                criarParagrafo(
                    "Nenhuma solicitação encontrada neste status."
                )
            );

            mostrarAviso(
                "Nenhuma solicitação encontrada para este status."
            );

            return;
        }


        // MONTAR A LISTA

        const fragmento =
            document.createDocumentFragment();

        for (const solicitacao of registros) {

            fragmento.appendChild(
                criarItem(solicitacao)
            );
        }

        lista.appendChild(fragmento);

        mostrarAviso(
            `${registros.length} solicitação(ões) carregada(s).`
        );
    }


    // ======================================
    // 8. APROVAR OU REJEITAR SOLICITAÇÃO
    // ======================================

    async function executarAcao(tipo) {

        // Impede cliques repetidos e ações
        // em solicitações não pendentes.

        if (
            operacaoEmAndamento ||
            !solicitacaoSelecionada ||
            solicitacaoSelecionada.status !== "pendente"
        ) {
            return;
        }

        const selecionada =
            solicitacaoSelecionada;

        const aprovando =
            tipo === "aprovar";


        // Escolhe a função SQL adequada.

        const funcao = aprovando
            ? "aprovar_solicitacao"
            : "rejeitar_solicitacao";


        // ==================================
        // CONFIRMAÇÃO OBRIGATÓRIA
        // ==================================

        const pergunta = aprovando

            ? (
                `Aprovar e PUBLICAR a manifestação ` +
                `"${selecionada.titulo}"?\n\n` +
                "Ela ficará disponível na tabela pública " +
                "de manifestações."
            )

            : (
                `Rejeitar a solicitação ` +
                `"${selecionada.titulo}"?\n\n` +
                "Ela não será publicada."
            );


        if (!window.confirm(pergunta)) {
            return;
        }


        // ==================================
        // BLOQUEAR BOTÕES DURANTE A OPERAÇÃO
        // ==================================

        operacaoEmAndamento = true;

        ajustarBotoes();

        mensagemAcao.textContent = aprovando
            ? "Aprovando e publicando..."
            : "Rejeitando solicitação...";


        try {

            // ==================================
            // EXECUTAR FUNÇÃO SQL PROTEGIDA
            // ==================================

            // A função SQL verifica:
            //
            // - Usuário autenticado.
            // - Presença na tabela administradores.
            // - Status pendente.
            //
            // A aprovação copia somente os
            // campos públicos para manifestacoes.

            const { data, error } =
                await cliente.rpc(
                    funcao,
                    {
                        p_solicitacao_id:
                            selecionada.id
                    }
                );


            if (error) {
                throw new Error(error.message);
            }


            // CONFIRMAR RESPOSTA

            if (
                aprovando &&
                (data === null || data === undefined)
            ) {
                throw new Error(
                    "A função não retornou o ID da publicação."
                );
            }

            if (!aprovando && data !== true) {
                throw new Error(
                    "A rejeição não foi confirmada pelo servidor."
                );
            }


            // ==================================
            // ATUALIZAR LISTA
            // ==================================

            operacaoEmAndamento = false;

            ajustarBotoes();

            await carregarSolicitacoes();


            // ==================================
            // INFORMAR RESULTADO
            // ==================================

            if (aprovando) {

                mostrarAviso(
                    `Solicitação nº ${selecionada.id} aprovada. ` +
                    `Manifestação pública nº ${data} criada no Supabase.`
                );

            } else {

                mostrarAviso(
                    `Solicitação nº ${selecionada.id} ` +
                    "rejeitada com sucesso."
                );

            }

        } catch (erro) {

            mensagemAcao.textContent =
                "Não foi possível concluir: " +
                (
                    erro instanceof Error
                        ? erro.message
                        : "Erro desconhecido."
                );

        } finally {

            operacaoEmAndamento = false;

            ajustarBotoes();

        }
    }


    // ======================================
    // 9. EVENTOS DOS BOTÕES ADMINISTRATIVOS
    // ======================================

    botaoAprovar.addEventListener(
        "click",
        () => executarAcao("aprovar")
    );

    botaoRejeitar.addEventListener(
        "click",
        () => executarAcao("rejeitar")
    );


    // ======================================
    // 10. LOGIN ADMINISTRATIVO
    // ======================================

    formLogin.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (!cliente) {

                mensagemLogin.textContent =
                    "Supabase não configurado.";

                return;
            }

            const email =
                porId("admin-email").value.trim();

            const senha =
                porId("admin-senha").value;

            botaoEntrar.disabled = true;

            mensagemLogin.textContent =
                "Verificando credenciais...";


            try {

                // AUTENTICAR NO SUPABASE

                const { error } =
                    await cliente.auth.signInWithPassword({
                        email,
                        password: senha
                    });

                
                if (error) {
                    console.error(
                        "Erro de autenticação:",
                        error.message,
                        error.code
                    );

                    throw new Error(
                        "Falha no login: " + error.message
                    );
                }



                // Limpa o campo de senha.

                porId("admin-senha").value = "";


                // Confere permissão administrativa.

                await verificarAdministrador();

            } catch (erro) {

                mostrarTela("login");

                mensagemLogin.textContent =
                    erro instanceof Error
                        ? erro.message
                        : "Falha no login.";

            } finally {

                botaoEntrar.disabled = false;

            }
        }
    );


    // ======================================
    // 11. LOGOUT
    // ======================================

    botaoSair.addEventListener(
        "click",
        async () => {

            if (operacaoEmAndamento) {
                return;
            }

            mostrarTela("carregamento");

            const { error } =
                await cliente.auth.signOut();

            mostrarTela("login");

            mensagemLogin.textContent = error
                ? (
                    "Não foi possível encerrar a sessão: " +
                    error.message
                )
                : "Sessão encerrada.";

        }
    );


    // ======================================
    // 12. ATUALIZAÇÃO E FILTROS
    // ======================================

    botaoAtualizar.addEventListener(
        "click",
        carregarSolicitacoes
    );

    filtroStatus.addEventListener(
        "change",
        carregarSolicitacoes
    );


    // ======================================
    // 13. MONITORAR ENCERRAMENTO DE SESSÃO
    // ======================================

    if (cliente) {

        cliente.auth.onAuthStateChange(
            (evento) => {

                if (evento === "SIGNED_OUT") {

                    // Remove dados privados da tela
                    // se a sessão for encerrada.

                    mostrarTela("login");
                }
            }
        );
    }


    // ======================================
    // 14. INICIALIZAÇÃO
    // ======================================

    async function iniciar() {

        if (!cliente) {

            mostrarTela("login");

            mensagemLogin.textContent =
                "Supabase não configurado. " +
                "Confira js/supabase.js.";

            return;
        }


        try {

            await verificarAdministrador();

        } catch (erro) {

            mostrarTela("login");

            mensagemLogin.textContent =
                erro instanceof Error
                    ? erro.message
                    : "Erro ao verificar acesso.";

        }
    }


    iniciar();

})();
