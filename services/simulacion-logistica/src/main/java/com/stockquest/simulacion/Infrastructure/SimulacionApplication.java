package com.stockquest.simulacion.Infrastructure;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.stockquest.simulacion")
@EnableScheduling
public class SimulacionApplication {
    public static void main(String[] args) { SpringApplication.run(SimulacionApplication.class, args); }
}
