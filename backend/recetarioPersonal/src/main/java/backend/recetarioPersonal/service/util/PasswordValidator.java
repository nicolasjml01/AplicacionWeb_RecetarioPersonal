package backend.recetarioPersonal.service.util;

public final class PasswordValidator {
    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 72;

    private PasswordValidator() {}

    /**
     * Validates password strength. Returns {@code null} if valid, or a Spanish message for the client.
     */
    public static String validate(String password) {
        if (password == null || password.isBlank()) {
            return "La contraseña no puede estar vacía.";
        }
        if (password.length() < MIN_LENGTH) {
            return "La contraseña debe tener al menos " + MIN_LENGTH + " caracteres.";
        }
        if (password.length() > MAX_LENGTH) {
            return "La contraseña no puede superar " + MAX_LENGTH + " caracteres.";
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            return "La contraseña debe incluir al menos una mayúscula.";
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            return "La contraseña debe incluir al menos una minúscula.";
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            return "La contraseña debe incluir al menos un número.";
        }
        return null;
    }
}
