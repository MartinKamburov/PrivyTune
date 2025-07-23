package com.privytune.backend.models;
//This is the Shard structure within our Manifest.json file

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class Shard {
    @JsonProperty("file_name")
    private String fileName;

    @JsonProperty("sha256")
    private String sha256;

}
