from usuarios.models import Usuario, UsuarioSetor


def resolver_tecnico(tecnico_id, admin_user):
    """Valida e retorna o vinculo de tecnico informado pelo admin."""
    if tecnico_id in (None, ""):
        return None

    try:
        tecnico_vinculo = UsuarioSetor.objects.select_related(
            "id_setor",
            "id_usuario",
        ).get(pk=int(tecnico_id))
    except (TypeError, ValueError, UsuarioSetor.DoesNotExist) as exc:
        raise ValueError("Tecnico invalido para atribuicao.") from exc

    if tecnico_vinculo.perfil_no_setor != UsuarioSetor.PerfilSetor.TECNICO:
        if tecnico_vinculo.id_usuario.perfil == Usuario.Perfil.TECNICO:
            tecnico_vinculo.perfil_no_setor = UsuarioSetor.PerfilSetor.TECNICO
            tecnico_vinculo.save(update_fields=["perfil_no_setor"])
        else:
            raise ValueError("O vinculo selecionado nao e de tecnico.")

    if (
        admin_user.id_empresa_id is not None
        and tecnico_vinculo.id_setor.id_empresa_id != admin_user.id_empresa_id
    ):
        raise ValueError("O tecnico deve pertencer a mesma empresa do admin.")

    return tecnico_vinculo
