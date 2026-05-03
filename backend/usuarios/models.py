from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from empresas.models import Empresa, Setor


class UsuarioManager(BaseUserManager):
    """
    Gerenciador customizado — ensina o Django como criar usuários.
    Obrigatório ao usar AbstractBaseUser.
    """

    def create_user(self, email, nome, password=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório")
        email = self.normalize_email(email)
        usuario = self.model(email=email, nome=nome, **extra_fields)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("perfil", "admin")
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, nome, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):

    class Perfil(models.TextChoices):
        ADMIN = "admin", "Administrador"
        GESTOR = "gestor", "Gestor"
        OPERADOR = "operador", "Operador"

    id_usuario = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    perfil = models.CharField(
        max_length=20,
        choices=Perfil.choices,
        default=Perfil.OPERADOR,
    )
    data_cadastro = models.DateTimeField(auto_now_add=True)
    id_empresa = models.ForeignKey(
        Empresa,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usuarios",
        db_column="id_empresa",
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    class Meta:
        db_table = "usuarios"

    def __str__(self):
        return f"{self.nome} ({self.email})"


class UsuarioSetor(models.Model):
    """
    Tabela intermediária entre Usuario e Setor com campo extra perfil_no_setor.
    Não usamos ManyToManyField com through para manter controle total via API.
    """

    class PerfilSetor(models.TextChoices):
        GESTOR = "gestor", "Gestor"
        OPERADOR = "operador", "Operador"
        VISUALIZADOR = "visualizador", "Visualizador"

    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name="usuariosetor_set",
        db_column="id_usuario",
    )
    id_setor = models.ForeignKey(
        Setor,
        on_delete=models.CASCADE,
        related_name="usuariosetor_set",
        db_column="id_setor",
    )
    perfil_no_setor = models.CharField(
        max_length=20,
        choices=PerfilSetor.choices,
        default=PerfilSetor.OPERADOR,
    )

    class Meta:
        db_table = "usuario_setor"
        unique_together = [("id_usuario", "id_setor")]

    def __str__(self):
       return f"{self.id_usuario} → {self.id_setor} ({self.perfil_no_setor})"