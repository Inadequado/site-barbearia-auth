import { useState, useEffect } from "react";
import { SITE_CONFIG, type CategoryConfig } from "../siteConfig";
import { SERVICES, type Service } from "../services";

type AdminTab = "home" | "categories" | "services";

const TAB_LABELS: Record<AdminTab, string> = {
  home: "Home",
  categories: "Categorias",
  services: "Serviços",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminDrawer() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("home");

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);

  // Home
  const [heroLine1, setHeroLine1] = useState(SITE_CONFIG.heroLine1);
  const [heroName, setHeroName] = useState(SITE_CONFIG.heroName);
  const [ctaLabel, setCtaLabel] = useState(SITE_CONFIG.ctaLabel);

  // Categories
  const [categories, setCategories] = useState<CategoryConfig[]>([...SITE_CONFIG.categories]);
  const [newCatLabel, setNewCatLabel] = useState("");

  // Services
  const [services, setServices] = useState<Service[]>([...SERVICES]);
  const [newSvc, setNewSvc] = useState({ name: "", desc: "", price: "", category: "" });
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingSvcId, setEditingSvcId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", desc: "", price: "", category: "" });

  // Save feedback
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const activeCategories = categories.filter((c) => c.active);

  // Quando o painel abre, verifica se já existe sessão válida
  useEffect(() => {
    if (!adminOpen) return;
    if (adminLoggedIn) return;

    setCheckingSession(true);
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setAdminLoggedIn(true);
      })
      .catch(() => {
        // sem rede ou backend offline — deixa o usuário digitar manualmente
      })
      .finally(() => setCheckingSession(false));
  }, [adminOpen, adminLoggedIn]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setLoginError("Preencha usuário e senha.");
      return;
    }
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        setAdminLoggedIn(true);
        setPassword(""); // limpa a senha da memória
      } else if (res.status === 429) {
        setLoginError("Muitas tentativas. Tente novamente em alguns minutos.");
      } else if (res.status === 401) {
        setLoginError("Usuário ou senha inválidos.");
      } else {
        setLoginError("Erro ao entrar. Tente novamente.");
      }
    } catch {
      setLoginError("Sem conexão com o servidor.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // ignora erro de rede no logout — o cookie expira sozinho
    }
    setAdminLoggedIn(false);
    setUsername("");
    setPassword("");
    setAdminOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      let url = "";
      let body: unknown;

      if (adminTab === "home") {
        url = "/api/admin/save/home";
        body = { heroLine1, heroName, ctaLabel };
      } else if (adminTab === "categories") {
        url = "/api/admin/save/categories";
        body = categories;
      } else {
        url = "/api/admin/save/services";
        body = services;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        setAdminLoggedIn(false);
        setSaveMsg("Sessão expirada. Faz login de novo.");
        return;
      }

      if (!res.ok) throw new Error("Resposta inválida do servidor");
      setSaveMsg("Salvo com sucesso!");
    } catch {
      setSaveMsg("Erro ao salvar. Verifique se o backend está rodando.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3500);
    }
  };

  const addCategory = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const id = slugify(label);
    if (categories.some((c) => c.id === id)) return;
    setCategories((prev) => [...prev, { id, label, active: true }]);
    setNewCatLabel("");
  };

  const updateCategory = (index: number, patch: Partial<CategoryConfig>) => {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const removeCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const addService = () => {
    const { name, desc, price, category } = newSvc;
    if (!name.trim() || !desc.trim() || !price.trim() || !category) return;
    const nextId = Math.max(0, ...services.map((s) => s.id)) + 1;
    setServices((prev) => [
      ...prev,
      { id: nextId, slug: slugify(name), name: name.trim(), desc: desc.trim(), price: price.trim(), category },
    ]);
    setNewSvc({ name: "", desc: "", price: "", category: "" });
  };

  const updateService = (index: number, patch: { name: string; desc: string; price: string; category: string }) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, ...patch, slug: slugify(patch.name) } : s
      )
    );
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <button
        type="button"
        className="admin-dot"
        aria-label="Abrir painel administrativo"
        onClick={() => setAdminOpen(true)}
      />

      {adminOpen && (
        <div className="admin-layer" aria-label="Painel administrativo">
          <button
            type="button"
            className="admin-scrim"
            aria-label="Fechar painel"
            onClick={() => setAdminOpen(false)}
          />

          <aside className="admin-drawer">
            <div className="admin-head">
              <div>
                <p className="admin-kicker">Painel</p>
                <h2>Configuração visual</h2>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {adminLoggedIn && (
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={handleLogout}
                  >
                    Sair
                  </button>
                )}
                <button
                  type="button"
                  className="admin-close"
                  aria-label="Fechar painel"
                  onClick={() => setAdminOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>

            {checkingSession ? (
              <div className="admin-login">
                <p className="admin-note">Verificando sessão...</p>
              </div>
            ) : !adminLoggedIn ? (
              <div className="admin-login">
                <label>
                  Usuário
                  <input
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    autoComplete="username"
                  />
                </label>
                <label>
                  Senha
                  <input
                    type="password"
                    placeholder="•••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    autoComplete="current-password"
                  />
                </label>
                {loginError && <p className="admin-note" style={{ color: "#c33" }}>{loginError}</p>}
                <button
                  type="button"
                  className="admin-primary"
                  onClick={handleLogin}
                  disabled={loggingIn}
                >
                  {loggingIn ? "Entrando..." : "Entrar"}
                </button>
                <p className="admin-note">
                  Acesso restrito. Salvar reescreve os arquivos do projeto.
                </p>
              </div>
            ) : (
              <div className="admin-panel">
                <div className="admin-tabs">
                  {(Object.keys(TAB_LABELS) as AdminTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={adminTab === tab ? "active" : ""}
                      onClick={() => setAdminTab(tab)}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                {/* â”€â”€ HOME â”€â”€ */}
                {adminTab === "home" && (
                  <div className="admin-section">
                    <label>
                      Texto superior
                      <input
                        type="text"
                        value={heroLine1}
                        onChange={(e) => setHeroLine1(e.target.value)}
                      />
                    </label>
                    <label>
                      Nome da barbearia
                      <input
                        type="text"
                        value={heroName}
                        onChange={(e) => setHeroName(e.target.value)}
                      />
                    </label>
                    <label>
                      Botão principal
                      <input
                        type="text"
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                      />
                    </label>
                  </div>
                )}

                {/* â”€â”€ CATEGORIAS â”€â”€ */}
                {adminTab === "categories" && (
                  <div className="admin-section">
                    <div className="admin-list">
                      {categories.map((cat, i) => (
                        <div className="admin-row" key={cat.id}>
                          <input
                            type="text"
                            value={cat.label}
                            onChange={(e) => updateCategory(i, { label: e.target.value })}
                          />
                          <button
                            type="button"
                            className={cat.active ? "admin-tag-active" : "admin-tag-inactive"}
                            onClick={() => updateCategory(i, { active: !cat.active })}
                          >
                            {cat.active ? "Ativo" : "Oculto"}
                          </button>
                          <button
                            type="button"
                            className="admin-remove"
                            aria-label={`Remover ${cat.label}`}
                            onClick={() => removeCategory(i)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="admin-row admin-add-row">
                      <input
                        type="text"
                        placeholder="Nova categoria..."
                        value={newCatLabel}
                        onChange={(e) => setNewCatLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
                      />
                      <button type="button" className="admin-secondary" onClick={addCategory}>
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* â”€â”€ SERVIÃ‡OS â”€â”€ */}
                {adminTab === "services" && (
                  <div className="admin-section">
                    {categories.map((cat) => {
                      const catServices = services.filter((s) => s.category === cat.id);
                      const isOpen = expandedCat === cat.id;
                      return (
                        <div key={cat.id} className="admin-cat-block">
                          <button
                            type="button"
                            className={`admin-cat-header${isOpen ? " open" : ""}`}
                            onClick={() => {
                              setExpandedCat(isOpen ? null : cat.id);
                              setEditingSvcId(null);
                            }}
                          >
                            <span className="admin-cat-label">{cat.label}</span>
                            <span className="admin-cat-meta">
                              <span className="admin-cat-count">{catServices.length}</span>
                              <span className="admin-cat-chevron">{isOpen ? "▲" : "▼"}</span>
                            </span>
                          </button>

                          {isOpen && (
                            <div className="admin-svc-list">
                              {catServices.length === 0 && (
                                <p className="admin-empty">Nenhum serviço nesta categoria.</p>
                              )}
                              {catServices.map((svc) => {
                                const svcIdx = services.findIndex((s) => s.id === svc.id);
                                const isEditing = editingSvcId === svc.id;
                                return (
                                  <div key={svc.id}>
                                    {isEditing ? (
                                      <div className="admin-svc-edit">
                                        <label>
                                          Nome
                                          <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                          />
                                        </label>
                                        <div className="admin-grid">
                                          <label>
                                            Preço
                                            <input
                                              type="text"
                                              value={editForm.price}
                                              onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                                            />
                                          </label>
                                          <label>
                                            Categoria
                                            <select
                                              value={editForm.category}
                                              onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                                            >
                                              {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                              ))}
                                            </select>
                                          </label>
                                        </div>
                                        <label>
                                          Descrição
                                          <textarea
                                            value={editForm.desc}
                                            onChange={(e) => setEditForm((p) => ({ ...p, desc: e.target.value }))}
                                          />
                                        </label>
                                        <div className="admin-svc-edit-actions">
                                          <button
                                            type="button"
                                            className="admin-ghost"
                                            onClick={() => setEditingSvcId(null)}
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-secondary"
                                            onClick={() => {
                                              const newCat = editForm.category;
                                              updateService(svcIdx, editForm);
                                              setEditingSvcId(null);
                                              if (newCat !== cat.id) setExpandedCat(newCat);
                                            }}
                                          >
                                            Confirmar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="admin-svc-row">
                                        <div className="admin-svc-info">
                                          <span className="admin-svc-name">{svc.name}</span>
                                          <span className="admin-svc-price">{svc.price}</span>
                                        </div>
                                        <div className="admin-svc-btns">
                                          <button
                                            type="button"
                                            className="admin-secondary"
                                            onClick={() => {
                                              setEditingSvcId(svc.id);
                                              setEditForm({ name: svc.name, desc: svc.desc, price: svc.price, category: svc.category });
                                            }}
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-remove"
                                            aria-label={`Remover ${svc.name}`}
                                            onClick={() => removeService(svcIdx)}
                                          >
                                            ×
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <p className="admin-kicker" style={{ marginTop: "1rem" }}>Adicionar serviço</p>
                    <div className="admin-service-form">
                      <label>
                        Nome
                        <input
                          type="text"
                          value={newSvc.name}
                          onChange={(e) => setNewSvc((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Ex: Corte Tradicional"
                        />
                      </label>
                      <label>
                        Descrição
                        <textarea
                          value={newSvc.desc}
                          onChange={(e) => setNewSvc((p) => ({ ...p, desc: e.target.value }))}
                          placeholder="Breve descrição do serviço"
                        />
                      </label>
                      <div className="admin-grid">
                        <label>
                          Preço
                          <input
                            type="text"
                            value={newSvc.price}
                            onChange={(e) => setNewSvc((p) => ({ ...p, price: e.target.value }))}
                            placeholder="R$ 45"
                          />
                        </label>
                        <label>
                          Categoria
                          <select
                            value={newSvc.category}
                            onChange={(e) => setNewSvc((p) => ({ ...p, category: e.target.value }))}
                          >
                            <option value="">Selecione</option>
                            {activeCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={addService}
                        disabled={!newSvc.name.trim() || !newSvc.desc.trim() || !newSvc.price.trim() || !newSvc.category}
                      >
                        + Adicionar serviço
                      </button>
                    </div>
                  </div>
                )}

                <div className="admin-actions">
                  {saveMsg && <p className="admin-note">{saveMsg}</p>}
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={() => setAdminOpen(false)}
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    className="admin-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
