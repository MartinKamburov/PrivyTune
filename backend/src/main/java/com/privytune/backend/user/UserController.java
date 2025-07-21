package com.privytune.backend.user;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("/api/auth")
public class UserController {

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/hello")
    public String hello(){
        return "hello";
    }
}
