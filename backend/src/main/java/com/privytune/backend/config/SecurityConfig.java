package com.privytune.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    private final AuthenticationProvider authenticationProvider;


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1) 1) enable CORS using your WebMvcConfigurer rules
                .cors(withDefaults())
                .csrf(csrf -> csrf.disable()) // then disable CSRF

                // 2) URL rules
                .authorizeHttpRequests(auth -> auth
                        // public endpoints:
                        .requestMatchers("/api/v1/models/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // private endpoints go here, there is no point in this if you have the code .anyRequest().authenticated() but I am just showing as an example
                        .requestMatchers("/api/auth/test-controller").authenticated()
                        // every other endpoint needs authentication
                        .anyRequest().authenticated()
                )

                // 3) stateless sessions
                .sessionManagement(sess -> sess
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 4) wire in your own AuthenticationProvider
                .authenticationProvider(authenticationProvider)

                // 5) run your JWT filter before the UsernamePassword filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

}
