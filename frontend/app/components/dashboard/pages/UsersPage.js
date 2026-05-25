"use client";

import { useState, useEffect, useCallback } from "react";
import { C } from "@/lib/constants";
import { Badge, Btn, Ico, Input, Modal, Select } from "@/app/components/ui";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getSetores,
  getUsuarioSetores,
  associarSetor,
  atualizarSetor,
} from "@/lib/usuarios";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERFIL_LABELS = {
  admin: "Administrador",
  tecnico: "Técnico",
  operador: "Operador",
};

const PERFIL_BADGE = {
  admin: "purple",
  tecnico: "blue",
  operador: "gray",
};

function formatLastLogin(dt) {
  if (!dt) return "—";
  const date = new Date(dt);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 2) return "Agora";
  if (diffH < 1) return `${diffMin} min atrás`;
  if (diffD < 1)
    return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffD === 1) return "Ontem";
  return `${diffD} dias atrás`;
}

const FORM_VAZIO = {
  nome: "",
  email: "",
  password: "",
  perfil: "operador",
  id_setor: "",
  perfil_no_setor: "operador",
  is_active: true,
};

// ─── Componente ─────────────────────────────────────────────────────────────

export function UsersPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [vinculos, setVinculos] = useState([]); // usuario-setor
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [tab, setTab] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null); // usuário sendo editado (objeto completo)
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErro, setFormErro] = useState(null);

  // ─── Carga inicial ───────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [us, st, vc] = await Promise.all([
        getUsuarios(),
        getSetores(),
        getUsuarioSetores(),
      ]);
      setUsuarios(us);
      setSetores(st);
      setVinculos(vc);
    } catch (e) {
      setErro("Não foi possível carregar os dados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ─── Helpers de vínculo ──────────────────────────────────────────────────

  function vinculoDoUsuario(id_usuario) {
    return vinculos.find((v) => v.id_usuario === id_usuario) ?? null;
  }

  function setorDoUsuario(id_usuario) {
    const v = vinculoDoUsuario(id_usuario);
    if (!v) return "—";
    return v.setor_nome ?? "—";
  }

  // ─── Abrir modal ─────────────────────────────────────────────────────────

  function abrirCriar() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormErro(null);
    setShowModal(true);
  }

  function abrirEditar(u) {
    const vinculo = vinculoDoUsuario(u.id_usuario);
    setEditando(u);
    setForm({
      nome: u.nome,
      email: u.email,
      password: "",
      perfil: u.perfil,
      id_setor: vinculo ? String(vinculo.id_setor) : "",
      perfil_no_setor: vinculo ? vinculo.perfil_no_setor : "operador",
      is_active: u.is_active,
    });
    setFormErro(null);
    setShowModal(true);
  }

  function fecharModal() {
    setShowModal(false);
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormErro(null);
  }

  // ─── Salvar (criar ou editar) ────────────────────────────────────────────

  async function handleSalvar() {
    setFormErro(null);

    // Validação mínima
    if (!form.nome.trim()) return setFormErro("Nome é obrigatório.");
    if (!form.email.trim()) return setFormErro("E-mail é obrigatório.");
    if (!editando && !form.password.trim())
      return setFormErro("Senha é obrigatória.");

    setSalvando(true);
    try {
      const perfilNoSetorEfetivo =
        form.perfil === "tecnico" ? "tecnico" : form.perfil_no_setor;

      if (editando) {
        // ── Edição ──────────────────────────────────────────────────────
        const payload = {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
          is_active: form.is_active,
        };
        if (form.password.trim()) payload.password = form.password;

        await updateUsuario(editando.id_usuario, payload);

        // Atualiza vínculo de setor
        const vinculoAtual = vinculoDoUsuario(editando.id_usuario);
        if (form.id_setor) {
          if (vinculoAtual) {
            // Mudou de setor ou perfil_no_setor
            if (
              String(vinculoAtual.id_setor) !== form.id_setor ||
              vinculoAtual.perfil_no_setor !== perfilNoSetorEfetivo
            ) {
              await atualizarSetor(
                vinculoAtual.id,
                form.id_setor,
                perfilNoSetorEfetivo,
              );
            }
          } else {
            await associarSetor(
              editando.id_usuario,
              form.id_setor,
              perfilNoSetorEfetivo,
            );
          }
        }
      } else {
        // ── Criação ─────────────────────────────────────────────────────
        const novo = await createUsuario({
          nome: form.nome,
          email: form.email,
          password: form.password,
          perfil: form.perfil,
        });

        if (form.id_setor && form.id_setor !== "") {
          await associarSetor(
            novo.id_usuario,
            Number(form.id_setor),
            perfilNoSetorEfetivo,
          );
        }
      }

      await carregar();
      fecharModal();
    } catch (e) {
      const detail = e?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.values(detail).flat().join(" ");
        setFormErro(msgs);
      } else {
        setFormErro("Erro ao salvar. Tente novamente.");
      }
    } finally {
      setSalvando(false);
    }
  }

  // ─── Excluir ─────────────────────────────────────────────────────────────

  async function handleExcluir(u) {
    if (
      !confirm(
        `Excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      await deleteUsuario(u.id_usuario);
      await carregar();
    } catch {
      alert("Não foi possível excluir o usuário.");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: C.gray400,
          fontSize: "0.85rem",
        }}
      >
        Carregando usuários...
      </div>
    );
  }

  if (erro) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "red",
          fontSize: "0.85rem",
        }}
      >
        {erro}
        <br />
        <Btn
          size="sm"
          variant="ghost"
          onClick={carregar}
          style={{ marginTop: 8 }}
        >
          Tentar novamente
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: C.gray900,
            }}
          >
            Usuários do Sistema
          </h2>
          <p
            style={{ margin: "2px 0 0", fontSize: "0.78rem", color: C.gray400 }}
          >
            {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""}{" "}
            cadastrado{usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Btn onClick={abrirCriar} icon="plus">
          Cadastrar Usuário
        </Btn>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${C.gray200}`,
        }}
      >
        {["list", "permissions"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.6rem 1.1rem",
              fontSize: "0.82rem",
              fontWeight: 500,
              color: tab === t ? C.blue : C.gray500,
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom: `2px solid ${tab === t ? C.blue : "transparent"}`,
              transition: "all 0.15s",
            }}
          >
            {t === "list" ? "Lista de Usuários" : "Permissões"}
          </button>
        ))}
      </div>

      {/* Tab: Lista */}
      {tab === "list" && (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr style={{ background: C.gray50 }}>
                {[
                  "Nome",
                  "E-mail",
                  "Função",
                  "Setor",
                  "Status",
                  "Último acesso",
                  "Ações",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.65rem 1rem",
                      textAlign: "left",
                      color: C.gray500,
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${C.gray200}`,
                    }}
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr
                  key={u.id_usuario}
                  style={{
                    borderBottom:
                      i < usuarios.length - 1
                        ? `1px solid ${C.gray100}`
                        : "none",
                  }}
                >
                  {/* Nome */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: C.blueLight,
                          color: C.blue,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {u.nome
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <span style={{ fontWeight: 500, color: C.gray800 }}>
                        {u.nome}
                      </span>
                    </div>
                  </td>

                  {/* E-mail */}
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>
                    {u.email}
                  </td>

                  {/* Função */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={PERFIL_BADGE[u.perfil] ?? "gray"}>
                      {PERFIL_LABELS[u.perfil] ?? u.perfil}
                    </Badge>
                  </td>

                  {/* Setor */}
                  <td style={{ padding: "0.75rem 1rem", color: C.gray500 }}>
                    {setorDoUsuario(u.id_usuario)}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Badge color={u.is_active ? "green" : "gray"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>

                  {/* Último acesso */}
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: C.gray400,
                      fontSize: "0.75rem",
                    }}
                  >
                    {formatLastLogin(u.last_login)}
                  </td>

                  {/* Ações */}
                  <td
                    style={{ padding: "0.75rem 1rem", display: "flex", gap: 6 }}
                  >
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon="settings"
                      onClick={() => abrirEditar(u)}
                    >
                      Editar
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      onClick={() => handleExcluir(u)}
                    >
                      Excluir
                    </Btn>
                  </td>
                </tr>
              ))}

              {usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: C.gray400,
                    }}
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Permissões */}
      {tab === "permissions" && (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.gray200}`,
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          <p
            style={{
              margin: "0 0 1rem",
              fontSize: "0.82rem",
              color: C.gray500,
            }}
          >
            Controle de acesso por função (RBAC)
          </p>
          {[
            {
              role: "Administrador",
              perms: [
                "Gerenciar usuários",
                "Cadastrar setores",
                "Cadastrar equipamentos",
                "Ver todos os chamados",
                "Mapa de risco",
                "Relatórios completos",
              ],
            },
            {
              role: "Técnico",
              perms: [
                "Ver inventário",
                "Criar chamados",
                "Ver meus chamados",
                "Mapa de risco (leitura)",
              ],
            },
            {
              role: "Operador",
              perms: ["Criar chamados", "Ver meus chamados"],
            },
          ].map(({ role, perms }) => (
            <div
              key={role}
              style={{
                marginBottom: "1.25rem",
                padding: "1rem",
                background: C.gray50,
                borderRadius: 6,
                border: `1px solid ${C.gray200}`,
              }}
            >
              <h4
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: C.gray800,
                }}
              >
                {role}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {perms.map((p) => (
                  <span
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: C.greenLight,
                      color: C.greenDark,
                      border: `1px solid #86efac`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Ico name="check" size={11} color={C.greenDark} /> {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar / Editar */}
      <Modal
        open={showModal}
        onClose={fecharModal}
        title={editando ? "Editar Usuário" : "Cadastrar Usuário"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label="Nome completo"
            placeholder="Ex: Carlos Silva"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@empresa.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label={
              editando ? "Nova senha (deixe em branco para manter)" : "Senha"
            }
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
          <Select
            label="Função"
            value={form.perfil}
            onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
          >
            <option value="admin">Administrador</option>
            <option value="tecnico">Técnico</option>
            <option value="operador">Operador</option>
          </Select>
          <Select
            label="Setor"
            value={form.id_setor}
            onChange={(e) =>
              setForm((f) => ({ ...f, id_setor: e.target.value }))
            }
          >
            <option value="">Selecione o setor...</option>
            {setores.map((s) => (
              <option key={s.id_setor} value={String(s.id_setor)}>
                {s.nome}
              </option>
            ))}
          </Select>

          {/* Status — só exibe na edição */}
          {editando && (
            <Select
              label="Status"
              value={form.is_active ? "true" : "false"}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.value === "true" }))
              }
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Select>
          )}

          {formErro && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "red" }}>
              {formErro}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <Btn variant="ghost" onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Btn>
            <Btn onClick={handleSalvar} disabled={salvando}>
              {salvando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
