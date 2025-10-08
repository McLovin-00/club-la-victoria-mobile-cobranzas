-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped', 'retrying');

-- CreateTable
CREATE TABLE "conversation_analysis" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "analysis_flow_id" VARCHAR(255) NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "request_sent_at" TIMESTAMPTZ(6),
    "response_received_at" TIMESTAMPTZ(6),
    "sentiment" VARCHAR(50),
    "intent" VARCHAR(100),
    "confidence" DECIMAL(3,2),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analysis_response" JSONB,
    "analysis_text" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_analysis_conversation_id_key" ON "conversation_analysis"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_conversation_analysis_conversation" ON "conversation_analysis"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_conversation_analysis_status" ON "conversation_analysis"("status");

-- CreateIndex
CREATE INDEX "idx_conversation_analysis_sentiment" ON "conversation_analysis"("sentiment");

-- CreateIndex
CREATE INDEX "idx_conversation_analysis_intent" ON "conversation_analysis"("intent");

-- CreateIndex
CREATE INDEX "idx_conversation_analysis_created" ON "conversation_analysis"("created_at");

-- AddForeignKey
ALTER TABLE "conversation_analysis" ADD CONSTRAINT "conversation_analysis_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "imported_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
