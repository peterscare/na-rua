
/* ==========================================
   NA RUA - AGENDA DE MANIFESTAÇÕES
   Arquivo: js/mapa.js
   ========================================== */

"use strict";

/* ==========================================
   1. CONFIGURAÇÕES DO MAPA
   ========================================== */

const CONFIG_MAPA = {
    centro: [-14.235, -51.9253],
    zoomInicial: 4,
    zoomPonto: 14,
    zoomMaximoAjuste: 13,

    azul: "#1646A0",
    vermelho: "#E63946",
    amarelo: "#FFD447",

    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
};

let mapaManifestacoes = null;
let camadaMarcadores = null;
let eventosExibidosMapa = [];


/* ==========================================
   2. PONTOS DE REFERÊNCIA CONHECIDOS
   ========================================== */

/*
   Estas coordenadas representam locais
   públicos identificados em fontes
   cartográficas.

   O ID corresponde ao manifestacoes.json.

   A cidade e o trecho do local são
   conferidos antes de utilizar o ponto,
   evitando associar uma coordenada ao
   evento errado caso o JSON seja alterado.

   Prioridade:
   1. Latitude e longitude do JSON
   2. Pontos de referência desta lista
   3. Sem marcador, se não houver coordenadas
*/

const pontosReferencia = {

    3: {
        cidade: "Campinas",
        local: "Largo do Rosário",
        latitude: -22.90411,
        longitude: -47.05964
    },

    5: {
        cidade: "Brasília",
        local: "Museu da República",
        latitude: -15.797152,
        longitude: -47.878679
    },

    9: {
        cidade: "Salvador",
        local: "Shopping da Bahia",
        latitude: -12.98174,
        longitude: -38.46429
    },

    10: {
        cidade: "São Luís",
        local: "Praça João Lisboa",
        latitude: -2.5299099,
        longitude: -44.3033390
    },

    12: {
        cidade: "Maricá",
        local: "Praça Orlando de Barros Pimentel",
        latitude: -22.91967,
        longitude: -42.81887
    },

    17: {
        cidade: "São Paulo",
        local: "MASP",
        latitude: -23.56150,
        longitude: -46.65597
    },

    19: {
        cidade: "Belo Horizonte",
        local: "Praça da Estação",
        latitude: -19.91679,
        longitude: -43.93397
    },

    21: {
        cidade: "Curitiba",
        local: "Praça 19 de Dezembro",
        latitude: -25.42496,
        longitude: -49.26990
    },

    25: {
        cidade: "Recife",
        local: "Marco Zero",
        latitude: -8.06316,
        longitude: -34.87108
    }

};


/* ==========================================
   3. FUNÇÕES AUXILIARES
   ========================================== */

function normalizarTextoMapa(texto) {

    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


function coordenadasValidas(lat, lon) {

    return (
        typeof lat === "number" &&
        typeof lon === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180 &&
        !(lat === 0 && lon === 0)
    );

}


function formatarDataMapa(data) {

    if (
        typeof data !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
        return "Data a confirmar";
    }

    const [ano, mes, dia] = data.split("-").map(Number);

    const dataLocal = new Date(
        ano, mes - 1, dia, 12
    );

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(dataLocal);

}


function formatarHorarioMapa(horario) {

    if (!horario) {
        return "A confirmar";
    }

    const partes = horario.split(":");

    if (partes.length !== 2) {
        return horario;
    }

    return partes[1] === "00"
        ? `${partes[0]}h`
        : `${partes[0]}h${partes[1]}`;

}


function validarLinkMapa(url) {

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
        console.warn("Link inválido:", url);
    }

    return null;

}


/* ==========================================
   4. LOCALIZAR COORDENADAS DO EVENTO
   ========================================== */

function obterCoordenadas(evento) {

    // Primeiro tenta as coordenadas do JSON.

    if (
        coordenadasValidas(
            evento.latitude,
            evento.longitude
        )
    ) {
        return {
            latitude: evento.latitude,
            longitude: evento.longitude,
            origem: "json"
        };
    }

    // Se não houver coordenadas no JSON,
    // procura na lista de referências.

    const referencia = pontosReferencia[evento.id];

    if (!referencia) {
        return null;
    }

    const mesmaCidade =
        normalizarTextoMapa(evento.cidade) ===
        normalizarTextoMapa(referencia.cidade);

    const localCorrespondente =
        normalizarTextoMapa(evento.local).includes(
            normalizarTextoMapa(referencia.local)
        );

    if (!mesmaCidade || !localCorrespondente) {
        return null;
    }

    return {
        latitude: referencia.latitude,
        longitude: referencia.longitude,
        origem: "referencia"
    };

}


/* ==========================================
   5. CRIAR ÍCONE DO MARCADOR
   ========================================== */

function criarIconeMapa() {

    return L.divIcon({
        className: "marcador-personalizado",

        html: `
            <div style="
                width: 25px;
                height: 25px;
                background: #1646A0;
                border: 4px solid #FFD447;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
        `,

        iconSize: [25, 25],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14]
    });

}


/* ==========================================
   6. CRIAR CONTEÚDO DOS POPUPS
   ========================================== */

/*
   Criamos os elementos com textContent
   para não interpretar dados do JSON
   como código HTML.
*/

function criarTextoPopup(rotulo, valor) {

    const linha = document.createElement("p");

    linha.style.margin = "6px 0";

    const destaque = document.createElement("strong");

    destaque.textContent = `${rotulo}: `;

    linha.appendChild(destaque);

    linha.appendChild(
        document.createTextNode(
            String(valor || "Não informado")
        )
    );

    return linha;

}


function criarPopupMapa(evento, coordenadas) {

    const caixa = document.createElement("div");

    caixa.style.minWidth = "190px";
    caixa.style.maxWidth = "280px";


    // Título

    const titulo = document.createElement("h3");

    titulo.textContent = evento.titulo || "Manifestação";

    titulo.style.color = CONFIG_MAPA.azul;
    titulo.style.fontSize = "16px";
    titulo.style.marginBottom = "10px";

    caixa.appendChild(titulo);


    // Cidade e estado

    caixa.appendChild(
        criarTextoPopup(
            "Cidade",
            `${evento.cidade} / ${evento.estado}`
        )
    );


    // Data

    caixa.appendChild(
        criarTextoPopup(
            "Data",
            formatarDataMapa(evento.data)
        )
    );


    // Horário

    caixa.appendChild(
        criarTextoPopup(
            "Horário",
            formatarHorarioMapa(evento.horario)
        )
    );


    // Local

    caixa.appendChild(
        criarTextoPopup(
            "Local",
            evento.local
        )
    );


    // Situação do evento

    caixa.appendChild(
        criarTextoPopup(
            "Situação",
            evento.status || "A confirmar"
        )
    );


    // Aviso sobre a precisão da localização

    const aviso = document.createElement("p");

    aviso.textContent =
        "Marcador no ponto de referência do local. " +
        "Confirme a concentração com os organizadores.";

    aviso.style.fontSize = "11px";
    aviso.style.marginTop = "10px";
    aviso.style.color = "#657187";

    caixa.appendChild(aviso);


    /* --------------------------------------
       LINK PARA O OPENSTREETMAP
       -------------------------------------- */

    const linkMapa = document.createElement("a");

    const lat = coordenadas.latitude;
    const lon = coordenadas.longitude;

    const urlMapa = new URL(
        "https://www.openstreetmap.org/"
    );

    urlMapa.searchParams.set(
        "mlat",
        String(lat)
    );

    urlMapa.searchParams.set(
        "mlon",
        String(lon)
    );

    urlMapa.hash = `map=17/${lat}/${lon}`;

    linkMapa.href = urlMapa.href;

    linkMapa.target = "_blank";
    linkMapa.rel = "noopener noreferrer";

    linkMapa.textContent = "Ver localização ↗";

    linkMapa.style.display = "block";
    linkMapa.style.marginTop = "12px";
    linkMapa.style.fontWeight = "bold";
    linkMapa.style.color = CONFIG_MAPA.azul;

    caixa.appendChild(linkMapa);


    /* --------------------------------------
       LINK PARA A FONTE
       -------------------------------------- */

    const fonte = validarLinkMapa(evento.fonte);

    if (fonte) {

        const linkFonte = document.createElement("a");

        linkFonte.href = fonte;
        linkFonte.target = "_blank";
        linkFonte.rel = "noopener noreferrer";

        linkFonte.textContent = "Consultar fonte ↗";

        linkFonte.style.display = "block";
        linkFonte.style.marginTop = "8px";
        linkFonte.style.color = CONFIG_MAPA.azul;

        caixa.appendChild(linkFonte);

    }

    return caixa;

}


/* ==========================================
   7. CRIAR LINKS PARA LOCAIS SEM MARCADOR
   ========================================== */

function criarLinkBuscaOSM(evento) {

    const pesquisa = [
        evento.local,
        evento.cidade,
        evento.estado,
        "Brasil"
    ].filter(Boolean).join(", ");

    const url = new URL(
        "https://www.openstreetmap.org/search"
    );

    url.searchParams.set("query", pesquisa);

    const link = document.createElement("a");

    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.textContent =
        `${evento.cidade} (${evento.estado}) — ${evento.local}`;

    return link;

}


/* ==========================================
   8. INFORMAÇÕES ABAIXO DO MAPA
   ========================================== */

function atualizarInformacoesMapa(
    totalEventos,
    totalMarcadores,
    semCoordenadas
) {

    const area = document.getElementById(
        "mapa-informacoes"
    );

    if (!area) {
        return;
    }

    area.replaceChildren();

    const resumo = document.createElement("p");

    resumo.textContent =
        `${totalMarcadores} de ${totalEventos} manifestações ` +
        "possuem ponto de referência no mapa.";

    area.appendChild(resumo);


    if (semCoordenadas.length === 0) {
        return;
    }

    const detalhes = document.createElement("details");

    detalhes.style.marginTop = "10px";

    const titulo = document.createElement("summary");

    titulo.textContent =
        `Ver ${semCoordenadas.length} eventos sem marcador`;

    titulo.style.cursor = "pointer";
    titulo.style.fontWeight = "bold";

    detalhes.appendChild(titulo);

    const lista = document.createElement("ul");

    lista.style.paddingLeft = "22px";
    lista.style.marginTop = "12px";

    semCoordenadas.forEach(evento => {

        const item = document.createElement("li");

        item.style.marginBottom = "8px";

        item.appendChild(
            criarLinkBuscaOSM(evento)
        );

        lista.appendChild(item);

    });

    detalhes.appendChild(lista);
    area.appendChild(detalhes);

    const observacao = document.createElement("p");

    observacao.textContent =
        "Os links de busca não representam " +
        "localizações confirmadas.";

    observacao.style.fontSize = "12px";
    observacao.style.marginTop = "10px";

    area.appendChild(observacao);

}


/* ==========================================
   9. ATUALIZAR MARCADORES DO MAPA
   ========================================== */

function atualizarMapa(manifestacoes) {

    if (!mapaManifestacoes || !camadaMarcadores) {
        return;
    }

    if (!Array.isArray(manifestacoes)) {
        return;
    }

    eventosExibidosMapa = [...manifestacoes];

    // Remove marcadores anteriores.

    camadaMarcadores.clearLayers();

    const coordenadasParaAjuste = [];
    const semCoordenadas = [];

    let totalMarcadores = 0;


    manifestacoes.forEach(evento => {

        const coordenadas = obterCoordenadas(evento);

        if (!coordenadas) {

            semCoordenadas.push(evento);

            return;

        }

        const posicao = [
            coordenadas.latitude,
            coordenadas.longitude
        ];

        // Cria marcador.

        const marcador = L.marker(
            posicao,
            {
                icon: criarIconeMapa(),
                title: evento.titulo || "Manifestação"
            }
        );

        // Adiciona a janela de informações.

        marcador.bindPopup(
            criarPopupMapa(evento, coordenadas),
            {
                maxWidth: 300
            }
        );

        marcador.addTo(camadaMarcadores);

        coordenadasParaAjuste.push(posicao);

        totalMarcadores++;

    });


    /* --------------------------------------
       AJUSTAR VISUALIZAÇÃO
       -------------------------------------- */

    if (coordenadasParaAjuste.length === 1) {

        mapaManifestacoes.setView(
            coordenadasParaAjuste[0],
            CONFIG_MAPA.zoomPonto
        );

    } else if (coordenadasParaAjuste.length > 1) {

        const limites = L.latLngBounds(
            coordenadasParaAjuste
        );

        mapaManifestacoes.fitBounds(limites, {
            padding: [40, 40],
            maxZoom: CONFIG_MAPA.zoomMaximoAjuste
        });

    } else {

        // Não há pontos localizados no filtro atual.

        mapaManifestacoes.setView(
            CONFIG_MAPA.centro,
            CONFIG_MAPA.zoomInicial
        );

    }


    /* --------------------------------------
       ATUALIZAR CONTADOR
       -------------------------------------- */

    atualizarInformacoesMapa(
        manifestacoes.length,
        totalMarcadores,
        semCoordenadas
    );


    console.log(
        `Mapa atualizado: ${totalMarcadores} marcadores, ` +
        `${semCoordenadas.length} eventos sem coordenadas.`
    );

}


/* ==========================================
   10. RECEBER EVENTOS DO MAIN.JS
   ========================================== */

function receberAtualizacaoMapa(evento) {

    const manifestacoes =
        evento.detail?.manifestacoes;

    if (!Array.isArray(manifestacoes)) {
        return;
    }

    atualizarMapa(manifestacoes);

}


/* ==========================================
   11. INICIALIZAR MAPA LEAFLET
   ========================================== */

function inicializarMapa() {

    const elementoMapa = document.getElementById(
        "mapa"
    );

    if (!elementoMapa) {

        console.error(
            "O elemento #mapa não foi encontrado."
        );

        return;
    }

    if (typeof L === "undefined") {

        console.error(
            "A biblioteca Leaflet não foi carregada."
        );

        elementoMapa.textContent =
            "Não foi possível carregar o mapa.";

        return;
    }


    /* --------------------------------------
       CRIAR MAPA
       -------------------------------------- */

    mapaManifestacoes = L.map(
        "mapa",
        {
            center: CONFIG_MAPA.centro,
            zoom: CONFIG_MAPA.zoomInicial,
            zoomControl: true,
            scrollWheelZoom: false
        }
    );


    /* --------------------------------------
       CAMADA OPENSTREETMAP
       -------------------------------------- */

    L.tileLayer(CONFIG_MAPA.tiles, {

        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" ' +
            'target="_blank" rel="noopener noreferrer">' +
            'OpenStreetMap contributors</a>',

        maxZoom: 19

    }).addTo(mapaManifestacoes);


    /* --------------------------------------
       CAMADA DOS MARCADORES
       -------------------------------------- */

    camadaMarcadores = L.layerGroup().addTo(
        mapaManifestacoes
    );


    /* --------------------------------------
       ÁREA DE INFORMAÇÕES
       -------------------------------------- */

    if (!document.getElementById("mapa-informacoes")) {

        const informacoes = document.createElement("div");

        informacoes.id = "mapa-informacoes";

        informacoes.setAttribute(
            "aria-live",
            "polite"
        );

        informacoes.style.marginTop = "18px";

        elementoMapa.insertAdjacentElement(
            "afterend",
            informacoes
        );

    }


    /* --------------------------------------
       SINCRONIZAÇÃO COM O MAIN.JS
       -------------------------------------- */

    document.addEventListener(
        "manifestacoes:atualizadas",
        receberAtualizacaoMapa
    );


    // Caso os dados já estejam disponíveis,
    // atualiza sem esperar outro evento.

    const app = window.ManifestacoesApp;

    if (app && Array.isArray(app.visiveis)) {

        atualizarMapa(app.visiveis);

    }


    console.log(
        "Mapa interativo inicializado."
    );

}


// ==========================================
// 12. EXECUÇÃO
// ==========================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarMapa
    );

} else {

    inicializarMapa();

}
