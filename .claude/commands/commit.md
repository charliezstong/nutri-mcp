# Commit Convention Skill

Cuando el usuario pida hacer commit, sigue estas reglas:

## Conventional Commits

Formato: `<type>(<scope>): <description>`

### Types
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Solo documentación
- `style`: Formato (espacios, puntos y coma, etc.)
- `refactor`: Código que no agrega feature ni fix
- `perf`: Mejora de performance
- `test`: Agregar o corregir tests
- `chore`: Mantenimiento, dependencias, configs
- `ci`: Cambios en CI/CD

### Scope (opcional)
Área afectada: `core`, `docs`, `providers`, `tools`, `config`

### Ejemplos
```
feat(providers): add Edamam nutrition provider
fix(tools): correct allergen detection for soy
docs: update installation guide
chore: upgrade MCP SDK to 1.26.0
refactor(core): simplify cache implementation
```

## Reglas para Main Limpio

1. **NO hacer commits directos a main** para cambios pequeños
2. **Usar amend** si el último commit no se ha pusheado:
   ```bash
   git add . && git commit --amend --no-edit
   ```
3. **Feature branches** para trabajo nuevo:
   ```bash
   git checkout -b feat/nombre-feature
   # trabajar...
   git checkout main
   git merge --squash feat/nombre-feature
   git commit -m "feat: descripción"
   ```

4. **Squash antes de push** si hay varios commits:
   ```bash
   git rebase -i HEAD~N  # N = número de commits a squash
   ```

## NO incluir en commits

- No agregar `Co-Authored-By` a menos que se pida
- No hacer push sin confirmación del usuario
- No commitear archivos `.env`, credentials, o secrets
