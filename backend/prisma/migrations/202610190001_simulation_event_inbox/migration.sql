-- Consumer-owned deduplication only; simulation source data belongs to Java.
CREATE TABLE "SimulationEventInbox" (
    "eventId" UUID NOT NULL PRIMARY KEY,
    "simulationId" VARCHAR(100) NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SimulationEventInbox_simulationId_key" ON "SimulationEventInbox"("simulationId");
