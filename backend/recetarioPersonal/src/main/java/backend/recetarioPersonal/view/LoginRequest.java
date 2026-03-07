package backend.recetarioPersonal.view;

/**
 * Client sends username and password in the request body.
 * Record provides constructor and getters for JSON binding.
 */
public record LoginRequest(String username, String password) {}
