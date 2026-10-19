from rest_framework import serializers
from ordens_servico.models import OrdemServico
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
        fields = ["id_setor", "nome", "ativo", "id_empresa", "empresa_nome"]
        read_only_fields = ["id_setor", "id_empresa"]
        extra_kwargs = {"nome": {"max_length": 40}}

    def validate_ativo(self, value):
        # Desativar o setor desativa os equipamentos dele, então vale a mesma
        # regra do equipamento: nada de OS em aberto.
        if self.instance is not None and self.instance.ativo and not value:
            em_aberto = (
                OrdemServico.objects.em_aberto()
                .filter(id_equipamento__id_setor=self.instance)
                .count()
            )
            if em_aberto:
                raise serializers.ValidationError(
                    f"Não é possível desativar o setor: há {em_aberto} OS em aberto em equipamentos dele. Conclua ou cancele as OS antes."
                )
        return value