
/* ==========================================
   NA RUA - AGENDA DE MANIFESTAÇÕES
   Arquivo: js/main.js
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

// Objeto compartilhado com filtros.js e mapa.js

window.ManifestacoesApp = {
    dados: [],
    visiveis: [],
    mostrar: mostrarManifestacoes
};


/* ==========================================
   3. FUNÇÕES DE FORMATAÇÃO
   ========================================== */

// Converte 2026-10-18 para 18 de out. de 2026

function formatarData(data) {

    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return "Data a confirmar";
    }

    const [ano, mes, dia] = data.split("-").map(Number);

    // Utilizamos uma data local para evitar
    // deslocamentos de um dia por causa do UTC.

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


// Converte 11:00 para 11h e 16:30 para 16h30

function formatarHorario(horario) {

    if (!horario) {
        return "Horário a confirmar";
    }

    const partes = horario.split(":");

    if (partes.length < 2) {
        return horario;
    }

    const hora = partes[0];
    const minuto = partes[1];

    if (minuto === "00") {
        return `${hora}h`;
    }

    return `${hora}h${minuto}`;

}


// Obtém a data atual no horário de Brasília

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

// Garante que somente links HTTP ou HTTPS
// sejam utilizados nos cartões.

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

// Cria um elemento HTML com classe e texto.
// textContent evita interpretar dados como HTML.

function criarElemento(tag, classe, texto = "") {

    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    elemento.textContent = texto;

    return elemento;

}


// Cria uma linha de informação do cartão.

function criarLinhaInformacao(rotulo, valor) {

    const linha = document.createElement("p");

    const destaque = document.createElement("strong");

    destaque.textContent = `${rotulo}: `;

    const conteudo = document.createTextNode(
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

    cartao.id = `manifestacao-${manifestacao.id}`;


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
        manifestacao.descricao || "Sem descrição disponível."
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


    // Agrupamento do conteúdo

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

    const linkFonte = validarURL(manifestacao.fonte);

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

    // Copiamos o array para evitar alterar
    // a ordem original dos dados.

    const listaOrdenada = [...manifestacoes];

    // Função auxiliar para comparar data e hora

    function compararDataHora(a, b) {

        const dataA = `${a.data || "9999-12-31"}T${a.horario || "23:59"}`;

        const dataB = `${b.data || "9999-12-31"}T${b.horario || "23:59"}`;

        return dataA.localeCompare(dataB);

    }


    if (ordenacao === "cidade") {

        listaOrdenada.sort((a, b) => {

            const comparacao = a.cidade.localeCompare(
                b.cidade,
                "pt-BR"
            );

            return comparacao || compararDataHora(a, b);

        });

    } else {

        listaOrdenada.sort((a, b) => {

            return (
                compararDataHora(a, b) ||
                a.cidade.localeCompare(b.cidade, "pt-BR")
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
        console.error("Elemento da lista não encontrado.");
        return;
    }

    // Limpa os cartões anteriores

    listaManifestacoes.replaceChildren();

    const ordenadas = ordenarManifestacoes(
        manifestacoes
    );

    // Atualiza a lista compartilhada

    window.ManifestacoesApp.visiveis = ordenadas;


    /* --------------------------------------
       LISTA VAZIA
       -------------------------------------- */

    if (ordenadas.length === 0) {

        mensagemSemResultados.hidden = false;

    } else {

        mensagemSemResultados.hidden = true;

        // Cria os cartões em memória

        const fragmento = document.createDocumentFragment();

        ordenadas.forEach(manifestacao => {

            const cartao = criarCartao(manifestacao);

            fragmento.appendChild(cartao);

        });

        // Insere todos os cartões de uma vez

        listaManifestacoes.appendChild(fragmento);

    }


    /* --------------------------------------
       AVISA OUTROS ARQUIVOS
       -------------------------------------- */

    document.dispatchEvent(
        new CustomEvent("manifestacoes:atualizadas", {
            detail: {
                manifestacoes: [...ordenadas]
            }
        })
    );

}


/* ==========================================
   9. CARREGAR JSON
   ========================================== */

async function carregarManifestacoes() {

    try {

        console.log("Carregando manifestações...");

        const resposta = await fetch(
            "data/manifestacoes.json",
            {
                cache: "no-store"
            }
        );

        if (!resposta.ok) {

            throw new Error(
                `Erro HTTP: ${resposta.status}`
            );

        }

        const dados = await resposta.json();

        if (!Array.isArray(dados)) {

            throw new Error(
                "O arquivo JSON deve conter uma lista."
            );

        }

        // Armazena todos os eventos

        window.ManifestacoesApp.dados = dados;


        /* --------------------------------------
           SELECIONA EVENTOS FUTUROS
           -------------------------------------- */

        const hoje = obterDataAtual();

        const eventosFuturos = dados.filter(evento => {

            return (
                typeof evento.data === "string" &&
                evento.data >= hoje
            );

        });


        // Exibe as manifestações

        mostrarManifestacoes(eventosFuturos);


        /* --------------------------------------
           DISPONIBILIZA DADOS PARA OS FILTROS
           -------------------------------------- */

        document.dispatchEvent(
            new CustomEvent("manifestacoes:carregadas", {
                detail: {
                    todas: [...dados],
                    futuras: [...eventosFuturos]
                }
            })
        );


        console.log(
            `${dados.length} manifestações carregadas.`
        );

        console.log(
            `${eventosFuturos.length} manifestações na agenda atual.`
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar manifestações:",
            erro
        );

        // Exibe mensagem amigável

        listaManifestacoes.replaceChildren();

        const aviso = criarElemento(
            "p",
            "mensagem-carregamento",
            "Não foi possível carregar as manifestações. Verifique o arquivo JSON e tente novamente."
        );

        listaManifestacoes.appendChild(aviso);

        mensagemSemResultados.hidden = true;

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
        function () {

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

    const elementoAno = document.getElementById(
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

    console.log("Iniciando Na Rua...");

    atualizarAno();

    configurarOrdenacao();

    // Impede o recarregamento enquanto
    // os filtros ainda estão em desenvolvimento.

    const formulario = document.getElementById(
        "form-filtros"
    );

    if (formulario) {

        formulario.addEventListener(
            "submit",
            evento => evento.preventDefault()
        );

    }

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
