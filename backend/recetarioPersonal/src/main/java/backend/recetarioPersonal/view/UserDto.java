package backend.recetarioPersonal.view;

// Returned to the client as a JSON object information about the user.
public record UserDto (long id, String name, String lastName, String username, String email, boolean verified) {}
