package com.privytune.backend.models;

import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.annotation.PostConstruct;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class ModelsService {
    private final WebClient webClient;
    private final ObjectMapper mapper;
    private final Path modelDir;
    private final String baseUrl;
    private final String modelId;

    public ModelsService(
            WebClient.Builder webClientBuilder,
            ObjectMapper mapper,
            // configure these via application.properties
            @Value("${model.base-url}") String baseUrl,
            @Value("${model.id}") String modelId,
            @Value("${model.local-dir:/tmp/models}") String localBase
    ) {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
        this.mapper   = mapper;
        this.baseUrl   = baseUrl;
        this.modelId   = modelId;
        this.modelDir  = Paths.get(localBase, modelId);
    }

    @PostConstruct
    public void loadModel() throws Exception {
        // 1) fetch manifest
        byte[] bytes = webClient.get()
                .uri("/{id}/manifest.json", modelId)
                .retrieve().bodyToMono(byte[].class).block();
        Manifest manifest = mapper.readValue(bytes, Manifest.class);

        // 2) download tokenizer & shards
        download(manifest.getTokenizerUrl(), "tokenizer.json", null);
        List<Shard> shards = manifest.getShards();
        for (Shard s : shards) {
            download(String.format("%s/%s", baseUrl, s.getFileName()),
                    s.getFileName(),
                    s.getSha256());
        }

        // 3) now modelDir/* holds your assets—pass to your LLM runtime
    }

    private void download(String url, String fileName, String expectedSha) {
        // implement HTTP GET + write to modelDir/fileName + verify SHA if provided
    }
}
