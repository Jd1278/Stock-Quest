import weka.core.*;
import weka.core.converters.ConverterUtils.DataSource;
import weka.classifiers.*;
import java.io.*;

/** Entrena o reutiliza un modelo WEKA y exporta probabilidades sin redondear. */
public class WekaRun {
  public static void main(String[] a) throws Exception {
    Instances train=DataSource.read(a[0]), test=DataSource.read(a[1]);
    train.setClassIndex(train.numAttributes()-1); test.setClassIndex(test.numAttributes()-1);
    if (!train.equalHeaders(test)) throw new IllegalArgumentException(train.equalHeadersMsg(test));
    Classifier model;
    if(a[2].equals("LOAD")) model=(Classifier)SerializationHelper.read(a[3]);
    else {
      model=AbstractClassifier.forName(a[2],Utils.splitOptions(a[3]));
      model.buildClassifier(train);
      SerializationHelper.write(a[4]+".model",model);
      try(PrintWriter out=new PrintWriter(a[4]+".txt")){out.print(model);}
    }
    try(PrintWriter out=new PrintWriter(a[4]+".csv")) {
      out.println("actual,prediccion,probabilidad_si");
      for(Instance row:test){double p=model.classifyInstance(row); double prob=test.classAttribute().isNominal()?model.distributionForInstance(row)[1]:Double.NaN;
        out.println(row.classValue()+","+p+","+prob);}
    }
    System.out.println(a[4]+" filas="+test.numInstances());
  }
}
