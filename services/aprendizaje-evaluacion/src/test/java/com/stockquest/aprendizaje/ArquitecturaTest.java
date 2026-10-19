package com.stockquest.aprendizaje;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArquitecturaTest {
    @Test void negocioNoDependeDeFrameworksNiAdaptadores() {
        var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.aprendizaje");
        noClasses().that().resideInAnyPackage("..domain..","..Application..")
                .should().dependOnClassesThat().resideInAnyPackage("org.springframework..","jakarta..","com.fasterxml..","..Infrastructure..").check(classes);
    }
    @Test void servicioNoImportaImplementacionesDeOtrosServicios() {
        var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.aprendizaje");
        noClasses().should().dependOnClassesThat().resideInAnyPackage("com.stockquest.simulacion..","com.stockquest.personas..").check(classes);
    }
}
