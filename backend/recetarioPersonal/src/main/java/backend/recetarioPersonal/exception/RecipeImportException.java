package backend.recetarioPersonal.exception;

/**
 * Thrown when a URL cannot be imported (unsupported page, blocked fetch, no structured recipe).
 * User-facing message is in Spanish.
 */
public class RecipeImportException extends RuntimeException {

    public RecipeImportException(String message) {
        super(message);
    }

    public RecipeImportException(String message, Throwable cause) {
        super(message, cause);
    }
}