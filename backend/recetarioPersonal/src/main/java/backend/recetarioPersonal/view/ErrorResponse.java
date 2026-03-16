package backend.recetarioPersonal.view;

/**
 * Standard error body returned by the API when an exception is handled.
 */
public record ErrorResponse(String message, int status) {}
