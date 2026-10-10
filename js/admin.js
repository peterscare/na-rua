
/* ============================================================
   NA RUA - PAINEL ADMINISTRATIVO
   Arquivo: js/admin.js

   Apos aprovacao:
   1. Publica a manifestacao no Supabase.
   2. Simula a geocodificacao.
   3. Confere a correspondencia do local.
   4. Salva somente referencias compativeis.
   5. Mantem locais incertos sem coordenadas.

   A validacao definitiva deve permanecer
   na Edge Function do Supabase.
   ============================================================ */

(() => {
    "use strict";

    const cliente = window.naRuaSupabase;

    const porId = (id) =>
        document.getElementById(id);

    /* ========================================================
       1. ELEMENTOS DO HTML
       ======================================================== */

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

    /* ========================================================
       2. FUNCOES DA INTERFACE
       ======================================================== */

    function mostrarAviso(texto) {
        aviso.textContent = texto;
    }

    function criarParagrafo(texto) {
        const p = document.createElement("p");
        p.textContent = texto;
        return p;
    }

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
        for (
            const [chave, elemento]
            of Object.entries(telas)
        ) {
            elemento.hidden = chave !== nome;
        }

        if (nome !== "painel") {
            ++versaoConsulta;

            lista.replaceChildren();
            limparDetalhes();

            total.textContent = "0";
            emailUsuario.textContent = "";
            aviso.textContent = "";
        }
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

    /* ========================================================
       3. VERIFICAR ADMINISTRADOR
       ======================================================== */

    async function verificarAdministrador() {
        const {
            data,
            error
        } = await cliente.auth.getUser();

        if (error || !data?.user) {
            mostrarTela("login");
            return;
        }

        const usuario = data.user;

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
                "Esta conta não possui " +
                "acesso administrativo.";

            return;
        }

        emailUsuario.textContent =
            usuario.email || "Administrador";

        mostrarTela("painel");

        await carregarSolicitacoes();
    }

    /* ========================================================
       4. FORMATACAO E LISTAGEM
       ======================================================== */

    function formatarData(valor) {
        if (
            typeof valor !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(valor)
        ) {
            return valor || "Não informada";
        }

        const [ano, mes, dia] = valor.split("-");

        return `${dia}/${mes}/${ano}`;
    }

    function criarItem(solicitacao) {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "admin-item";

        const titulo = document.createElement("h3");

        titulo.textContent =
            solicitacao.titulo || "Sem título";

        botao.append(
            titulo,

            criarParagrafo(
                `${solicitacao.cidade || ""} - ` +
                `${solicitacao.estado || ""}`
            ),

            criarParagrafo(
                "Data: " +
                formatarData(solicitacao.data)
            ),

            criarParagrafo(
                "Situação: " +
                solicitacao.status
            )
        );

        botao.addEventListener("click", () => {
            if (!operacaoEmAndamento) {
                mostrarDetalhes(solicitacao);
            }
        });

        return botao;
    }

    function adicionarDetalhe(rotulo, valor) {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");

        dt.textContent = rotulo;

        dd.textContent =
            valor === null ||
            valor === undefined ||
            valor === ""
                ? "Não informado"
                : String(valor);

        detalheCampos.append(dt, dd);
    }

    /* ========================================================
       5. DETALHES DA SOLICITACAO
       ======================================================== */

    function mostrarDetalhes(solicitacao) {
        limparDetalhes();

        solicitacaoSelecionada = solicitacao;

        detalheTitulo.textContent =
            solicitacao.titulo || "Sem título";

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

        adicionarDetalhe(
            "Organização",
            solicitacao.organizador
        );

        // Dados privados: somente no painel admin.
        // Nunca enviar esses campos para a agenda.

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

        painelDetalhes.hidden = false;

        ajustarBotoes();
    }

    /* ========================================================
       6. CARREGAR SOLICITACOES
       ======================================================== */

    async function carregarSolicitacoes() {
        if (operacaoEmAndamento) {
            return;
        }

        const consultaAtual = ++versaoConsulta;

        const status = filtroStatus.value;

        mostrarAviso("Carregando solicitações...");

        lista.replaceChildren();
        limparDetalhes();

        total.textContent = "0";

        const {
            data,
            error
        } = await cliente
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
            .order(
                "criado_em",
                { ascending: false }
            )
            .limit(100);

        if (
            consultaAtual !== versaoConsulta ||
            telas.painel.hidden
        ) {
            return;
        }

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

        total.textContent = String(registros.length);

        if (registros.length === 0) {
            lista.appendChild(
                criarParagrafo(
                    "Nenhuma solicitação encontrada " +
                    "neste status."
                )
            );

            mostrarAviso(
                "Nenhuma solicitação encontrada " +
                "para este status."
            );

            return;
        }

        const fragmento =
            document.createDocumentFragment();

        for (const solicitacao of registros) {
            fragmento.appendChild(
                criarItem(solicitacao)
            );
        }

        lista.appendChild(fragmento);

        mostrarAviso(
            `${registros.length} ` +
            `solicitação(ões) carregada(s).`
        );
    }

    /* ========================================================
       7. VERIFICACAO CONSERVADORA DO ENDERECO

       Evitar equivalencias incorretas como:
       Centro da UFRN -> Praca Civica da UFRN
       ======================================================== */

    function normalizarNome(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, " ")
            .replace(
                /\b(de|da|do|das|dos)\b/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function referenciaInformada(local) {
        return String(local ?? "")
            .split(/[,;]/)[0]
            .replace(
                /^\s*em frente\s+(?:ao|a|à|do|da)\s+/i,
                ""
            )
            .trim();
    }

    function correspondenciaConservadora(
        solicitacao,
        geo
    ) {
        if (
            geo?.ok !== true ||
            geo.resultado?.status !== "localizado"
        ) {
            return false;
        }

        const resultado = geo.resultado;

        if (
            !Number.isFinite(resultado.latitude) ||
            !Number.isFinite(resultado.longitude) ||
            !resultado.endereco
        ) {
            return false;
        }

        const local =
            referenciaInformada(solicitacao.local);

        const esperado =
            normalizarNome(local);

        const endereco =
            String(resultado.endereco);

        const encontrado =
            normalizarNome(
                endereco.split(",")[0]
            );

        const enderecoNormalizado =
            normalizarNome(endereco);

        // Impedir anexos nao solicitados.

        if (
            !/\banexo\b/i.test(local) &&
            /\banexo\b/i.test(endereco)
        ) {
            return false;
        }

        // Regra especifica do MASP principal.
        // Ja validada nos testes anteriores.

        if (
            esperado === "masp" &&
            normalizarNome(solicitacao.cidade) ===
                "sao paulo" &&
            String(solicitacao.estado).toUpperCase() ===
                "SP"
        ) {
            return (
                resultado.origem === "places" &&
                enderecoNormalizado.includes(
                    "museu arte sao paulo"
                ) &&
                enderecoNormalizado.includes(
                    "avenida paulista 1578"
                )
            );
        }

        // Outros locais:
        // exigir correspondencia do nome principal.
        //
        // Exemplo:
        // Largo Sao Sebastiao
        // Largo de Sao Sebastiao
        //
        // Ambos viram:
        // largo sao sebastiao

        return (
            esperado.length >= 5 &&
            esperado === encontrado
        );
    }

    /* ========================================================
       8. TRATAR ERROS DA EDGE FUNCTION
       ======================================================== */

    async function mensagemErroFuncao(error) {
        let detalhe =
            error?.message || "Falha desconhecida.";

        try {
            if (
                error?.context &&
                typeof error.context.text === "function"
            ) {
                const resposta =
                    await error.context.text();

                if (resposta) {
                    detalhe = resposta.slice(0, 500);
                }
            }
        } catch {
            // Mantem mensagem generica.
        }

        return detalhe;
    }

    /* ========================================================
       9. GEOCODIFICACAO APOS APROVACAO

       Etapa 1: simular.
       Etapa 2: verificar correspondencia.
       Etapa 3: salvar se a referencia for compativel.
       ======================================================== */

    async function geocodificarPublicacao(
        idPublicacao,
        solicitacao
    ) {
        // PRIMEIRA CONSULTA: SIMULAR

        const {
            data: simulacao,
            error: erroSimular
        } = await cliente.functions.invoke(
            "geocodificar-manifestacoes",
            {
                body: {
                    id: idPublicacao,
                    modo: "simular"
                }
            }
        );

        if (erroSimular) {
            const motivo =
                await mensagemErroFuncao(erroSimular);

            console.warn(
                "Geocodificação não concluída:",
                motivo
            );

            return (
                "Localização ainda não processada; " +
                "tente novamente depois."
            );
        }

        if (
            simulacao?.resultado?.status !==
            "localizado"
        ) {
            return (
                "Endereço não confirmado " +
                "automaticamente; ficará para revisão."
            );
        }

        // VALIDAR SE O RESULTADO CORRESPONDE
        // AO LOCAL INFORMADO NA SOLICITACAO.

        const corresponde =
            correspondenciaConservadora(
                solicitacao,
                simulacao
            );

        if (!corresponde) {
            console.info(
                "Local relacionado, mas sem " +
                "correspondência exata:",
                {
                    informado: solicitacao.local,
                    encontrado:
                        simulacao?.resultado?.endereco
                }
            );

            return (
                "Localização encontrada, mas " +
                "precisa de revisão antes de " +
                "aparecer no mapa."
            );
        }

        // SEGUNDA CONSULTA: SALVAR

        const {
            data: gravacao,
            error: erroSalvar
        } = await cliente.functions.invoke(
            "geocodificar-manifestacoes",
            {
                body: {
                    id: idPublicacao,
                    modo: "salvar"
                }
            }
        );

        if (erroSalvar) {
            const motivo =
                await mensagemErroFuncao(erroSalvar);

            console.warn(
                "Falha ao gravar coordenadas:",
                motivo
            );

            return (
                "Publicação realizada, mas " +
                "a localização não foi gravada."
            );
        }

        if (
            gravacao?.ok === true &&
            gravacao?.gravado === true &&
            gravacao?.resultado?.status ===
                "localizado" &&
            correspondenciaConservadora(
                solicitacao,
                gravacao
            )
        ) {
            return (
                "Coordenadas confirmadas e " +
                "salvas para o mapa."
            );
        }

        console.warn(
            "Gravação sem confirmação de " +
            "equivalência após a consulta:",
            gravacao
        );

        return (
            "Localização gravada, mas " +
            "requer revisão administrativa."
        );
    }

    /* ========================================================
       10. APROVAR OU REJEITAR
       ======================================================== */

    async function executarAcao(tipo) {
        if (
            operacaoEmAndamento ||
            !solicitacaoSelecionada ||
            solicitacaoSelecionada.status !==
                "pendente"
        ) {
            return;
        }

        const selecionada =
            solicitacaoSelecionada;

        const aprovando =
            tipo === "aprovar";

        const funcao = aprovando
            ? "aprovar_solicitacao"
            : "rejeitar_solicitacao";

        const pergunta = aprovando
            ? (
                `Aprovar e PUBLICAR a manifestação ` +
                `"${selecionada.titulo}"?\n\n` +
                "Ela ficará disponível na agenda pública."
            )
            : (
                `Rejeitar a solicitação ` +
                `"${selecionada.titulo}"?\n\n` +
                "Ela não será publicada."
            );

        if (!window.confirm(pergunta)) {
            return;
        }

        operacaoEmAndamento = true;

        ajustarBotoes();

        mensagemAcao.textContent = aprovando
            ? "Aprovando e publicando..."
            : "Rejeitando solicitação...";

        try {
            // EXECUTAR RPC EXISTENTE

            const {
                data,
                error
            } = await cliente.rpc(
                funcao,
                {
                    p_solicitacao_id:
                        selecionada.id
                }
            );

            if (error) {
                throw new Error(error.message);
            }

            if (
                aprovando &&
                (
                    data === null ||
                    data === undefined
                )
            ) {
                throw new Error(
                    "A função não retornou " +
                    "o ID da publicação."
                );
            }

            if (
                !aprovando &&
                data !== true
            ) {
                throw new Error(
                    "A rejeição não foi " +
                    "confirmada pelo servidor."
                );
            }

            let mensagemResultado;

            if (aprovando) {
                mensagemResultado =
                    `Solicitação nº ${selecionada.id} ` +
                    "aprovada.";

                const idPublicacao = Number(data);

                if (
                    Number.isSafeInteger(idPublicacao) &&
                    idPublicacao > 0
                ) {
                    mensagemResultado +=
                        ` Manifestação pública nº ` +
                        `${idPublicacao} criada.`;

                    mensagemAcao.textContent =
                        "Publicação concluída. " +
                        "Conferindo localização...";

                    try {
                        const detalheGeo =
                            await geocodificarPublicacao(
                                idPublicacao,
                                selecionada
                            );

                        mensagemResultado +=
                            " " + detalheGeo;

                    } catch (erroGeo) {
                        console.warn(
                            "Geocodificação indisponível:",
                            erroGeo
                        );

                        mensagemResultado +=
                            " Localização indisponível; " +
                            "a manifestação segue publicada.";
                    }

                } else {
                    mensagemResultado +=
                        " Não foi possível identificar " +
                        "o ID da nova manifestação " +
                        "para o mapa.";
                }

            } else {
                mensagemResultado =
                    `Solicitação nº ${selecionada.id} ` +
                    "rejeitada com sucesso.";
            }

            operacaoEmAndamento = false;

            ajustarBotoes();

            await carregarSolicitacoes();

            mostrarAviso(mensagemResultado);

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

    botaoAprovar.addEventListener(
        "click",
        () => executarAcao("aprovar")
    );

    botaoRejeitar.addEventListener(
        "click",
        () => executarAcao("rejeitar")
    );

    /* ========================================================
       11. LOGIN
       ======================================================== */

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
                const { error } =
                    await cliente.auth.signInWithPassword({
                        email,
                        password: senha
                    });

                if (error) {
                    throw new Error(
                        "E-mail ou senha inválidos, " +
                        "ou conta indisponível."
                    );
                }

                porId("admin-senha").value = "";

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

    /* ========================================================
       12. LOGOUT
       ======================================================== */

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
                    "Não foi possível encerrar " +
                    "a sessão: " + error.message
                )
                : "Sessão encerrada.";
        }
    );

    /* ========================================================
       13. FILTROS E ATUALIZACAO
       ======================================================== */

    botaoAtualizar.addEventListener(
        "click",
        carregarSolicitacoes
    );

    filtroStatus.addEventListener(
        "change",
        carregarSolicitacoes
    );

    /* ========================================================
       14. MONITORAR AUTENTICACAO
       ======================================================== */

    if (cliente) {
        cliente.auth.onAuthStateChange(
            (evento) => {
                if (evento === "SIGNED_OUT") {
                    mostrarTela("login");
                }
            }
        );
    }

    /* ========================================================
       15. INICIALIZAR PAINEL
       ======================================================== */

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
