from rest_framework import serializers
from .models import Usuario, UsuarioSetor


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)  # required=False para permitir PATCH sem senha

    class Meta:
        model = Usuario
        fields = [
            "id_usuario",
            "nome",
            "email",
            "password",
            "perfil",
            "data_cadastro",
            "id_empresa",
        ]
        read_only_fields = ["id_usuario", "data_cadastro"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)
class UsuarioSetorSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="id_usuario.nome", read_only=True)
    setor_nome = serializers.CharField(source="id_setor.nome", read_only=True)

    class Meta:
        model = UsuarioSetor
        fields = [
            "id",
            "id_usuario",
            "usuario_nome",
            "id_setor",
            "setor_nome",
            "perfil_no_setor",
        ]

    def validate(self, data):
        # Garante que não existe duplicata (a unique_together no Meta já protege no DB,
        # mas aqui damos um erro mais amigável via API)
        usuario = data.get("id_usuario")
        setor = data.get("id_setor")
        if usuario and setor:
            qs = UsuarioSetor.objects.filter(id_usuario=usuario, id_setor=setor)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Este usuário já está associado a este setor."
                )
        return data