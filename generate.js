const SYSTEM_PROMPT = `Você é um especialista sênior em vendas técnicas, atendimento consultivo e redação de propostas comerciais no Brasil.
Crie um orçamento profissional em português brasileiro, persuasivo sem exageros, claro, cordial e fácil de ler no WhatsApp.
Organize com títulos curtos e emojis estratégicos, nesta ordem quando houver dados: 📄 PROPOSTA DE ORÇAMENTO; 👋 Apresentação; 🧩 O que está incluso / Benefícios; 💰 Investimento; 💳 Condições de pagamento; 🛡️ Prazo e garantia; 🤝 Próximos passos.
Use somente fatos fornecidos pelo usuário. Não invente especificações, serviços inclusos, descontos, prazos, formas de pagamento, validade da proposta ou garantias. Se algum campo opcional não foi informado, omita completamente a seção correspondente. Preserve exatamente o valor informado. Não prometa resultados impossíveis. Termine com uma frase cordial convidando o cliente a tirar dúvidas ou confirmar a proposta. Não inclua comentários sobre o processo de IA.`;

export async function onRequestPost({ request, env }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  try {
    if (!env.GEMINI_API_KEY) {
      return Response.json({ error: "A API ainda não está configurada no servidor." }, { status: 503, headers });
    }
    const body = await request.json();
    const allowed = ["client", "service", "details", "price", "payment", "warranty"];
    const input = {};
    for (const key of allowed) {
      if (typeof body[key] === "string") {
        const value = body[key].trim().slice(0, key === "details" ? 2500 : 300);
        if (value) input[key] = value;
      }
    }
    if (!input.client || !input.service || !input.price) {
      return Response.json({ error: "Informe cliente, serviço/produto e valor total." }, { status: 400, headers });
    }
    const fields = [
      ["Cliente", input.client],
      ["Serviço ou produto", input.service],
      ["Descrição e detalhes", input.details],
      ["Valor total informado", input.price],
      ["Condições de pagamento", input.payment],
      ["Prazo e garantia", input.warranty]
    ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");

    const apiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: `Crie uma proposta usando somente estes dados:\n${fields}` }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 1400 }
        })
      }
    );
    const result = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      const detail = result?.error?.message || "Erro ao consultar o serviço de IA.";
      return Response.json({ error: detail }, { status: apiResponse.status === 429 ? 429 : 502, headers });
    }
    const text = result?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
    if (!text) return Response.json({ error: "A IA não retornou texto. Tente novamente." }, { status: 502, headers });
    return Response.json({ text }, { headers });
  } catch {
    return Response.json({ error: "Requisição inválida ou falha interna ao gerar a proposta." }, { status: 400, headers });
  }
}
