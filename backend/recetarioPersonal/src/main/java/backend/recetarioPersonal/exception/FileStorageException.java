package backend.recetarioPersonal.exception;

/**
 * Thrown when reading or writing recipe media files on disk fails.
 */
public class FileStorageException extends RuntimeException {

    public FileStorageException(String message) {
        super(message);
    }

    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
