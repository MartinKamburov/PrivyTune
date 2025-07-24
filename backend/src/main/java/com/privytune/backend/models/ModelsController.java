package com.privytune.backend.models;

import com.fasterxml.jackson.databind.util.JSONPObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CommonPrefix;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;

import java.util.List;
import java.util.stream.Collectors;

//For right now make this route public so that we can test but later when I
//implement user auth that's when I will change the path to api/v1/models
@RestController
@RequestMapping("/api/v1/models")
public class ModelsController {

    private final RestTemplate restTemplate;
    private final S3Client s3;
    private final String bucket;

    @Value("${CLOUDFRONT_URL}")
    private String CDN_URL;

    public ModelsController(RestTemplate restTemplate, S3Client s3, @Value("${aws.s3.bucket}") String bucket) {
        this.restTemplate = restTemplate;
        this.s3    = s3;
        this.bucket = bucket;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getAllModels(){
        ListObjectsV2Request req = ListObjectsV2Request.builder()
                .bucket(bucket)
                .delimiter("/")     // tell S3 to treat "/" as a folder separator
                .build();

        ListObjectsV2Response res = s3.listObjectsV2(req);

        // commonPrefixes() are the “folders” under the bucket root
        return res.commonPrefixes().stream()
                .map(CommonPrefix::prefix)                      // e.g. "phi-3-mini-4k-instruct/"
                .map(p -> p.endsWith("/")
                        ? p.substring(0, p.length()-1)        // strip trailing slash
                        : p)
                .collect(Collectors.toList());
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

}
