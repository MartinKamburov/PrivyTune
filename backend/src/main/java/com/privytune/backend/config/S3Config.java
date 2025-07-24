package com.privytune.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {
    @Value("${aws.accessKeyId}")
    private String awsAccessKeyId;

    @Value("${aws.secretKey}")
    private String awsSecretKey;

    @Value("${aws.region}")
    private String awsRegion;

    @Bean
    public S3Client s3Client(){
        // Create basic credentials and wrap in a static provider
        AwsBasicCredentials creds = AwsBasicCredentials.create(awsAccessKeyId, awsSecretKey);
        StaticCredentialsProvider credsProvider = StaticCredentialsProvider.create(creds);

        return S3Client.builder()
                .credentialsProvider(credsProvider)
                .region(Region.of(awsRegion))
                .build();
    }

}
