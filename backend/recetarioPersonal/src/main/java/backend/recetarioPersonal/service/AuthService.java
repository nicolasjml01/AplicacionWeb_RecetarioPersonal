package backend.recetarioPersonal.service;

import backend.recetarioPersonal.dto.LoginRequest;
import backend.recetarioPersonal.dto.RegistroRequest;
import backend.recetarioPersonal.dto.UsuarioDto;
import backend.recetarioPersonal.dto.VerificarRequest;
import backend.recetarioPersonal.model.Usuario;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Servicio de autenticación (capa de lógica de negocio).
 * Usa datos en memoria para pruebas. Más adelante se conectará a un repositorio/BD.
 */
@Service
public class AuthService {

    private final List<Usuario> usuarios = new ArrayList<>();
    private final AtomicLong idGenerator = new AtomicLong(1);
    /** Usuarios recién registrados que esperan verificación: nombreUsuario -> código */
    private final Map<String, String> pendientesVerificacion = new ConcurrentHashMap<>();

    public AuthService() {
        // Usuario de prueba hardcodeado
        usuarios.add(new Usuario(
            idGenerator.getAndIncrement(),
            "Usuario Prueba",
            "usuario",
            "prueba123",
            "prueba@ejemplo.com",
            true
        ));
    }

    /**
     * Inicio de sesión: comprueba id de usuario y contraseña.
     */
    public Optional<UsuarioDto> login(LoginRequest request) {
        return usuarios.stream()
            .filter(u -> u.getNombreUsuario().equals(request.idUsuario()) && u.getPassword().equals(request.password()))
            .filter(Usuario::isVerificado)
            .findFirst()
            .map(this::toDto);
    }

    /**
     * Registro: crea usuario no verificado y genera un código de verificación (de prueba: "123456").
     */
    public Optional<UsuarioDto> registrar(RegistroRequest request) {
        boolean yaExiste = usuarios.stream()
            .anyMatch(u -> u.getNombreUsuario().equalsIgnoreCase(request.nombreUsuario()) || u.getCorreo().equalsIgnoreCase(request.correo()));
        if (yaExiste) {
            return Optional.empty();
        }
        Usuario nuevo = new Usuario(
            idGenerator.getAndIncrement(),
            request.nombre(),
            request.nombreUsuario(),
            request.password(),
            request.correo(),
            false
        );
        usuarios.add(nuevo);
        pendientesVerificacion.put(request.nombreUsuario(), "123456");
        return Optional.of(toDto(nuevo));
    }

    /**
     * Verificación: comprueba el código para el usuario y lo marca como verificado.
     */
    public Optional<UsuarioDto> verificar(VerificarRequest request) {
        String codigoGuardado = pendientesVerificacion.get(request.nombreUsuario());
        if (codigoGuardado == null || !codigoGuardado.equals(request.codigo())) {
            return Optional.empty();
        }
        pendientesVerificacion.remove(request.nombreUsuario());
        return usuarios.stream()
            .filter(u -> u.getNombreUsuario().equals(request.nombreUsuario()))
            .findFirst()
            .map(u -> {
                u.setVerificado(true);
                return toDto(u);
            });
    }

    private UsuarioDto toDto(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombre(), u.getNombreUsuario(), u.getCorreo(), u.isVerificado());
    }
}
