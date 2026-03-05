package backend.recetarioPersonal.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Modelo de usuario en memoria (sin JPA por ahora).
 * Más adelante se puede sustituir por una entidad JPA.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    private Long id;
    private String nombre;
    private String nombreUsuario;
    private String password;
    private String correo;
    private boolean verificado;
}
