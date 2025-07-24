package com.privytune.backend.models;

import com.fasterxml.jackson.databind.util.JSONPObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

//For right now make this route public so that we can test but later when I
//implement user auth that's when I will change the path to api/v1/models
@RestController
@RequestMapping("/api/v1/models")
public class ModelsController {

    private final RestTemplate restTemplate;

    @Value("${CLOUDFRONT_URL}")
    private String CDN_URL;

    public ModelsController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping(path = "/{modelId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getModelManifest(@PathVariable String modelId) {
        // Build the URL to the manifest.json in your CDN
        // build the full URL
        String manifestUrl = String.format(
                "https://%s/%s/manifest.json",
                CDN_URL,
                modelId
        );

        // Fetch it
        ResponseEntity<String> manifestResponse =
                restTemplate.getForEntity(manifestUrl, String.class);

        // Mirror status code & JSON back to the caller
        return ResponseEntity
                .status(manifestResponse.getStatusCode())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(manifestResponse.getBody());
    }


    @GetMapping("/hello")
    public String helloWorld(){
        return "Hello";
    }

}
