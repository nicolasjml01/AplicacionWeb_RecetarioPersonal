package backend.recetarioPersonal.view;

/** Safe user profile returned by auth endpoints (no password). */
public record UserDto(long id, String name, String lastName, String username, String email, boolean verified) {}
