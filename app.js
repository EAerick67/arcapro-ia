(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("quoteForm");
  const errorBox = $("formError");
  const emptyState = $("emptyState");
  const loadingState = $("loadingState");
  const preview = $("quotePreview");
  const quoteText = $("quoteText");
  const actions = $("actions");
  const installBtn = $("installBtn");
  let generatedText = "";
  let installPrompt = null;
  let toastTimer;

  $("year").textContent = new Date().getFullYear();

  function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
  }
  function setLoading(on) {
    loadingState.hidden = !on;
    emptyState.hidden = on || Boolean(generatedText);
    preview.hidden = on || !generatedText;
    actions.hidden = on || !generatedText;
    form.querySelectorAll("button,input,textarea").forEach(el => {
      if (el.id !== "installBtn") el.disabled = on;
    });
    const btn = form.querySelector('[type="submit"]');
    btn.innerHTML = on ? '<span class="spinner-small">◌</span> Gerando proposta...' : '<span>✦</span> Gerar orçamento <span class="arrow">→</span>';
  }
  function readForm() {
    const data = new FormData(form);
    const result = {};
    for (const key of ["client", "service", "details", "price", "payment", "warranty"]) {
      const value = String(data.get(key) || "").trim();
      if (value) result[key] = value;
    }
    return result;
  }
  function buildFallback(data) {
    const parts = [
      `PROPOSTA DE ORÇAMENTO`,
      `Cliente: ${data.client}`,
      ``,
      `Olá, ${data.client}!`,
      `Apresentamos nossa proposta para ${data.service}, com foco em qualidade, praticidade e um atendimento confiável.`,
      data.details ? `\nBENEFÍCIOS E DETALHES\n${data.details}` : "",
      `\nINVESTIMENTO\nValor total: R$ ${data.price}`,
      data.payment ? `\nCONDIÇÕES DE PAGAMENTO\n${data.payment}` : "",
      data.warranty ? `\nPRAZO E GARANTIA\n${data.warranty}` : "",
      `\nFicamos à disposição para esclarecer dúvidas e alinhar os próximos passos.\nAgradecemos a oportunidade!`
    ];
    return parts.filter(Boolean).join("\n");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    const data = readForm();
    if (!data.client || !data.service || !data.price) {
      errorBox.textContent = "Preencha nome do cliente, serviço/produto e valor total.";
      errorBox.hidden = false;
      return;
    }
    setLoading(true);
    try {
      // A chave da API fica no servidor (Cloudflare Pages Function), nunca no navegador.
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível gerar o orçamento.");
      generatedText = String(payload.text || "").trim();
      if (!generatedText) throw new Error("A IA retornou uma proposta vazia. Tente novamente.");
      renderQuote(generatedText);
      toast("Orçamento gerado com sucesso!");
    } catch (error) {
      // A proposta básica continua disponível se a API estiver sem configuração ou fora do ar.
      generatedText = buildFallback(data);
      renderQuote(generatedText);
      errorBox.textContent = `${error.message || "Falha na conexão com a IA"} Exibimos uma versão básica para você não perder o trabalho. Configure GEMINI_API_KEY no Cloudflare para ativar a IA.`;
      errorBox.hidden = false;
    } finally {
      setLoading(false);
    }
  });

  function renderQuote(text) {
    quoteText.textContent = text;
    preview.hidden = false;
    actions.hidden = false;
    emptyState.hidden = true;
  }
  $("whatsappBtn").addEventListener("click", () => {
    if (!generatedText) return;
    const url = "https://api.whatsapp.com/send?text=" + encodeURIComponent(generatedText);
    window.open(url, "_blank", "noopener,noreferrer");
  });
  $("copyBtn").addEventListener("click", async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      toast("Texto copiado para a área de transferência!");
    } catch {
      const area = document.createElement("textarea");
      area.value = generatedText;
      area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select();
      const ok = document.execCommand("copy"); area.remove();
      toast(ok ? "Texto copiado!" : "Não foi possível copiar automaticamente.");
    }
  });
  $("pdfBtn").addEventListener("click", () => {
    if (!generatedText) return;
    if (typeof html2pdf === "undefined") {
      toast("Biblioteca de PDF indisponível. Verifique sua conexão.");
      return;
    }
    const target = $("quotePreview");
    const filename = "orcamento-" + (form.elements.client.value.trim() || "cliente")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() + ".pdf";
    html2pdf().set({
      margin: [12, 12, 12, 12],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#f8faf8" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    }).from(target).save().then(() => toast("PDF pronto para salvar!")).catch(() => toast("Não foi possível gerar o PDF."));
  });
  $("editBtn").addEventListener("click", () => {
    $("client").focus();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installBtn.hidden = false;
    installBtn.classList.add("install-ready");
  });
  installBtn.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      toast(choice.outcome === "accepted" ? "Instalação iniciada!" : "Você pode instalar o app mais tarde.");
      installPrompt = null;
    } else if (window.matchMedia("(display-mode: standalone)").matches) {
      toast("O OrçaPro IA já está instalado.");
    } else {
      toast("No celular, abra o menu do navegador e escolha “Adicionar à tela inicial”.");
    }
  });
  window.addEventListener("appinstalled", () => toast("OrçaPro IA instalado com sucesso!"));
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  if (location.protocol === "file:") {
    errorBox.textContent = "Para usar a IA e instalar o PWA, publique o projeto no Cloudflare Pages ou execute um servidor local. Abrir o HTML diretamente não ativa a API.";
    errorBox.hidden = false;
  }
})();
