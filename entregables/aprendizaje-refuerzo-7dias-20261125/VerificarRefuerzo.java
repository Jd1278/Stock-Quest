import java.nio.file.*;
import java.io.*;
import java.util.*;
import weka.core.*;

public class VerificarRefuerzo {
  public static void main(String[] args) throws Exception {
    List<Path> paths;
    try(var stream=Files.walk(Path.of(args[0]))) {
      paths=stream.filter(p->p.toString().endsWith(".arff")).sorted().toList();
    }
    if(paths.size()!=9)throw new IllegalStateException("Expected nine ARFF files");
    int total=0;
    for(Path path:paths) {
      Instances data;
      try(Reader r=Files.newBufferedReader(path)){data=new Instances(r);}
      if(data.numAttributes()!=15)throw new IllegalStateException("Expected 15 attributes");
      data.setClassIndex(14);
      boolean unknown=path.getFileName().toString().startsWith("predecir_");
      boolean diagnostic=path.getFileName().toString().startsWith("diagnostico_");
      if(data.numClasses()!=(diagnostic?3:2))throw new IllegalStateException("Unexpected class");
      for(Instance row:data)if(row.classIsMissing()!=unknown)throw new IllegalStateException("Unexpected missing class");
      total+=data.numInstances();System.out.println("PASS "+path.getFileName()+" rows="+data.numInstances()+" fields=15");
    }
    if(total!=404000)throw new IllegalStateException("Unexpected total: "+total);
    System.out.println("PASS nine ARFF files; 404000 instances including repeated partitions");
  }
}
