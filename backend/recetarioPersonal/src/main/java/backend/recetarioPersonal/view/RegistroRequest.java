package backend.recetarioPersonal.view;

/**
 * DTO para la petición de creación de nueva cuenta.
 */
public record RegistroRequest(
    String nombre,
    String nombreUsuario,
    String password,
    String correo
) {}
