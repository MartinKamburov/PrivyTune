package com.privytune.backend.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class Manifest {
    @JsonProperty("model_id")
    private String modelId;

    @JsonProperty("tokenizer_url")
    private String tokenizerUrl;

    @JsonProperty("shards")
    private List<Shard> shards;


}
