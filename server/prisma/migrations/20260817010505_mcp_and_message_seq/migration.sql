-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "seq" INTEGER;

-- Backfill: 按创建顺序（createdAt, id）为已有消息分配序号，保证历史消息顺序稳定
WITH ordered AS (SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn FROM "Message")
UPDATE "Message" m SET "seq" = o.rn FROM ordered o WHERE m.id = o.id;

-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "command" TEXT,
    "args" JSONB,
    "url" TEXT,
    "headers" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpServer_name_key" ON "McpServer"("name");

-- CreateIndex (seq: 使用已回填的最大值初始化序列，避免唯一冲突)
CREATE SEQUENCE "Message_seq_seq";
SELECT setval('"Message_seq_seq"', (SELECT COALESCE(MAX("seq"), 0) FROM "Message"));
ALTER TABLE "Message" ALTER COLUMN "seq" SET DEFAULT nextval('"Message_seq_seq"');
ALTER TABLE "Message" ALTER COLUMN "seq" SET NOT NULL;
CREATE UNIQUE INDEX "Message_seq_key" ON "Message"("seq");
