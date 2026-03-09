package backend.recetarioPersonal.view;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Name is required")
    @Size(min = 1, max = 100)
    String name, 
    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 100)
    String lastName, 
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email address")
    String email, 
    @NotBlank(message = "Username is required")
    @Size(min = 1, max = 100)
    String username, 
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100)
    String password) { }
