from rest_framework import serializers
from .models import Empresa, Setor
class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = "__all__"
        read_only_fields = ["id_empresa", "data_cadastro"]
class SetorSerializer(serializers.ModelSerializer):
    empresa_nome = serializers.CharField(source="id_empresa.nome", read_only=True)
    class Meta:
        model = Setor
        fields = ["id_setor", "nome", "id_empresa", "empresa_nome"]
        read_only_fields = ["id_setor"]