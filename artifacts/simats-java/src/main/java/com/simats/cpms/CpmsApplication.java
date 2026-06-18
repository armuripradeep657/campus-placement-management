package com.simats.cpms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CpmsApplication {
    public static void main(String[] args) {
        System.setProperty("server.port", "8090");
        SpringApplication.run(CpmsApplication.class, args);
    }
}
