package com.privytune.backend.models;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/models")
public class ModelsController {



    @GetMapping("/phi-3-mini-4k-instruct")
    public String nothing (){
        return "Hello";
    }

}
