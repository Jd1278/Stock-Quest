package com.stockquest.personas.Infrastructure;

import com.stockquest.personas.Application.UnidadDeTrabajo;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.function.Supplier;

public final class UnidadDeTrabajoJdbc implements UnidadDeTrabajo {
    private final TransactionTemplate template;
    public UnidadDeTrabajoJdbc(PlatformTransactionManager manager) { template = new TransactionTemplate(manager); }
    @Override public <T> T ejecutar(Supplier<T> trabajo) { return template.execute(status -> trabajo.get()); }
}
