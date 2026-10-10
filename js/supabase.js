
/* ==========================================
   NA RUA - CONEXÃO COM SUPABASE
   Arquivo: js/supabase.js
   ========================================== */

"use strict";

// ==========================================
// 1. CONFIGURAÇÕES PÚBLICAS
// ==========================================

// Substitua pelos dados do seu projeto.

const SUPABASE_URL =
    "https://evklupethwqysrqsunta.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_GS8jmM4l_9a2nBlzMxRoFA_OWFs2eQS";


// ==========================================
// 2. INICIALIZAR CLIENTE
// ==========================================

(function inicializarSupabase() {

    // Verifica se a biblioteca foi carregada.

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error(
            "A biblioteca Supabase não foi carregada."
        );
        return;
    }

    // Verifica se as credenciais foram preenchidas.

    if (
        SUPABASE_URL.includes("SEU_PROJETO") ||
        SUPABASE_PUBLISHABLE_KEY.includes("SUA_CHAVE_AQUI")
    ) {
        console.warn(
            "Configure a URL e a Publishable Key do Supabase."
        );
        return;
    }

    // Cria o cliente utilizando apenas
    // informações públicas.

    const cliente = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );

    // Disponibiliza o cliente aos demais scripts.

    window.naRuaSupabase = cliente;

    console.log(
        "Cliente Supabase inicializado."
    );

})();


// ==========================================
// 3. TESTAR CONEXÃO
// ==========================================

window.verificarSupabaseNaRua = async function () {

    if (!window.naRuaSupabase) {
        console.error("Supabase não configurado.");
        return false;
    }

    try {

        // Consulta somente a tabela pública.
        // Não acessa dados de representantes.

        const { data, error } =
            await window.naRuaSupabase
                .from("manifestacoes")
                .select("id")
                .limit(1);

        if (error) {
            throw error;
        }

        console.log(
            "Conexão com o banco funcionando."
        );

        console.log(
            "Registros públicos retornados:",
            data.length
        );

        return true;

    } catch (erro) {

        console.error(
            "Erro na conexão:",
            erro.message
        );

        return false;

    }

};
