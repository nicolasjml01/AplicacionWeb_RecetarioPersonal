package backend.recetarioPersonal.view;

/** {@code login} may be username or email. */
public record LoginRequest(String login, String password) {}
