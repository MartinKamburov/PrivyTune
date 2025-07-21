package com.privytune.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${frontend.url}")
    private String frontendUrl;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry
                // match your controller paths
                .addMapping("/api/**")
                // allow your React dev server
                .allowedOrigins(frontendUrl)
                // methods you need
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                // if you need headers like Authorization
                .allowedHeaders("*")
                // expose any headers back to the client
                .exposedHeaders("Authorization")
                // whether cookies are supported
                .allowCredentials(true)
        ;
    }
}
