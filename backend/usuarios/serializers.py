from django.db import transaction
from rest_framework import serializers
from .models import Usuario, UsuarioSetor
from empresas.models import Empresa


class RegistroSerializer(serializers.Serializer):
    nome_empresa = serializers.CharField(max_length=200)
    cnpj         = serializers.CharField(max_length=18)
    telefone     = serializers.CharField(max_length=20)
    nome         = serializers.CharField(max_length=200)
    email        = serializers.EmailField()
    senha        = serializers.CharField(write_only=True, min_length=6)

    def validate_cnpj(self, value):
        if Empresa.objects.filter(cnpj=value).exists():
            raise serializers.ValidationError("CNPJ já cadastrado.")
        return value

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("E-mail já cadastrado.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        empresa = Empresa.objects.create(
            nome     = validated_data["nome_empresa"],
            cnpj     = validated_data["cnpj"],
            email    = validated_data["email"],
            telefone = validated_data["telefone"],
        )

        usuario = Usuario(
            nome       = validated_data["nome"],
            email      = validated_data["email"],
            perfil     = Usuario.Perfil.ADMIN,
            id_empresa = empresa,
            is_active  = True,
        )
        usuario.set_password(validated_data["senha"])
        usuario.save()

        return usuario


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            "id_usuario",
            "nome",
            "email",
            "password",
            "perfil",
            "is_active",
            "data_cadastro",
            "last_login",
            "id_empresa",
        ]
        read_only_fields = ["id_usuario", "data_cadastro", "last_login"]

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
    usuario_perfil = serializers.CharField(source="id_usuario.perfil", read_only=True)
    setor_nome   = serializers.CharField(source="id_setor.nome",   read_only=True)

    class Meta:
        model = UsuarioSetor
        fields = [
            "id",
            "id_usuario",
            "usuario_nome",
            "usuario_perfil",
            "id_setor",
            "setor_nome",
            "perfil_no_setor",
        ]

    def validate(self, data):
        usuario = data.get("id_usuario")
        setor   = data.get("id_setor")
        if usuario and setor:
            qs = UsuarioSetor.objects.filter(id_usuario=usuario, id_setor=setor)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Este usuário já está associado a este setor."
                )
        return data
