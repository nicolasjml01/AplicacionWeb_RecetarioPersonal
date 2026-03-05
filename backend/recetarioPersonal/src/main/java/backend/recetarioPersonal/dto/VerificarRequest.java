package backend.recetarioPersonal.dto;

/**
 * DTO para la petición de verificación de cuenta (código enviado por correo, etc.).
 */
public record VerificarRequest(String nombreUsuario, String codigo) {}
