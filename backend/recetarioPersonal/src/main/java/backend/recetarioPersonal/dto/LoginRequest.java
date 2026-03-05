package backend.recetarioPersonal.dto;

/**
 * DTO para la petición de inicio de sesión.
 * El front envía id de usuario (nombre de usuario) y contraseña.
 */
public record LoginRequest(String idUsuario, String password) {}
