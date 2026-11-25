import java.io.*;
import java.nio.file.*;
import java.util.*;
import weka.core.*;
import weka.core.converters.ArffSaver;
import weka.core.converters.CSVSaver;
import weka.filters.*;
import weka.filters.unsupervised.attribute.*;

/** Limpieza real WEKA; no lee auditorias, referencias ni etiquetas para imputar. */
public class LimpiezaRefuerzo {
  static Instances load(Path p) throws Exception {
    try(Reader r=Files.newBufferedReader(p)){Instances x=new Instances(r);x.setClassIndex(14);return x;}
  }
  static RenameNominalValues aliases() throws Exception {
    RenameNominalValues f=new RenameNominalValues();f.setSelectedAttributes("3");
    List<String> replacements=new ArrayList<>();
    for(int i=1;i<=9;i++)replacements.add(String.format("m%02d:M%02d",i,i));
    f.setValueReplacements(String.join(",",replacements));return f;
  }
  static NumericCleaner bounds(String indices,double min,double max) throws Exception {
    NumericCleaner f=new NumericCleaner();f.setOptions(new String[]{"-R",indices,"-min",Double.toString(min),
      "-max",Double.toString(max),"-min-default","NaN","-max-default","NaN","-closeto-tolerance","0"});return f;
  }
  static InterquartileRange iqr() {
    InterquartileRange f=new InterquartileRange();f.setAttributeIndices("7");
    f.setExtremeValuesFactor(12);f.setOutlierFactor(6);f.setExtremeValuesAsOutliers(true);return f;
  }
  static Filter[] filters(double upper) throws Exception {
    Remove flags=new Remove();flags.setAttributeIndices("16-17");
    return new Filter[]{aliases(),bounds("9,12",0,100),bounds("10",0,1),new ReplaceMissingValues(),
      iqr(),bounds("7",0,upper),flags,new ReplaceMissingValues()};
  }
  static MultiFilter fresh(double upper) throws Exception {
    MultiFilter f=new MultiFilter();f.setFilters(filters(upper));return f;
  }
  static Instances fit(Filter f,Instances x) throws Exception {f.setInputFormat(x);return Filter.useFilter(x,f);}
  static void save(Instances x,Path stem) throws Exception {
    Files.createDirectories(stem.getParent());
    ArffSaver arff=new ArffSaver();arff.setInstances(x);arff.setFile(Path.of(stem+".arff").toFile());arff.writeBatch();
    CSVSaver csv=new CSVSaver();csv.setInstances(x);csv.setFile(Path.of(stem+".csv").toFile());csv.writeBatch();
  }
  static Instances adaptClass(Instances original,Instances header) {
    ArrayList<Attribute> atts=new ArrayList<>();
    for(int i=0;i<14;i++)atts.add((Attribute)original.attribute(i).copy());
    atts.add((Attribute)header.classAttribute().copy());
    Instances x=new Instances("adapted_for_cleaning",atts,original.numInstances());x.setClassIndex(14);
    for(Instance row:original){double[] a=row.toDoubleArray();a[14]=Utils.missingValue();x.add(new DenseInstance(1,a));}
    return x;
  }
  static Instances restoreClass(Instances clean,Instances original) {
    ArrayList<Attribute> atts=new ArrayList<>();
    for(int i=0;i<14;i++)atts.add((Attribute)clean.attribute(i).copy());
    atts.add((Attribute)original.classAttribute().copy());
    Instances x=new Instances("diagnostico_limpio_weka_v2",atts,clean.numInstances());x.setClassIndex(14);
    for(int i=0;i<clean.numInstances();i++){double[] a=clean.instance(i).toDoubleArray();a[14]=original.instance(i).classValue();x.add(new DenseInstance(1,a));}
    return x;
  }
  static int missing(Instances x) {int n=0;for(Instance r:x)for(int i=0;i<14;i++)if(r.isMissing(i))n++;return n;}
  static int flagged(Instances x) {int n=0;for(Instance r:x)if(r.value(15)==1)n++;return n;}
  static double parameter(String text,String key) {
    var m=java.util.regex.Pattern.compile(java.util.regex.Pattern.quote("\""+key+"\"")+"\\s*:\\s*([-+0-9.eE]+)").matcher(text);
    if(!m.find())throw new IllegalArgumentException(key);return Double.parseDouble(m.group(1));
  }
  static ReplaceMissingWithUserConstant constant(int attribute,double value) {
    ReplaceMissingWithUserConstant f=new ReplaceMissingWithUserConstant();f.setAttributes(Integer.toString(attribute));
    f.setNumericReplacementValue(Double.toString(value));return f;
  }
  static void verifyManual(Path root) throws Exception {
    String params=Files.readString(root.resolve("limpios/parametros_limpieza.json"));
    for(String name:new String[]{"diagnostico_actual_100000_15","diagnostico_7dias_despues_100000_15"}) {
      Instances x=load(root.resolve(name+".arff"));
      StringToNominal idNominal=new StringToNominal();idNominal.setAttributeRange("1");x=fit(idNominal,x);
      x=fit(aliases(),x);x=fit(bounds("9,12",0,100),x);x=fit(bounds("10",0,1),x);
      for(int a:new int[]{9,10,12,13,14})x=fit(constant(a,parameter(params,Integer.toString(a))),x);
      x=fit(iqr(),x);if(flagged(x)!=10000)throw new IllegalStateException("Unexpected manual IQR count");
      x=fit(bounds("7",0,parameter(params,"upperFence")),x);
      Remove f=new Remove();f.setAttributeIndices("16-17");x=fit(f,x);
      x=fit(constant(7,parameter(params,"imputedMinutesMean")),x);
      NominalToString idString=new NominalToString();idString.setAttributeIndexes("1");x=fit(idString,x);
      Instances expected=load(root.resolve("limpios/"+name+"_limpio.arff"));
      if(x.numInstances()!=100000 || x.numAttributes()!=15)throw new IllegalStateException("Manual dimensions");
      for(int r=0;r<x.numInstances();r++)for(int c=0;c<15;c++) {
        if(x.attribute(c).isNumeric() || x.attribute(c).isDate()) {
          if(Math.abs(x.instance(r).value(c)-expected.instance(r).value(c))>1.1e-6)throw new IllegalStateException("Manual numeric mismatch");
        } else if(!x.instance(r).stringValue(c).equals(expected.instance(r).stringValue(c)))throw new IllegalStateException("Manual label mismatch");
      }
      System.out.println("MANUAL GUIDE VERIFIED "+name+" rows=100000 fields=15 outliers=10000");
    }
    Files.writeString(root.resolve("limpios/validacion_guia_manual.json"),"{\"status\":\"PASS\",\"datasets\":2,\"rowsCompared\":200000,\"numericTolerance\":0.0000011,\"usesOnlyTrainingConstantsForRepairs\":true}\n");
  }
  public static void main(String[] args) throws Exception {
    Path root=Path.of(args[0]);Path out=root.resolve("limpios");Files.createDirectories(out);
    if(args.length>1 && args[1].equals("verificar-guia")){verifyManual(root);return;}
    Instances train=load(root.resolve("weka/entrenamiento.arff"));
    if(train.numInstances()!=64000)throw new IllegalStateException("Expected 64000 training rows");
    List<String> trace=new ArrayList<>();trace.add("etapa,filas,atributos,faltantes_predictores,atipicos_detectados");
    Instances x=train;trace.add("00_crudo,64000,15,"+missing(x)+",0");
    x=fit(aliases(),x);save(x,out.resolve("etapas_entrenamiento/01_categorias"));
    x=fit(bounds("9,12",0,100),x);save(x,out.resolve("etapas_entrenamiento/02_rangos_0_100"));
    x=fit(bounds("10",0,1),x);save(x,out.resolve("etapas_entrenamiento/03_rangos_0_1"));
    double[] firstMeans=new double[14];for(int i=3;i<14;i++)firstMeans[i]=x.meanOrMode(i);
    x=fit(new ReplaceMissingValues(),x);save(x,out.resolve("etapas_entrenamiento/04_imputacion_pre_iqr"));
    InterquartileRange detector=iqr();x=fit(detector,x);
    double upper=detector.getValues(InterquartileRange.ValueType.UPPER_OUTLIER_VALUES)[0];
    double lower=detector.getValues(InterquartileRange.ValueType.LOWER_OUTLIER_VALUES)[0];
    double range=detector.getValues(InterquartileRange.ValueType.IQR)[0];
    double median=detector.getValues(InterquartileRange.ValueType.MEDIAN)[0];
    save(x,out.resolve("etapas_entrenamiento/05_iqr_17campos"));
    int trainingFlags=flagged(x);trace.add("05_iqr,64000,17,"+missing(x)+","+trainingFlags);
    x=fit(bounds("7",0,upper),x);double minuteMean=x.meanOrMode(6);
    save(x,out.resolve("etapas_entrenamiento/06_atipicos_a_faltantes"));
    Remove remove=new Remove();remove.setAttributeIndices("16-17");x=fit(remove,x);
    x=fit(new ReplaceMissingValues(),x);save(x,out.resolve("etapas_entrenamiento/08_limpio"));
    trace.add("08_limpio,64000,15,"+missing(x)+",0");
    MultiFilter pipeline=fresh(upper);Instances cleanTrain=fit(pipeline,train);
    if(missing(cleanTrain)!=0 || cleanTrain.numAttributes()!=15)throw new IllegalStateException("Cleaning failed");
    SerializationHelper.writeAll(out.resolve("preprocesador.filter").toString(),new Object[]{pipeline,new Instances(train,0)});
    Filter[] actualFilters=pipeline.getFilters();
    Map<String,Integer> counts=new LinkedHashMap<>();
    for(String name:new String[]{"diagnostico_actual_100000_15","diagnostico_7dias_despues_100000_15"}) {
      Instances original=load(root.resolve(name+".arff"));Instances adapted=adaptClass(original,train);
      System.out.println("INPUT original="+original.numInstances()+" adapted="+adapted.numInstances());
      // Emitir etapas con los filtros YA ajustados, sin volver a llamar setInputFormat.
      Instances stage=adapted;
      for(int i=0;i<actualFilters.length;i++) {
        stage=Filter.useFilter(stage,actualFilters[i]);
        System.out.println("STAGE "+name+" "+i+" rows="+stage.numInstances()+" fields="+stage.numAttributes());
        if(i==3)save(restoreClass(stage,original),out.resolve("etapas_"+name+"/04_imputado"));
        if(i==4) {
          counts.put(name,flagged(stage));
          // Conservar las dos banderas y restaurar la clase diagnostica en posicion 15.
          Instances flags=new Instances(stage);Attribute cls=(Attribute)original.classAttribute().copy();
          flags.setClassIndex(-1);flags.deleteAttributeAt(14);flags.insertAttributeAt(cls,14);flags.setClassIndex(14);
          for(int k=0;k<flags.numInstances();k++)flags.instance(k).setClassValue(original.instance(k).classValue());
          save(flags,out.resolve("etapas_"+name+"/05_iqr_17campos"));
        }
      }
      Instances restored=restoreClass(stage,original);
      if(restored.numInstances()!=100000 || restored.numAttributes()!=15 || missing(restored)!=0)
        throw new IllegalStateException("Invalid clean diagnostic rows="+restored.numInstances()+" fields="+restored.numAttributes()+" missing="+missing(restored));
      save(restored,out.resolve(name+"_limpio"));
      System.out.println("CLEANED "+name+" rows=100000 fields=15 outliers="+counts.get(name));
      if(name.equals("diagnostico_actual_100000_15")) {
        Path diag=root.resolveSibling("aprendizaje-diagnostico-20261125").resolve("limpios");Files.createDirectories(diag);
        for(String ext:new String[]{"csv","arff"})Files.copy(out.resolve(name+"_limpio."+ext),diag.resolve(name+"_limpio."+ext),StandardCopyOption.REPLACE_EXISTING);
      }
    }
    for(String split:new String[]{"entrenamiento","validacion","prueba","separacion_1","separacion_2","predecir_ultimo_corte_4000"}) {
      Instances raw=load(root.resolve("weka/"+split+".arff"));Instances clean=Filter.useFilter(raw,pipeline);
      save(clean,out.resolve("weka/"+split));
    }
    // Estadisticas reproducibles y limites aprendidos exclusivamente del entrenamiento.
    StringBuilder json=new StringBuilder("{\n  \"engine\":\"WEKA 3.8.6\",\n  \"trainingRows\":64000,\n  \"usesAuditOrGoldenReference\":false,\n  \"retainsRows\":true,\n  \"outlierAttribute\":7,\n  \"outlierFactor\":6,\n  \"extremeFactor\":12,\n");
    json.append("  \"lowerFence\":").append(lower).append(",\n  \"upperFence\":").append(upper)
      .append(",\n  \"IQR\":").append(range).append(",\n  \"medianMinutes\":").append(median)
      .append(",\n  \"imputedMinutesMean\":").append(minuteMean)
      .append(",\n  \"trainingOutliers\":").append(trainingFlags).append(",\n  \"diagnosticOutliers\":{");
    int j=0;for(var entry:counts.entrySet()){if(j++>0)json.append(',');json.append('\"').append(entry.getKey()).append("\":").append(entry.getValue());}
    json.append("},\n  \"firstImputationMeansByOneBasedAttribute\":{");
    for(int i=3;i<14;i++){if(i>3)json.append(',');json.append('\"').append(i+1).append("\":").append(firstMeans[i]);}
    json.append("}\n}\n");Files.writeString(out.resolve("parametros_limpieza.json"),json.toString());
    Files.write(out.resolve("traza_limpieza.csv"),trace);
    System.out.println("TRAIN-ONLY fence="+upper+" IQR="+range+" replacementMean="+minuteMean+" trainingOutliers="+trainingFlags);
  }
}
