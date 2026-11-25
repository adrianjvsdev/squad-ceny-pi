from usuarios.models import Usuario, UsuarioSetor


def resolver_tecnico(tecnico_id, admin_user):
    """Valida e retorna o vinculo de tecnico informado pelo admin.

    Toda validacao vem antes da unica escrita (promover o vinculo a tecnico):
    um vinculo de outra empresa e recusado sem ser alterado."""
    if tecnico_id in (None, ""):
        return None

    try:
        tecnico_vinculo = UsuarioSetor.objects.select_related(
            "id_setor",
            "id_usuario",
        ).get(pk=int(tecnico_id))
    except (TypeError, ValueError, UsuarioSetor.DoesNotExist) as exc:
        raise ValueError("Tecnico invalido para atribuicao.") from exc

    e_tecnico_no_setor = tecnico_vinculo.perfil_no_setor == UsuarioSetor.PerfilSetor.TECNICO
    usuario_e_tecnico = tecnico_vinculo.id_usuario.perfil == Usuario.Perfil.TECNICO
    if not e_tecnico_no_setor and not usuario_e_tecnico:
        raise ValueError("O vinculo selecionado nao e de tecnico.")

    if (
        admin_user.id_empresa_id is not None
        and tecnico_vinculo.id_setor.id_empresa_id != admin_user.id_empresa_id
    ):
        raise ValueError("O tecnico deve pertencer a mesma empresa do admin.")

    if not e_tecnico_no_setor:
        tecnico_vinculo.perfil_no_setor = UsuarioSetor.PerfilSetor.TECNICO
        tecnico_vinculo.save(update_fields=["perfil_no_setor"])

    return tecnico_vinculo
