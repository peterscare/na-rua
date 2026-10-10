
/* ==========================================
   NA RUA - PAINEL ADMINISTRATIVO
   Arquivo: js/admin.js

   Integracao automatica:
   aprovacao -> Supabase -> Geoapify -> mapa
   ========================================== */

(() => {
    "use strict";

    const cliente = window.naRuaSupabase;

    const porId = (id) =>
        document.getElementById(id);


    /* ======================================
       1. ELEMENTOS DO HTML
       ====================================== */

    const telas = {
        carregamento: porId(
            "admin-carregamento"
        ),

        login: porId(
            "admin-login"
        ),

        painel: porId(
            "admin-painel"
        )
    };

    const formLogin =
        porId("form-login");

    const botaoEntrar =
        porId("admin-entrar");

    const botaoSair =
        porId("admin-sair");

    const botaoAtualizar =
        porId("admin-atualizar");

    const filtroStatus =
        porId("admin-filtro-status");

    const lista =
        porId("admin-lista");

    const total =
        porId("admin-total");

    const painelDetalhes =
        porId("admin-detalhes");

    const detalheTitulo =
        porId("admin-detalhe-titulo");

    const detalheCampos =
        porId("admin-detalhe-campos");

    const acoes =
        porId("admin-acoes");

    const botaoAprovar =
        porId("admin-aprovar");

    const botaoRejeitar =
        porId("admin-rejeitar");

    const mensagemAcao =
        porId("admin-acao-mensagem");

    const emailUsuario =
        porId("admin-usuario-email");

    const aviso =
        porId("admin-aviso");

    const mensagemLogin =
        porId("admin-login-mensagem");


    let solicitacaoSelecionada = null;

    let operacaoEmAndamento = false;

    let versaoConsulta = 0;


    /* ======================================
       2. INTERFACE
       ====================================== */

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
            const [chave, elemento] of
            Object.entries(telas)
        ) {

            elemento.hidden =
                chave !== nome;
        }

        if (
            nome !== "painel"
        ) {

            ++versaoConsulta;

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
            !pendente ||
            operacaoEmAndamento;

        botaoRejeitar.disabled =
            !pendente ||
            operacaoEmAndamento;

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


    /* ======================================
       3. VERIFICAR ADMINISTRADOR
       ====================================== */

    async function verificarAdministrador() {

        const {
            data,
            error
        } = await cliente.auth.getUser();


        if (
            error ||
            !data?.user
        ) {

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

            .eq(
                "user_id",
                usuario.id
            )

            .maybeSingle();


        if (
            erroPermissao
        ) {

            throw new Error(
                "Não foi possível verificar " +
                "a permissão: " +
                erroPermissao.message
            );
        }


        if (
            !administrador
        ) {

            await cliente.auth.signOut();

            mostrarTela("login");

            mensagemLogin.textContent =
                "Esta conta não possui " +
                "acesso administrativo.";

            return;
        }


        emailUsuario.textContent =
            usuario.email ||
            "Administrador";

        mostrarTela("painel");

        await carregarSolicitacoes();
    }


    /* ======================================
       4. FORMATAÇÃO
       ====================================== */

    function formatarData(valor) {

        if (
            typeof valor !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(valor)
        ) {

            return valor ||
                "Não informada";
        }

        const [
            ano,
            mes,
            dia
        ] = valor.split("-");

        return `${dia}/${mes}/${ano}`;
    }


    function criarItem(solicitacao) {

        const botao =
            document.createElement("button");

        botao.type = "button";

        botao.className = "admin-item";


        const titulo =
            document.createElement("h3");

        titulo.textContent =
            solicitacao.titulo ||
            "Sem título";


        const local = criarParagrafo(
            `${solicitacao.cidade || ""} - ` +
            `${solicitacao.estado || ""}`
        );


        const data = criarParagrafo(
            "Data: " +
            formatarData(solicitacao.data)
        );


        const situacao = criarParagrafo(
            "Situação: " +
            solicitacao.status
        );


        botao.append(
            titulo,
            local,
            data,
            situacao
        );


        botao.addEventListener(
            "click",
            () => {

                if (
                    !operacaoEmAndamento
                ) {

                    mostrarDetalhes(
                        solicitacao
                    );
                }
            }
        );

        return botao;
    }


    function adicionarDetalhe(
        rotulo,
        valor
    ) {

        const dt =
            document.createElement("dt");

        const dd =
            document.createElement("dd");


        dt.textContent = rotulo;

        dd.textContent =
            valor === null ||
            valor === undefined ||
            valor === ""

                ? "Não informado"

                : String(valor);


        detalheCampos.append(
            dt,
            dd
        );
    }


    /* ======================================
       5. DETALHES DA SOLICITAÇÃO
       ====================================== */

    function mostrarDetalhes(
        solicitacao
    ) {

        limparDetalhes();

        solicitacaoSelecionada =
            solicitacao;

        detalheTitulo.textContent =
            solicitacao.titulo ||
            "Sem título";


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
            formatarData(
                solicitacao.data
            )
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


        // Informacoes privadas.
        // Nunca inserir na agenda publica.

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


    /* ======================================
       6. CARREGAR SOLICITAÇÕES
       ====================================== */

    async function carregarSolicitacoes() {

        if (
            operacaoEmAndamento
        ) {
            return;
        }

        const consultaAtual =
            ++versaoConsulta;

        const status =
            filtroStatus.value;


        mostrarAviso(
            "Carregando solicitações..."
        );

        lista.replaceChildren();

        limparDetalhes();

        total.textContent = "0";


        const {
            data,
            error
        } = await cliente

            .from(
                "solicitacoes"
            )

            .select(
                "id,titulo,categoria,descricao,data," +
                "horario,estado,cidade,local,referencia," +
                "trajeto,organizador,representante_nome," +
                "representante_email,representante_telefone," +
                "representante_funcao,fonte,cartaz_url," +
                "observacoes,status,criado_em"
            )

            .eq(
                "status",
                status
            )

            .order(
                "criado_em",
                {
                    ascending: false
                }
            )

            .limit(100);


        if (
            consultaAtual !== versaoConsulta ||
            telas.painel.hidden
        ) {
            return;
        }


        if (
            error
        ) {

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


        const registros =
            data || [];


        total.textContent =
            String(registros.length);


        if (
            registros.length === 0
        ) {

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


        for (
            const solicitacao of registros
        ) {

            fragmento.appendChild(
                criarItem(solicitacao)
            );
        }


        lista.appendChild(
            fragmento
        );


        mostrarAviso(
            `${registros.length} ` +
            `solicitação(ões) carregada(s).`
        );
    }


    /* ======================================
       7. APROVAR OU REJEITAR
       ====================================== */

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

        const funcao =
            aprovando

                ? "aprovar_solicitacao"

                : "rejeitar_solicitacao";


        const pergunta =
            aprovando

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


        if (
            !window.confirm(pergunta)
        ) {
            return;
        }


        operacaoEmAndamento = true;

        ajustarBotoes();


        mensagemAcao.textContent =
            aprovando

                ? "Aprovando e publicando..."

                : "Rejeitando solicitação...";


        try {

            /* ==============================
               7.1. APROVAR OU REJEITAR
               ============================== */

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


            if (
                error
            ) {

                throw new Error(
                    error.message
                );
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


            /* ==============================
               7.2. RESULTADO DA OPERACAO
               ============================== */

            let mensagemResultado =
                aprovando

                    ? (
                        `Solicitação nº ${selecionada.id} ` +
                        `aprovada. Manifestação pública ` +
                        `nº ${data} criada no Supabase.`
                    )

                    : (
                        `Solicitação nº ${selecionada.id} ` +
                        `rejeitada com sucesso.`
                    );


            /* ==============================
               7.3. GEOCODIFICACAO AUTOMATICA
               ============================== */

            if (
                aprovando
            ) {

                const idPublicacao =
                    Number(data);


                if (
                    Number.isSafeInteger(
                        idPublicacao
                    ) &&
                    idPublicacao > 0
                ) {

                    mensagemAcao.textContent =
                        "Publicação realizada. " +
                        "Buscando localização no mapa...";


                    try {

                        // Usa a sessao administrativa
                        // ja autenticada no Supabase.
                        //
                        // Nenhum token secreto
                        // aparece no navegador.

                        const {
                            data: geo,
                            error: erroGeo
                        } = await cliente.functions.invoke(
                            "geocodificar-manifestacoes",
                            {
                                body: {
                                    id: idPublicacao,
                                    modo: "salvar"
                                }
                            }
                        );


                        if (
                            erroGeo ||
                            geo?.ok !== true
                        ) {

                            mensagemResultado +=
                                " A localização não pôde " +
                                "ser processada. A publicação " +
                                "continua válida e poderá " +
                                "ser revisada.";

                        } else if (
                            geo.resultado?.status ===
                            "localizado"
                        ) {

                            mensagemResultado +=
                                " Localização identificada " +
                                "e registrada para o mapa.";

                        } else {

                            mensagemResultado +=
                                " Local não confirmado " +
                                "automaticamente. A " +
                                "manifestação permanece " +
                                "na agenda para revisão.";
                        }

                    } catch (
                        erroGeocodificacao
                    ) {

                        console.warn(
                            "Geocodificação após aprovação falhou:",

                            erroGeocodificacao instanceof Error

                                ? erroGeocodificacao.message

                                : "Falha de rede"
                        );


                        mensagemResultado +=
                            " Falha na busca de coordenadas. " +
                            "A manifestação segue publicada.";
                    }

                } else {

                    mensagemResultado +=
                        " ID inválido para " +
                        "pesquisar coordenadas.";
                }
            }


            /* ==============================
               7.4. ATUALIZAR PAINEL
               ============================== */

            operacaoEmAndamento = false;

            ajustarBotoes();

            await carregarSolicitacoes();

            mostrarAviso(
                mensagemResultado
            );

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


    /* ======================================
       8. LOGIN
       ====================================== */

    formLogin.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();


            if (
                !cliente
            ) {

                mensagemLogin.textContent =
                    "Supabase não configurado.";

                return;
            }


            const email =
                porId(
                    "admin-email"
                ).value.trim();


            const senha =
                porId(
                    "admin-senha"
                ).value;


            botaoEntrar.disabled =
                true;

            mensagemLogin.textContent =
                "Verificando credenciais...";


            try {

                const {
                    error
                } = await cliente.auth
                    .signInWithPassword(
                        {
                            email,
                            password: senha
                        }
                    );


                if (
                    error
                ) {

                    throw new Error(
                        "E-mail ou senha inválidos, " +
                        "ou conta indisponível."
                    );
                }


                porId(
                    "admin-senha"
                ).value = "";


                await verificarAdministrador();

            } catch (erro) {

                mostrarTela(
                    "login"
                );

                mensagemLogin.textContent =
                    erro instanceof Error

                        ? erro.message

                        : "Falha no login.";

            } finally {

                botaoEntrar.disabled =
                    false;
            }
        }
    );


    /* ======================================
       9. LOGOUT
       ====================================== */

    botaoSair.addEventListener(
        "click",
        async () => {

            if (
                operacaoEmAndamento
            ) {
                return;
            }


            mostrarTela(
                "carregamento"
            );


            const {
                error
            } = await cliente.auth.signOut();


            mostrarTela(
                "login"
            );


            mensagemLogin.textContent =
                error

                    ? (
                        "Não foi possível encerrar " +
                        "a sessão: " +
                        error.message
                    )

                    : "Sessão encerrada.";
        }
    );


    /* ======================================
       10. ATUALIZACAO E FILTROS
       ====================================== */

    botaoAtualizar.addEventListener(
        "click",
        carregarSolicitacoes
    );

    filtroStatus.addEventListener(
        "change",
        carregarSolicitacoes
    );


    /* ======================================
       11. MONITORAR SESSAO
       ====================================== */

    if (
        cliente
    ) {

        cliente.auth.onAuthStateChange(
            (evento) => {

                if (
                    evento === "SIGNED_OUT"
                ) {

                    mostrarTela(
                        "login"
                    );
                }
            }
        );
    }


    /* ======================================
       12. INICIALIZACAO
       ====================================== */

    async function iniciar() {

        if (
            !cliente
        ) {

            mostrarTela(
                "login"
            );

            mensagemLogin.textContent =
                "Supabase não configurado. " +
                "Confira js/supabase.js.";

            return;
        }


        try {

            await verificarAdministrador();

        } catch (erro) {

            mostrarTela(
                "login"
            );

            mensagemLogin.textContent =
                erro instanceof Error

                    ? erro.message

                    : "Erro ao verificar acesso.";
        }
    }


    iniciar();

})();
