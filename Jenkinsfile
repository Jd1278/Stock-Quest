// First operational gate: the three Java services. Node/release/deploy remain separate gates.
pipeline {
    agent { label 'stockquest-windows' }
    options {
        disableConcurrentBuilds()
        skipStagesAfterUnstable()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '3', artifactNumToKeepStr: '1'))
    }
    stages {
        stage('Identificar version') {
            steps {
                bat '@git rev-parse HEAD'
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    & java.exe --version
                    if ($LASTEXITCODE -ne 0) { throw 'Java no disponible.' }
                    $free = (Get-PSDrive C).Free / 1GB
                    Write-Host ('Espacio libre C: {0:N2} GB' -f $free)
                    if ($free -lt 1) { throw 'Menos de 1 GB libre: detener antes de compilar.' }
                '''
            }
        }
        stage('Personas - JUnit y PostgreSQL') {
            environment {
                SQ_PEOPLE_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/sq_test_people_ci'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'sq-ci-people-db', usernameVariable: 'SQ_PEOPLE_TEST_DB_USER', passwordVariable: 'SQ_PEOPLE_TEST_DB_PASSWORD')]) {
                    powershell './scripts/ci/test-java.ps1 -Service personas-capacitacion'
                }
            }
            post { always {
                junit testResults: 'services/personas-capacitacion/target/surefire-reports/TEST-*.xml,services/personas-capacitacion/target/failsafe-reports/TEST-*.xml', allowEmptyResults: false, keepProperties: false, skipPublishingChecks: true
            } }
        }
        stage('Aprendizaje - JUnit y PostgreSQL') {
            environment {
                SQ_LEARNING_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/sq_test_learning_ci'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'sq-ci-learning-db', usernameVariable: 'SQ_LEARNING_TEST_DB_USER', passwordVariable: 'SQ_LEARNING_TEST_DB_PASSWORD')]) {
                    powershell './scripts/ci/test-java.ps1 -Service aprendizaje-evaluacion'
                }
            }
            post { always {
                junit testResults: 'services/aprendizaje-evaluacion/target/surefire-reports/TEST-*.xml,services/aprendizaje-evaluacion/target/failsafe-reports/TEST-*.xml', allowEmptyResults: false, keepProperties: false, skipPublishingChecks: true
            } }
        }
        stage('Simulacion - JUnit y PostgreSQL') {
            environment {
                SQ_TEST_JDBC_URL = 'jdbc:postgresql://127.0.0.1:5432/sq_test_simulation_ci'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'sq-ci-simulation-db', usernameVariable: 'SQ_TEST_DB_USER', passwordVariable: 'SQ_TEST_DB_PASSWORD')]) {
                    powershell './scripts/ci/test-java.ps1 -Service simulacion-logistica'
                }
            }
            post { always {
                junit testResults: 'services/simulacion-logistica/target/surefire-reports/TEST-*.xml,services/simulacion-logistica/target/failsafe-reports/TEST-*.xml', allowEmptyResults: false, keepProperties: false, skipPublishingChecks: true
            } }
        }
        stage('Archivar JAR y checksums') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $jars = @(Get-ChildItem -Path 'services/*/target/*-SNAPSHOT.jar')
                    if ($jars.Count -ne 3) { throw 'Se esperaban tres JAR.' }
                    $manifest = [ordered]@{
                        commit = (& git rev-parse HEAD)
                        build = $env:BUILD_NUMBER
                        artifacts = @($jars | ForEach-Object {
                            [ordered]@{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
                        })
                    }
                    $manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 'java-artifacts.json'
                '''
                archiveArtifacts artifacts: 'services/*/target/*-SNAPSHOT.jar,java-artifacts.json', fingerprint: true
            }
        }
    }
}
