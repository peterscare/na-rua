
/* ==========================================
   NA RUA - AGENDA DE MANIFESTAÇÕES
   Arquivo: js/main.js
   Fonte de dados: Supabase
   ========================================== */

"use strict";


/* ==========================================
   1. ELEMENTOS DA PÁGINA
   ========================================== */

const listaManifestacoes = document.getElementById(
    "lista-manifestacoes"
);

const mensagemSemResultados = document.getElementById(
    "sem-resultados"
);

const seletorOrdenacao = document.getElementById(
    "ordenar"
);


/* ==========================================
   2. ARMAZENAMENTO DOS DADOS
   ========================================== */

// Objeto compartilhado com filtros.js e mapa.js.

window.ManifestacoesApp = {
    dados: [],
    visiveis: [],
    mostrar: mostrarManifestacoes
};


/* ==========================================
   3. FUNÇÕES DE FORMATAÇÃO
   ========================================== */

// Converte 2026-10-18 para 18 de out. de 2026.

function formatarData(data) {

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return "Data a confirmar";
    }

    const [ano, mes, dia] =
        data.split("-").map(Number);

    // Utilizamos meio-dia local para evitar
    // deslocamentos de data por causa do UTC.

    const dataFormatada = new Date(
        ano,
        mes - 1,
        dia,
        12,
        0,
        0
    );

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(dataFormatada);

}


// Converte 11:00 para 11h
// e 16:30 para 16h30.
// Também aceita TIME do Supabase: 11:00:00.

function formatarHorario(horario) {

    if (!horario) {
        return "Horário a confirmar";
    }

    const partes =
        String(horario).split(":");

    if (partes.length < 2) {
        return String(horario);
    }

    const hora = partes[0];
    const minuto = partes[1];

    if (minuto === "00") {
        return `${hora}h`;
    }

    return `${hora}h${minuto}`;

}


// Obtém a data atual no horário de Brasília.

function obterDataAtual() {

    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const valores = {};

    partes.forEach(parte => {
        valores[parte.type] = parte.value;
    });

    return `${valores.year}-${valores.month}-${valores.day}`;

}


/* ==========================================
   4. VALIDAÇÃO DOS LINKS
   ========================================== */

// Somente links HTTP ou HTTPS são permitidos.

function validarURL(url) {

    if (typeof url !== "string" || !url.trim()) {
        return null;
    }

    try {

        const endereco = new URL(url);

        if (
            endereco.protocol === "https:" ||
            endereco.protocol === "http:"
        ) {
            return endereco.href;
        }

    } catch (erro) {
        console.warn("URL inválida:", url);
    }

    return null;

}


/* ==========================================
   5. CRIAÇÃO DE ELEMENTOS
   ========================================== */

// textContent impede a interpretação
// de dados externos como HTML.

function criarElemento(tag, classe, texto = "") {

    const elemento =
        document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    elemento.textContent = texto;

    return elemento;

}


// Cria uma linha de informação do cartão.

function criarLinhaInformacao(rotulo, valor) {

    const linha =
        document.createElement("p");

    const destaque =
        document.createElement("strong");

    destaque.textContent = `${rotulo}: `;

    const conteudo =
        document.createTextNode(
            valor || "Não informado"
        );

    linha.appendChild(destaque);
    linha.appendChild(conteudo);

    return linha;

}


/* ==========================================
   6. CRIAR CARTÃO DE MANIFESTAÇÃO
   ========================================== */

function criarCartao(manifestacao) {

    // Elemento principal

    const cartao = criarElemento(
        "article",
        "cartao-manifestacao"
    );

    cartao.id =
        `manifestacao-${manifestacao.id}`;


    /* --------------------------------------
       TOPO DO CARTÃO
       -------------------------------------- */

    const topo = criarElemento(
        "div",
        "cartao-topo"
    );

    const data = criarElemento(
        "span",
        "cartao-data",
        `${formatarData(manifestacao.data)} • ${formatarHorario(manifestacao.horario)}`
    );

    const status = criarElemento(
        "span",
        "cartao-status",
        manifestacao.status || "A confirmar"
    );

    status.title =
        "Consulte a fonte e confirme os dados antes de comparecer.";

    topo.appendChild(data);
    topo.appendChild(status);


    /* --------------------------------------
       CONTEÚDO PRINCIPAL
       -------------------------------------- */

    const conteudo = criarElemento(
        "div",
        "cartao-conteudo"
    );

    // Cidade e estado

    const cidade = criarElemento(
        "span",
        "cartao-cidade",
        `${manifestacao.cidade} / ${manifestacao.estado}`
    );

    // Título

    const titulo = criarElemento(
        "h3",
        "cartao-titulo",
        manifestacao.titulo || "Manifestação"
    );

    // Descrição

    const descricao = criarElemento(
        "p",
        "cartao-descricao",
        manifestacao.descricao ||
        "Sem descrição disponível."
    );


    /* --------------------------------------
       INFORMAÇÕES DO EVENTO
       -------------------------------------- */

    const informacoes = criarElemento(
        "div",
        "cartao-informacoes"
    );

    const local = criarLinhaInformacao(
        "Local",
        manifestacao.local
    );

    const horario = criarLinhaInformacao(
        "Horário",
        formatarHorario(manifestacao.horario)
    );

    const organizador = criarLinhaInformacao(
        "Organização",
        manifestacao.organizador
    );

    const categoria = criarLinhaInformacao(
        "Categoria",
        manifestacao.categoria
    );

    informacoes.appendChild(local);
    informacoes.appendChild(horario);
    informacoes.appendChild(organizador);
    informacoes.appendChild(categoria);

    conteudo.appendChild(cidade);
    conteudo.appendChild(titulo);
    conteudo.appendChild(descricao);
    conteudo.appendChild(informacoes);


    /* --------------------------------------
       RODAPÉ DO CARTÃO
       -------------------------------------- */

    const rodape = criarElemento(
        "div",
        "cartao-rodape"
    );

    const linkFonte =
        validarURL(manifestacao.fonte);

    if (linkFonte) {

        const link = criarElemento(
            "a",
            "cartao-link",
            "Consultar fonte ↗"
        );

        link.href = linkFonte;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        rodape.appendChild(link);

    } else {

        const aviso = criarElemento(
            "p",
            "",
            "Fonte pública ainda não informada"
        );

        rodape.appendChild(aviso);

    }


    /* --------------------------------------
       MONTAGEM FINAL
       -------------------------------------- */

    cartao.appendChild(topo);
    cartao.appendChild(conteudo);
    cartao.appendChild(rodape);

    return cartao;

}


/* ==========================================
   7. ORDENAR MANIFESTAÇÕES
   ========================================== */

function ordenarManifestacoes(manifestacoes) {

    const ordenacao = seletorOrdenacao
        ? seletorOrdenacao.value
        : "data";

    // Evita alterar a ordem original.

    const listaOrdenada = [...manifestacoes];


    function compararDataHora(a, b) {

        const dataA =
            `${a.data || "9999-12-31"}T${a.horario || "23:59"}`;

        const dataB =
            `${b.data || "9999-12-31"}T${b.horario || "23:59"}`;

        return dataA.localeCompare(dataB);

    }


    function compararCidades(a, b) {

        return String(a.cidade || "").localeCompare(
            String(b.cidade || ""),
            "pt-BR"
        );

    }


    if (ordenacao === "cidade") {

        listaOrdenada.sort((a, b) => {

            return (
                compararCidades(a, b) ||
                compararDataHora(a, b)
            );

        });

    } else {

        listaOrdenada.sort((a, b) => {

            return (
                compararDataHora(a, b) ||
                compararCidades(a, b)
            );

        });

    }

    return listaOrdenada;

}


/* ==========================================
   8. EXIBIR MANIFESTAÇÕES NA PÁGINA
   ========================================== */

function mostrarManifestacoes(manifestacoes) {

    if (!listaManifestacoes) {

        console.error(
            "Elemento da lista não encontrado."
        );

        return;

    }

    // Limpa os cartões anteriores.

    listaManifestacoes.replaceChildren();

    // Ordena os registros.

    const ordenadas =
        ordenarManifestacoes(manifestacoes);

    // Atualiza a lista compartilhada.

    window.ManifestacoesApp.visiveis =
        ordenadas;


    /* --------------------------------------
       LISTA VAZIA
       -------------------------------------- */

    if (ordenadas.length === 0) {

        if (mensagemSemResultados) {

            mensagemSemResultados.hidden =
                false;

        }

    } else {

        if (mensagemSemResultados) {

            mensagemSemResultados.hidden =
                true;

        }

        // Cria cartões em memória.

        const fragmento =
            document.createDocumentFragment();

        ordenadas.forEach(manifestacao => {

            const cartao =
                criarCartao(manifestacao);

            fragmento.appendChild(cartao);

        });

        // Insere todos os cartões.

        listaManifestacoes.appendChild(
            fragmento
        );

    }


    /* --------------------------------------
       AVISAR MAPA E FILTROS
       -------------------------------------- */

    document.dispatchEvent(
        new CustomEvent(
            "manifestacoes:atualizadas",
            {
                detail: {
                    manifestacoes: [...ordenadas]
                }
            }
        )
    );

}


/* ==========================================
   9. CARREGAR MANIFESTAÇÕES DO SUPABASE
   ========================================== */

async function carregarManifestacoes() {

    try {

        console.log(
            "Carregando manifestações do Supabase..."
        );


        /* --------------------------------------
           VERIFICAR CONEXÃO COM SUPABASE
           -------------------------------------- */

        const cliente =
            window.naRuaSupabase;

        if (!cliente) {

            throw new Error(
                "Cliente Supabase não encontrado. " +
                "Confira o carregamento de js/supabase.js no index.html."
            );

        }


        /* --------------------------------------
           CONSULTAR MANIFESTAÇÕES PUBLICADAS
           -------------------------------------- */

        // Consulta apenas campos públicos.
        //
        // O RLS deve permitir SELECT somente
        // em registros com publicado = true.

        const { data, error } = await cliente
            .from("manifestacoes")
            .select(`
                id,
                titulo,
                descricao,
                data,
                horario,
                cidade,
                estado,
                local,
                organizador,
                categoria,
                status,
                latitude,
                longitude,
                fonte,
                publicado
            `)
            .eq("publicado", true)
            .order("data", {
                ascending: true
            })
            .limit(1000);


        /* --------------------------------------
           VERIFICAR ERROS
           -------------------------------------- */

        if (error) {

            throw new Error(
                "Erro na consulta ao Supabase: " +
                error.message
            );

        }

        if (!Array.isArray(data)) {

            throw new Error(
                "O Supabase não retornou uma lista válida."
            );

        }


        /* --------------------------------------
           ARMAZENAR DADOS PÚBLICOS
           -------------------------------------- */

        // Segurança adicional:
        // utiliza somente os registros
        // publicados.

        const dados = data.filter(evento => {

            return evento.publicado === true;

        });

        // Compartilha os registros com
        // filtros.js e mapa.js.

        window.ManifestacoesApp.dados =
            dados;


        /* --------------------------------------
           SELECIONAR EVENTOS FUTUROS
           -------------------------------------- */

        const hoje =
            obterDataAtual();

        const eventosFuturos = dados.filter(
            evento => {

                return (
                    typeof evento.data === "string" &&
                    evento.data >= hoje
                );

            }
        );


        /* --------------------------------------
           EXIBIR CARTÕES
           -------------------------------------- */

        mostrarManifestacoes(
            eventosFuturos
        );


        /* --------------------------------------
           ATUALIZAR FILTROS E MAPA
           -------------------------------------- */

        // Preserva o evento que já era usado
        // pelos outros arquivos JavaScript.

        document.dispatchEvent(
            new CustomEvent(
                "manifestacoes:carregadas",
                {
                    detail: {
                        todas: [...dados],
                        futuras: [...eventosFuturos]
                    }
                }
            )
        );


        /* --------------------------------------
           MENSAGENS DE DIAGNÓSTICO
           -------------------------------------- */

        console.log(
            `${dados.length} manifestações públicas carregadas.`
        );

        console.log(
            `${eventosFuturos.length} manifestações futuras na agenda.`
        );

        if (dados.length === 0) {

            console.info(
                "Ainda não há manifestações publicadas no Supabase."
            );

        }

    } catch (erro) {

        console.error(
            "Erro ao carregar manifestações:",
            erro
        );


        /* --------------------------------------
           LIMPAR DADOS
           -------------------------------------- */

        window.ManifestacoesApp.dados = [];

        window.ManifestacoesApp.visiveis = [];


        /* --------------------------------------
           EXIBIR MENSAGEM DE ERRO
           -------------------------------------- */

        if (listaManifestacoes) {

            listaManifestacoes.replaceChildren();

            const aviso = criarElemento(
                "p",
                "mensagem-carregamento",
                "Não foi possível consultar a agenda. " +
                "Tente novamente mais tarde."
            );

            listaManifestacoes.appendChild(
                aviso
            );

        }

        if (mensagemSemResultados) {

            mensagemSemResultados.hidden =
                true;

        }


        /* --------------------------------------
           LIMPAR DADOS ANTIGOS DO MAPA
           -------------------------------------- */

        document.dispatchEvent(
            new CustomEvent(
                "manifestacoes:atualizadas",
                {
                    detail: {
                        manifestacoes: []
                    }
                }
            )
        );

    }

}


/* ==========================================
   10. ATUALIZAR ORDENAÇÃO
   ========================================== */

function configurarOrdenacao() {

    if (!seletorOrdenacao) {
        return;
    }

    seletorOrdenacao.addEventListener(
        "change",
        () => {

            mostrarManifestacoes(
                window.ManifestacoesApp.visiveis
            );

        }
    );

}


/* ==========================================
   11. ATUALIZAR ANO DO RODAPÉ
   ========================================== */

function atualizarAno() {

    const elementoAno =
        document.getElementById(
            "ano-atual"
        );

    if (elementoAno) {

        elementoAno.textContent =
            new Date().getFullYear();

    }

}


/* ==========================================
   12. INICIALIZAR O SITE
   ========================================== */

function inicializarSite() {

    console.log(
        "Iniciando Na Rua..."
    );

    atualizarAno();

    configurarOrdenacao();


    // Evita recarregar a página quando
    // o formulário de filtros é enviado.

    const formulario =
        document.getElementById(
            "form-filtros"
        );

    if (formulario) {

        formulario.addEventListener(
            "submit",
            evento => {
                evento.preventDefault();
            }
        );

    }


    // Busca dados no Supabase.

    carregarManifestacoes();

}


// Executa quando o HTML estiver pronto.

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarSite
    );

} else {

    inicializarSite();

}
