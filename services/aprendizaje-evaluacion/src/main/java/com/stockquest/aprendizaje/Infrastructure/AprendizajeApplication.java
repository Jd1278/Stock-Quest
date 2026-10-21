package com.stockquest.aprendizaje.Infrastructure;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages="com.stockquest.aprendizaje")
@org.springframework.scheduling.annotation.EnableScheduling
public class AprendizajeApplication {
    public static void main(String[] args) { SpringApplication.run(AprendizajeApplication.class,args); }
}
