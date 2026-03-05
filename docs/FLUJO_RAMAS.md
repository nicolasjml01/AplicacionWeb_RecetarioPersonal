# Flujo de trabajo con ramas (Git)

Este proyecto usa una estrategia de ramas para mantener **main** estable y poder probar cambios sin romper el proyecto final.

## Ramas

| Rama | Uso |
|------|-----|
| **main** | Proyecto final / estable. Solo código probado y listo para entrega o despliegue. |
| **develop** | Desarrollo activo. Trabajo diario e integración de funcionalidades antes de llevarlas a main. |
| **experimentos** | Pruebas arriesgadas, prototipos o ideas. Si algo falla, main y develop no se ven afectados. |

## Flujo recomendado

### Trabajo normal (desarrollo de features)
1. Trabaja en **develop**: `git checkout develop`
2. Haz commits con frecuencia.
3. Cuando una funcionalidad esté lista y probada, intégrala en main:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

### Pruebas o cambios arriesgados
1. Crea una rama desde develop (o desde experimentos si ya estás ahí):
   ```bash
   git checkout develop
   git checkout -b experimentos   # o: git checkout experimentos (si ya existe)
   ```
2. Haz tus pruebas en **experimentos**. Si algo se rompe, no afecta a develop ni a main.
3. Si el experimento sale bien, trae los cambios a develop:
   ```bash
   git checkout develop
   git merge experimentos
   ```
4. Luego, cuando quieras actualizar el “proyecto final”, merge de develop → main (como arriba).

### Resumen rápido
- **¿Es un paso crucial o experimental?** → Trabaja en **experimentos** (o en una rama nueva tipo `feature/nombre`).
- **¿Ya está probado y quieres que forme parte del proyecto?** → Merge a **develop**.
- **¿Quieres dejarlo como “versión final” estable?** → Merge **develop** → **main**.

## Comandos útiles

```bash
# Ver en qué rama estás
git branch

# Cambiar de rama
git checkout main
git checkout develop
git checkout experimentos

# Subir ramas al remoto (para backup o trabajo en otro PC)
git push -u origin develop
git push -u origin experimentos
```

## Buenas prácticas
- No hagas commits directos en **main** de cosas sin probar; usa siempre develop o experimentos primero.
- Haz merge a **main** solo cuando tengas una versión que quieras considerar “estable” o “entrega”.
- Si quieres aislar aún más una feature, crea una rama tipo `feature/nombre-feature` desde develop, trabaja ahí y luego haz merge a develop.
