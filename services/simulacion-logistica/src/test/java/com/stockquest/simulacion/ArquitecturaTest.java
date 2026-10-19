package com.stockquest.simulacion;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArquitecturaTest {
    @Test void nucleoNoDependeDeInfraestructuraNiFrameworks() {
        var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.simulacion");
        noClasses().that().resideInAnyPackage("..domain..","..Application..")
                .should().dependOnClassesThat().resideInAnyPackage("..Infrastructure..","org.springframework..","com.fasterxml..","jakarta..").check(classes);
    }
    @Test void partidasNoUsaAdaptadoresPrivadosDeEscenarios() {
        var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.simulacion");
        noClasses().that().resideInAPackage("..partidas..")
                .should().dependOnClassesThat().resideInAPackage("..escenarios.Infrastructure..").check(classes);
    }
}
