package backend.recetarioPersonal.exception;

import backend.recetarioPersonal.view.ErrorResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.util.Locale;


/**
 * Maps exceptions thrown by services to appropriate HTTP responses.
 * Ensures consistent error bodies and status codes for the API.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .filter(m -> m != null && !m.isBlank())
                .findFirst()
                .orElse("Los datos enviados no son válidos.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(msg, 400));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "";
        String lower = msg.toLowerCase(Locale.ROOT);
        if (lower.contains("not found") || lower.contains("no encontrad")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(msg, 404));
        }
        if (lower.contains("does not belong") || lower.contains("no pertenece")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(msg, 403));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(msg, 400));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Error interno de configuración.";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorResponse(msg, 500));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        String msg = "Conflicto con datos existentes (por ejemplo, un nombre duplicado).";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(msg, 409));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUpload(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(413)
                .body(new ErrorResponse("El fichero supera el tamaño máximo permitido.", 413));
    }
    
    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ErrorResponse> handleMultipart(MultipartException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("Petición multipart inválida o incompleta.", 400));
    }
    
    @ExceptionHandler(RecipeImportException.class)
    public ResponseEntity<ErrorResponse> handleRecipeImport(RecipeImportException ex) {
        String msg = ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : "No se pudo importar la receta desde ese enlace.";
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT).body(new ErrorResponse(msg, 422));
    }

    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<ErrorResponse> handleFileStorage(FileStorageException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Error al guardar o leer el fichero en el servidor.", 500));
    }
}
