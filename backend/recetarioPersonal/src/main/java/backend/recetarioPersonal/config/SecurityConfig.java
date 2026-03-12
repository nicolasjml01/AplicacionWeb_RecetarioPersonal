package backend.recetarioPersonal.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.context.annotation.Bean;

@Configuration
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
    }

    // Bean used for the password encoder to hash the passwords
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/h2-console/**").permitAll()
                .anyRequest().permitAll()  // o .authenticated() if you want to protect the rest
            )
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .headers(headers -> headers.frameOptions(f -> f.sameOrigin()))  // allows frames from the same origin (H2)
            .csrf(csrf -> csrf.ignoringRequestMatchers("/h2-console/**", "/api/**"));
        return http.build();
}
}
