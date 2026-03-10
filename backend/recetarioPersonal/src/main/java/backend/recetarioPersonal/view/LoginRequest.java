package backend.recetarioPersonal.view;

/**
 * Client sends login and password in the request body.
 * Login can be username or email.
 * Record provides constructor and getters for JSON binding.
 */
public record LoginRequest(String login, String password) {}
