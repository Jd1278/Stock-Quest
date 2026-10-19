package com.stockquest.personas;

import com.tngtech.archunit.core.importer.*;
import org.junit.jupiter.api.Test;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArquitecturaTest {
 @Test void negocioNoDependeDeFrameworksNiAdaptadores() {
  var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.personas");
  noClasses().that().resideInAnyPackage("..domain..","..Application..").should().dependOnClassesThat().resideInAnyPackage("org.springframework..","jakarta..","com.fasterxml..","..Infrastructure..").check(classes);
 }
 @Test void noImportaImplementacionesDeOtrosServicios() {
  var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.personas");
  noClasses().should().dependOnClassesThat().resideInAnyPackage("com.stockquest.simulacion..","com.stockquest.aprendizaje..").check(classes);
 }
 @Test void capacidadesNoImportanAdaptadoresDeOtraCapacidad() {
  var classes=new ClassFileImporter().withImportOption(new ImportOption.DoNotIncludeTests()).importPackages("com.stockquest.personas");
  noClasses().that().resideInAPackage("..usuarios..").should().dependOnClassesThat().resideInAnyPackage("..identidad.Infrastructure..","..capacitacion.Infrastructure..").check(classes);
  noClasses().that().resideInAPackage("..identidad..").should().dependOnClassesThat().resideInAnyPackage("..usuarios.Infrastructure..","..capacitacion.Infrastructure..").check(classes);
  noClasses().that().resideInAPackage("..capacitacion..").should().dependOnClassesThat().resideInAnyPackage("..usuarios.Infrastructure..","..identidad.Infrastructure..").check(classes);
 }
}
