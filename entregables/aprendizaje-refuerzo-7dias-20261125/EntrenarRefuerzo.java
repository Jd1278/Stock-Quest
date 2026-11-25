import java.io.*;
import java.nio.file.*;
import java.util.*;
import weka.core.*;
import weka.filters.unsupervised.attribute.Remove;
import weka.classifiers.meta.FilteredClassifier;
import weka.classifiers.trees.J48;

/** WEKA real: fit only training; export held-out scores before threshold selection. */
public class EntrenarRefuerzo {
  static Instances load(Path p) throws Exception {
    try (Reader r=Files.newBufferedReader(p)) {
      Instances x=new Instances(r); x.setClassIndex(x.numAttributes()-1);
      if(x.numAttributes()!=15 || !x.classAttribute().isNominal() || x.numClasses()!=2)
        throw new IllegalStateException("Unexpected schema: "+p);
      return x;
    }
  }
  static void predict(FilteredClassifier model, Instances data, Path out) throws Exception {
    try (PrintWriter w=new PrintWriter(Files.newBufferedWriter(out))) {
      w.println("id_aprendiz_sintetico,fecha_corte,modulo,probabilidad_refuerzo,clase_referencia");
      for (Instance row:data) {
        Instance blind=(Instance)row.copy(); blind.setDataset(data); blind.setClassMissing();
        double probability=model.distributionForInstance(blind)[1];
        w.printf(Locale.ROOT,"%s,%s,%s,%.12f,%s%n",row.stringValue(0),row.stringValue(1),row.stringValue(2),
          probability,row.classIsMissing()?"?":row.stringValue(data.classIndex()));
      }
    }
  }
  public static void main(String[] args) throws Exception {
    if(args.length==4 && args[0].equals("predict")) {
      Object[] saved=SerializationHelper.readAll(args[1]);
      FilteredClassifier model=(FilteredClassifier)saved[0];Instances header=(Instances)saved[1];
      Instances data=load(Path.of(args[2]));
      if(!header.equalHeaders(data))throw new IllegalStateException(header.equalHeadersMsg(data));
      predict(model,data,Path.of(args[3]));
      System.out.println("RELOADED saved model and predicted "+data.numInstances()+" rows");return;
    }
    Path root=Path.of(args[0]);Files.createDirectories(root.resolve("resultados"));
    Instances train=load(root.resolve("weka/entrenamiento.arff"));
    if(train.numInstances()!=64000)throw new IllegalStateException("Expected 64000 training rows");
    for(int min:new int[]{20,100}) {
      Remove remove=new Remove();remove.setAttributeIndices("1-2");
      J48 tree=new J48();tree.setMinNumObj(min);tree.setConfidenceFactor(.25f);tree.setUseLaplace(true);
      FilteredClassifier model=new FilteredClassifier();model.setFilter(remove);model.setClassifier(tree);
      long start=System.currentTimeMillis();model.buildClassifier(train);
      Path dir=root.resolve("resultados/M"+min);Files.createDirectories(dir);
      SerializationHelper.writeAll(dir.resolve("refuerzo.model").toString(),new Object[]{model,new Instances(train,0)});
      Files.writeString(dir.resolve("arbol.txt"),model.toString());
      for(String split:new String[]{"validacion","prueba","predecir_ultimo_corte_4000"}) {
        Instances x=load(root.resolve("weka/"+split+".arff"));
        if(!train.equalHeaders(x))throw new IllegalStateException(train.equalHeadersMsg(x));
        predict(model,x,dir.resolve(split+"_probabilidades.csv"));
        System.out.println("PASS M="+min+" "+split+" rows="+x.numInstances());
      }
      System.out.println("TRAINED M="+min+" leaves="+tree.measureNumLeaves()+" seconds="+(System.currentTimeMillis()-start)/1000.0);
    }
  }
}
