-- CreateMigration: Add media_handling_config field to chat_processor_instances table
-- This field will store configuration for multimedia file handling (images, documents, etc.)

ALTER TABLE "chat_processor_instances" ADD COLUMN "media_handling_config" JSONB;
 
-- Add comment for documentation
COMMENT ON COLUMN "chat_processor_instances"."media_handling_config" IS 'Configuration for handling multimedia files from conversations (enabled, maxFileSize, allowedMimeTypes, etc.)'; 