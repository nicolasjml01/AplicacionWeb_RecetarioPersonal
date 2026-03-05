package backend.recetarioPersonal.controller;

import backend.recetarioPersonal.view.LoginRequest;
import backend.recetarioPersonal.view.RegistroRequest;
import backend.recetarioPersonal.view.UsuarioDto;
import backend.recetarioPersonal.view.VerificarRequest;
import backend.recetarioPersonal.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Controlador REST de autenticación (capa de presentación).
 * Expone la API que consumirá el frontend React.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<UsuarioDto> login(@RequestBody LoginRequest request) {
        Optional<UsuarioDto> usuario = authService.login(request);
        return usuario
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/registro")
    public ResponseEntity<UsuarioDto> registro(@RequestBody RegistroRequest request) {
        Optional<UsuarioDto> usuario = authService.registrar(request);
        return usuario
            .map(u -> ResponseEntity.status(HttpStatus.CREATED).body(u))
            .orElse(ResponseEntity.status(HttpStatus.CONFLICT).build());
    }

    @PostMapping("/verificar")
    public ResponseEntity<UsuarioDto> verificar(@RequestBody VerificarRequest request) {
        Optional<UsuarioDto> usuario = authService.verificar(request);
        return usuario
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.status(HttpStatus.BAD_REQUEST).build());
    }
}
