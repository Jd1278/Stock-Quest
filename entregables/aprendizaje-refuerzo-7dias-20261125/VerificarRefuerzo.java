import java.nio.file.*;
import java.io.*;
import java.util.*;
import weka.core.*;

public class VerificarRefuerzo {
  public static void main(String[] args) throws Exception {
    boolean all=args.length>1 && args[1].equals("todos");
    List<Path> paths;
    try(var stream=Files.walk(Path.of(args[0]))) {
      Path base=Path.of(args[0]);
      paths=stream.filter(p->p.toString().endsWith(".arff"))
        .filter(p->{String rel=base.relativize(p).toString().replace('\\','/');
          return all || (!rel.startsWith("limpios/") && !rel.startsWith("referencia_sin_contaminar/"));}).sorted().toList();
    }
    if(!all && paths.size()!=9)throw new IllegalStateException("Expected nine ARFF files");
    int total=0;
    for(Path path:paths) {
      Instances data;
      try(Reader r=Files.newBufferedReader(path)){data=new Instances(r);}
      if(data.numAttributes()!=15 && !(all && data.numAttributes()==17 && data.attribute(15).name().equals("Outlier")))
        throw new IllegalStateException("Unexpected schema: "+path);
      data.setClassIndex(14);
      boolean unknown=path.getFileName().toString().startsWith("predecir_") || path.getFileName().toString().startsWith("diagnosticar_");
      boolean diagnostic=path.getFileName().toString().startsWith("diagnostico_");
      if(all?data.numClasses()<2 || data.numClasses()>3:data.numClasses()!=(diagnostic?3:2))throw new IllegalStateException("Unexpected class");
      for(Instance row:data)if(row.classIsMissing()!=unknown)throw new IllegalStateException("Unexpected missing class");
      total+=data.numInstances();System.out.println("PASS "+path.getFileName()+" rows="+data.numInstances()+" fields="+data.numAttributes());
    }
    if(!all && total!=404000)throw new IllegalStateException("Unexpected total: "+total);
    System.out.println("PASS files="+paths.size()+" totalInstancesIncludingRepeatedStages="+total);
  }
}
