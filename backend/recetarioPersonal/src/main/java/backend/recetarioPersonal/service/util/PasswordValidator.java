package backend.recetarioPersonal.service.util;

public final class PasswordValidator {
    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 72;
    /**
     * Validates the password. Returns null if valid, or an error message if not.
     */
    public static String validate(String password) {
        if (password == null || password.isBlank()) {
            return "Password cannot be empty.";
        }
        if (password.length() < MIN_LENGTH) {
            return "Password must be at least " + MIN_LENGTH + " characters.";
        }
        if (password.length() > MAX_LENGTH) {
            return "Password cannot exceed " + MAX_LENGTH + " characters.";
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            return "Password must contain at least one uppercase letter.";
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            return "Password must contain at least one lowercase letter.";
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            return "Password must contain at least one number.";
        }
        return null;
    }
}
