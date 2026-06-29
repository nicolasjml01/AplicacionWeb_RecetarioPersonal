package backend.recetarioPersonal.security;

public record AuthenticatedUser(long userId, String username) {}
