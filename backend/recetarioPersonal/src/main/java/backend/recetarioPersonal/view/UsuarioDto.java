package backend.recetarioPersonal.view;

/**
 * DTO de respuesta: datos del usuario que devolvemos al front (sin contraseña).
 */
public record UsuarioDto(
    Long id,
    String nombre,
    String nombreUsuario,
    String correo,
    boolean verificado
) {}
