
/* ============================================================
   NA RUA - PAINEL ADMINISTRATIVO
   Arquivo: js/admin.js

   Fluxo de aprovacao:
   1. Aprova e publica pelo RPC do Supabase.
   2. Simula a geocodificacao no servidor.
   3. Confere a correspondencia do local.
   4. Reenvia o resultado como "esperado" para salvar.
   5. O servidor revalida antes de gravar.

   A Edge Function continua responsavel pela seguranca.
   ============================================================ */

(() => {
    "use strict";

    const cliente = window.naRuaSupabase;
    const porId = (id) => document.getElementById(id);

    // 1. Elementos existentes no admin.html.
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

    // 2. Interface.
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
        detalheTitulo.textContent = "Detalhes da solicitação";
        mensagemAcao.textContent = "";
        acoes.hidden = true;
        botaoAprovar.disabled = true;
        botaoRejeitar.disabled = true;
        painelDetalhes.hidden = true;
    }

    function mostrarTela(nome) {
        for (const [chave, elemento] of Object.entries(telas)) {
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
            solicitacaoSelecionada?.status === "pendente";

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

    // 3. Autenticacao e permissao administrativa.
    async function verificarAdministrador() {
        const { data, error } = await cliente.auth.getUser();

        if (error || !data?.user) {
            mostrarTela("login");
            return;
        }

        const {
            data: admin,
            error: erroPermissao
        } = await cliente
            .from("administradores")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (erroPermissao) {
            throw new Error(
                "Não foi possível verificar a permissão: " +
                erroPermissao.message
            );
        }

        if (!admin) {
            await cliente.auth.signOut();
            mostrarTela("login");

            mensagemLogin.textContent =
                "Esta conta não possui acesso administrativo.";

            return;
        }

        emailUsuario.textContent =
            data.user.email || "Administrador";

        mostrarTela("painel");

        await carregarSolicitacoes();
    }

    // 4. Lista e detalhes.
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
                "Data: " + formatarData(solicitacao.data)
            ),

            criarParagrafo(
                "Situação: " + solicitacao.status
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

    function mostrarDetalhes(s) {
        limparDetalhes();

        solicitacaoSelecionada = s;

        detalheTitulo.textContent =
            s.titulo || "Sem título";

        adicionarDetalhe("Protocolo", s.id);
        adicionarDetalhe("Status", s.status);
        adicionarDetalhe("Categoria", s.categoria);
        adicionarDetalhe("Descrição", s.descricao);
        adicionarDetalhe("Data", formatarData(s.data));

        adicionarDetalhe(
            "Horário",
            s.horario?.slice(0, 5)
        );

        adicionarDetalhe("Estado", s.estado);
        adicionarDetalhe("Cidade", s.cidade);

        adicionarDetalhe(
            "Local de concentração",
            s.local
        );

        adicionarDetalhe("Referência", s.referencia);
        adicionarDetalhe("Trajeto", s.trajeto);
        adicionarDetalhe("Organização", s.organizador);

        // Campos privados: exibir somente no painel.
        adicionarDetalhe(
            "Nome do responsável (privado)",
            s.representante_nome
        );

        adicionarDetalhe(
            "E-mail do responsável (privado)",
            s.representante_email
        );

        adicionarDetalhe(
            "Telefone do responsável (privado)",
            s.representante_telefone
        );

        adicionarDetalhe(
            "Função do responsável (privado)",
            s.representante_funcao
        );

        adicionarDetalhe(
            "Fonte de divulgação",
            s.fonte
        );

        adicionarDetalhe(
            "Link do cartaz",
            s.cartaz_url
        );

        adicionarDetalhe(
            "Observações administrativas",
            s.observacoes
        );

        painelDetalhes.hidden = false;
        ajustarBotoes();
    }

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
            `${registros.length} solicitação(ões) carregada(s).`
        );
    }

    // 5. Validacao complementar de nomes no navegador.
    // O servidor faz a validacao obrigatoria antes de gravar.

    function normalizarNome(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, " ")
            .replace(/\b(de|da|do|das|dos)\b/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function referenciaInformada(local) {
        const texto = String(local ?? "");

        // Pode estar no inicio ou depois de uma avenida:
        // "Avenida Paulista, em frente ao MASP" -> "MASP".

        const frente = texto.match(
            /em frente\s+(?:ao|a|à|do|da)\s+([^,;]+)/i
        );

        return (
            frente
                ? frente[1]
                : texto.split(/[,;]/)[0]
        ).trim();
    }

    function correspondenciaConservadora(
        solicitacao,
        resposta
    ) {
        if (
            resposta?.ok !== true ||
            resposta.resultado?.status !== "localizado"
        ) {
            return false;
        }

        const resultado = resposta.resultado;

        if (
            !Number.isFinite(resultado.latitude) ||
            !Number.isFinite(resultado.longitude) ||
            !resultado.endereco
        ) {
            return false;
        }

        const referencia =
            referenciaInformada(solicitacao.local);

        const esperado =
            normalizarNome(referencia);

        const endereco =
            String(resultado.endereco);

        const encontrado =
            normalizarNome(
                endereco.split(",")[0]
            );

        const enderecoNormalizado =
            normalizarNome(endereco);

        // Nao usar anexo quando ele nao foi solicitado.
        if (
            !/\banexo\b/i.test(referencia) &&
            /\banexo\b/i.test(endereco)
        ) {
            return false;
        }

        // MASP: referencia principal da Av. Paulista, 1578.
        if (
            esperado === "masp" &&
            normalizarNome(solicitacao.cidade) ===
                "sao paulo" &&
            String(solicitacao.estado).toUpperCase() ===
                "SP"
        ) {
            return (
                resultado.origem === "places" &&
                encontrado === "museu arte sao paulo" &&
                enderecoNormalizado.includes(
                    "avenida paulista 1578"
                )
            );
        }

        // Alias para o museu principal em Brasilia.
        if (
            esperado === "museu republica" &&
            normalizarNome(solicitacao.cidade) ===
                "brasilia" &&
            String(solicitacao.estado).toUpperCase() ===
                "DF" &&
            encontrado === "museu nacional republica"
        ) {
            return true;
        }

        // Exigir equivalencia do nome principal,
        // nao nomes apenas relacionados.
        return (
            esperado.length >= 5 &&
            esperado === encontrado
        );
    }

    async function mensagemErroFuncao(erro) {
        let detalhe =
            erro?.message || "Falha desconhecida.";

        try {
            if (
                typeof erro?.context?.text === "function"
            ) {
                const resposta =
                    await erro.context.text();

                if (resposta) {
                    detalhe = resposta.slice(0, 500);
                }
            }
        } catch {
            // Manter mensagem inicial.
        }

        return detalhe;
    }

    // 6. Geocodificacao apos a aprovacao.
    async function geocodificarPublicacao(
        idPublicacao,
        solicitacao
    ) {
        // Primeira chamada: nao grava.
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
            console.warn(
                "Falha ao simular:",
                await mensagemErroFuncao(erroSimular)
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

        if (
            !correspondenciaConservadora(
                solicitacao,
                simulacao
            )
        ) {
            console.info(
                "Referência encontrada, mas não " +
                "equivalente ao local informado."
            );

            return (
                "Localização encontrada, mas " +
                "precisa de revisão antes de " +
                "aparecer no mapa."
            );
        }

        // Segunda chamada:
        // reenvia a decisao simulada para o servidor.
        // O servidor recusa caso origem, endereco
        // ou coordenadas mudem.

        const {
            data: gravacao,
            error: erroSalvar
        } = await cliente.functions.invoke(
            "geocodificar-manifestacoes",
            {
                body: {
                    id: idPublicacao,
                    modo: "salvar",

                    // CAMPO NOVO:
                    esperado: simulacao.resultado
                }
            }
        );

        if (erroSalvar) {
            console.warn(
                "Falha ao gravar:",
                await mensagemErroFuncao(erroSalvar)
            );

            return (
                "Localização não gravada; revise o " +
                "resultado antes de tentar novamente."
            );
        }

        if (
            gravacao?.ok === true &&
            gravacao?.gravado === true &&
            gravacao?.resultado?.status ===
                "localizado"
        ) {
            return (
                "Coordenadas confirmadas e " +
                "salvas para o mapa."
            );
        }

        return (
            "Não foi possível confirmar a " +
            "gravação das coordenadas."
        );
    }

    // 7. Aprovacao e rejeicao.
    async function executarAcao(tipo) {
        if (
            operacaoEmAndamento ||
            !solicitacaoSelecionada ||
            solicitacaoSelecionada.status !== "pendente"
        ) {
            return;
        }

        const selecionada = solicitacaoSelecionada;
        const aprovando = tipo === "aprovar";

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
            // As RPCs existentes ja foram
            // testadas no Supabase.
            const { data, error } = await cliente.rpc(
                funcao,
                {
                    p_solicitacao_id:
                        selecionada.id
                }
            );

            if (error) {
                throw new Error(error.message);
            }

            if (!aprovando && data !== true) {
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
                    data !== null &&
                    data !== undefined &&
                    Number.isSafeInteger(idPublicacao) &&
                    idPublicacao > 0
                ) {
                    mensagemResultado +=
                        ` Manifestação pública nº ` +
                        `${idPublicacao} criada.`;

                    mensagemAcao.textContent =
                        "Publicação realizada. " +
                        "Conferindo localização...";

                    try {
                        const resultadoGeo =
                            await geocodificarPublicacao(
                                idPublicacao,
                                selecionada
                            );

                        mensagemResultado +=
                            " " + resultadoGeo;

                    } catch (erroGeo) {
                        console.warn(
                            "Geocodificação indisponível:",
                            erroGeo
                        );

                        mensagemResultado +=
                            " Não foi possível consultar " +
                            "a localização. A manifestação " +
                            "segue publicada.";
                    }

                } else {
                    // Nao afirmar que a aprovacao
                    // falhou se o RPC nao retornou ID.
                    mensagemResultado +=
                        " Não foi possível identificar " +
                        "o ID da publicação para geocodificar.";
                }

            } else {
                mensagemResultado =
                    `Solicitação nº ${selecionada.id} ` +
                    "rejeitada com sucesso.";
            }

            // Liberar recarregamento apenas
            // depois de terminar todas as chamadas.
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

    // 8. Login.
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

    // 9. Logout.
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

    // 10. Filtros.
    botaoAtualizar.addEventListener(
        "click",
        carregarSolicitacoes
    );

    filtroStatus.addEventListener(
        "change",
        carregarSolicitacoes
    );

    // 11. Estado da autenticacao.
    if (cliente) {
        cliente.auth.onAuthStateChange(
            (evento) => {
                if (evento === "SIGNED_OUT") {
                    mostrarTela("login");
                }
            }
        );
    }

    // 12. Inicializacao.
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
