
/* ==========================================
   NA RUA - AGENDA DE MANIFESTAÇÕES
   Arquivo: js/filtros.js
   ========================================== */

"use strict";


/* ==========================================
   1. NOMES DOS ESTADOS
   ========================================== */

const nomesEstados = {
    AC: "Acre",
    AL: "Alagoas",
    AP: "Amapá",
    AM: "Amazonas",
    BA: "Bahia",
    CE: "Ceará",
    DF: "Distrito Federal",
    ES: "Espírito Santo",
    GO: "Goiás",
    MA: "Maranhão",
    MT: "Mato Grosso",
    MS: "Mato Grosso do Sul",
    MG: "Minas Gerais",
    PA: "Pará",
    PB: "Paraíba",
    PR: "Paraná",
    PE: "Pernambuco",
    PI: "Piauí",
    RJ: "Rio de Janeiro",
    RN: "Rio Grande do Norte",
    RS: "Rio Grande do Sul",
    RO: "Rondônia",
    RR: "Roraima",
    SC: "Santa Catarina",
    SP: "São Paulo",
    SE: "Sergipe",
    TO: "Tocantins"
};


/* ==========================================
   2. VARIÁVEIS DOS FILTROS
   ========================================== */

let campoBusca;
let campoEstado;
let campoCidade;
let campoData;
let formularioFiltros;

// Armazena apenas eventos futuros,
// recebidos do arquivo main.js.

let manifestacoesDisponiveis = [];

let filtrosCarregados = false;


/* ==========================================
   3. NORMALIZAÇÃO DE TEXTO
   ========================================== */

// Remove acentos e converte o texto
// para letras minúsculas.
//
// Exemplo:
// "São Luís" passa a ser "sao luis".

function normalizarTexto(texto) {

    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .trim();

}


/* ==========================================
   4. CRIAR OPÇÕES DOS SELECTS
   ========================================== */

function criarOpcao(valor, texto) {

    const opcao = document.createElement("option");

    opcao.value = valor;
    opcao.textContent = texto;

    return opcao;

}


/* ==========================================
   5. PREENCHER ESTADOS
   ========================================== */

function preencherEstados() {

    // Guarda a seleção atual.

    const estadoAnterior = campoEstado.value;

    // Obtém os estados dos eventos futuros.

    const estados = [
        ...new Set(
            manifestacoesDisponiveis
                .map(evento => evento.estado)
                .filter(Boolean)
        )
    ];

    // Ordena alfabeticamente pelo nome.

    estados.sort((a, b) => {

        const nomeA = nomesEstados[a] || a;
        const nomeB = nomesEstados[b] || b;

        return nomeA.localeCompare(
            nomeB,
            "pt-BR"
        );

    });

    // Limpa as opções anteriores.

    campoEstado.replaceChildren();

    // Opção inicial.

    campoEstado.appendChild(
        criarOpcao("", "Todos os estados")
    );

    // Adiciona os estados disponíveis.

    estados.forEach(uf => {

        const nome = nomesEstados[uf] || uf;

        const opcao = criarOpcao(
            uf,
            `${nome} (${uf})`
        );

        campoEstado.appendChild(opcao);

    });

    // Restaura a seleção caso ainda exista.

    campoEstado.value = estados.includes(estadoAnterior)
        ? estadoAnterior
        : "";

}


/* ==========================================
   6. PREENCHER CIDADES
   ========================================== */

function preencherCidades() {

    const estadoSelecionado = campoEstado.value;

    const cidadeAnterior = campoCidade.value;

    // Seleciona eventos do estado escolhido.

    let eventos = manifestacoesDisponiveis;

    if (estadoSelecionado) {

        eventos = eventos.filter(evento => {

            return evento.estado === estadoSelecionado;

        });

    }

    // Obtém cidades sem repetição.

    const cidades = [
        ...new Set(
            eventos
                .map(evento => evento.cidade)
                .filter(Boolean)
        )
    ];

    // Ordem alfabética.

    cidades.sort((a, b) => {

        return a.localeCompare(b, "pt-BR");

    });

    // Limpa o seletor.

    campoCidade.replaceChildren();

    campoCidade.appendChild(
        criarOpcao("", "Todas as cidades")
    );

    // Adiciona as cidades disponíveis.

    cidades.forEach(cidade => {

        campoCidade.appendChild(
            criarOpcao(cidade, cidade)
        );

    });

    // Restaura uma cidade selecionada
    // somente se ela ainda estiver disponível.

    campoCidade.value = cidades.includes(cidadeAnterior)
        ? cidadeAnterior
        : "";

}


/* ==========================================
   7. PESQUISA POR TEXTO
   ========================================== */

function correspondePesquisa(evento, pesquisa) {

    if (!pesquisa) {
        return true;
    }

    // Campos utilizados na pesquisa.

    const campos = [
        evento.titulo,
        evento.descricao,
        evento.cidade,
        evento.estado,
        nomesEstados[evento.estado],
        evento.local,
        evento.organizador,
        evento.categoria
    ];

    // Junta todos os campos e remove acentos.

    const textoCompleto = normalizarTexto(
        campos.join(" ")
    );

    // Divide a pesquisa em palavras.
    //
    // Exemplo:
    // "ato rio" encontra eventos que
    // contenham ambas as palavras.

    const palavras = normalizarTexto(pesquisa)
        .split(/\s+/)
        .filter(Boolean);

    return palavras.every(palavra => {

        return textoCompleto.includes(palavra);

    });

}


/* ==========================================
   8. APLICAR TODOS OS FILTROS
   ========================================== */

function aplicarFiltros() {

    if (!filtrosCarregados) {
        return;
    }

    const pesquisa = campoBusca.value;

    const estado = campoEstado.value;

    const cidade = campoCidade.value;

    const data = campoData.value;


    // Aplica todos os filtros simultaneamente.

    const resultados = manifestacoesDisponiveis.filter(
        evento => {

            /* ----------------------------------
               FILTRO DE PESQUISA
               ---------------------------------- */

            const atendePesquisa = correspondePesquisa(
                evento,
                pesquisa
            );


            /* ----------------------------------
               FILTRO DE ESTADO
               ---------------------------------- */

            const atendeEstado = (
                !estado ||
                evento.estado === estado
            );


            /* ----------------------------------
               FILTRO DE CIDADE
               ---------------------------------- */

            const atendeCidade = (
                !cidade ||
                evento.cidade === cidade
            );


            /* ----------------------------------
               FILTRO DE DATA
               ---------------------------------- */

            const atendeData = (
                !data ||
                evento.data === data
            );


            /* ----------------------------------
               RESULTADO FINAL
               ---------------------------------- */

            return (
                atendePesquisa &&
                atendeEstado &&
                atendeCidade &&
                atendeData
            );

        }
    );


    // Envia o resultado para main.js.
    // A função mostrar() cria os cartões
    // e mantém a ordenação selecionada.

    if (
        window.ManifestacoesApp &&
        typeof window.ManifestacoesApp.mostrar === "function"
    ) {

        window.ManifestacoesApp.mostrar(resultados);

    }


    console.log(
        `Filtros aplicados: ${resultados.length} manifestações encontradas.`
    );

}


/* ==========================================
   9. LIMPAR FILTROS
   ========================================== */

function limparFiltros() {

    campoBusca.value = "";

    campoEstado.value = "";

    campoData.value = "";

    // Recria a lista completa de cidades.

    campoCidade.value = "";

    preencherCidades();

    // Volta a exibir todos os eventos futuros.

    aplicarFiltros();

}


/* ==========================================
   10. RECEBER DADOS DO MAIN.JS
   ========================================== */

function receberManifestacoes(evento) {

    const dados = evento.detail?.futuras;

    if (!Array.isArray(dados)) {

        console.error(
            "Os dados recebidos dos filtros são inválidos."
        );

        return;

    }

    // Usa apenas eventos futuros, pois main.js
    // já separou as manifestações encerradas.

    manifestacoesDisponiveis = [...dados];

    filtrosCarregados = true;

    // Preenche os menus automaticamente.

    preencherEstados();

    preencherCidades();

    // Aplica os filtros atuais, se houver.

    aplicarFiltros();

    console.log(
        "Sistema de filtros inicializado."
    );

}


/* ==========================================
   11. CONFIGURAR EVENTOS DOS FILTROS
   ========================================== */

function configurarEventosFiltros() {

    /* --------------------------------------
       PESQUISA DINÂMICA
       -------------------------------------- */

    campoBusca.addEventListener(
        "input",
        aplicarFiltros
    );


    /* --------------------------------------
       MUDANÇA DE ESTADO
       -------------------------------------- */

    campoEstado.addEventListener(
        "change",
        function () {

            // Limpa a cidade selecionada porque
            // estamos escolhendo outro estado.

            campoCidade.value = "";

            preencherCidades();

            aplicarFiltros();

        }
    );


    /* --------------------------------------
       MUDANÇA DE CIDADE
       -------------------------------------- */

    campoCidade.addEventListener(
        "change",
        aplicarFiltros
    );


    /* --------------------------------------
       MUDANÇA DE DATA
       -------------------------------------- */

    campoData.addEventListener(
        "change",
        aplicarFiltros
    );


    /* --------------------------------------
       BOTÃO BUSCAR
       -------------------------------------- */

    formularioFiltros.addEventListener(
        "submit",
        function (evento) {

            evento.preventDefault();

            aplicarFiltros();

        }
    );


    /* --------------------------------------
       BOTÃO LIMPAR
       -------------------------------------- */

    formularioFiltros.addEventListener(
        "reset",
        function (evento) {

            // Impede o reset padrão para que
            // possamos atualizar os selects
            // e os cartões na ordem correta.

            evento.preventDefault();

            limparFiltros();

        }
    );

}


/* ==========================================
   12. INICIALIZAR FILTROS
   ========================================== */

function inicializarFiltros() {

    campoBusca = document.getElementById("busca");

    campoEstado = document.getElementById("estado");

    campoCidade = document.getElementById("cidade");

    campoData = document.getElementById("data");

    formularioFiltros = document.getElementById(
        "form-filtros"
    );


    // Verifica se os elementos existem.

    if (
        !campoBusca ||
        !campoEstado ||
        !campoCidade ||
        !campoData ||
        !formularioFiltros
    ) {

        console.error(
            "Não foi possível localizar os campos de filtro no HTML."
        );

        return;

    }


    // Aguarda o evento que main.js dispara
    // após carregar o arquivo JSON.

    document.addEventListener(
        "manifestacoes:carregadas",
        receberManifestacoes
    );


    // Configura todas as interações.

    configurarEventosFiltros();

    console.log(
        "Aguardando os dados das manifestações..."
    );

}


/* ==========================================
   13. EXECUTAR QUANDO O HTML ESTIVER PRONTO
   ========================================== */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarFiltros
    );

} else {

    inicializarFiltros();

}
