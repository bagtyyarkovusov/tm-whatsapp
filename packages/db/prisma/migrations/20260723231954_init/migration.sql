-- CreateEnum
CREATE TYPE "DeviceState" AS ENUM ('PROVISIONAL', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuthSessionKind" AS ENUM ('PROVISIONAL', 'NORMAL');

-- CreateEnum
CREATE TYPE "CiphertextMessageType" AS ENUM ('PREKEY_SIGNAL', 'SIGNAL', 'SENDER_KEY');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "state" "DeviceState" NOT NULL DEFAULT 'PROVISIONAL',
    "platform" TEXT NOT NULL,
    "installation_id_hash" TEXT NOT NULL,
    "identity_key_public" BYTEA,
    "label" TEXT,
    "provisional_expires_at" TIMESTAMP(3),
    "activation_payload_hash" TEXT,
    "activated_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "terminal_reason" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "account_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "kind" "AuthSessionKind" NOT NULL,
    "family_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "reuse_detected_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prekey_bundles" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "signed_prekey" BYTEA NOT NULL,
    "signed_prekey_id" INTEGER NOT NULL,
    "signed_prekey_sig" BYTEA NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prekey_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_prekeys" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "key_id" INTEGER NOT NULL,
    "public_key" BYTEA NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_prekeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciphertext_messages" (
    "id" TEXT NOT NULL,
    "client_message_id" TEXT NOT NULL,
    "sender_device_id" TEXT NOT NULL,
    "recipient_device_id" TEXT NOT NULL,
    "type" "CiphertextMessageType" NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ciphertext_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_phone_number_key" ON "accounts"("phone_number");

-- CreateIndex
CREATE INDEX "devices_account_installation_idx" ON "devices"("account_id", "installation_id_hash");

-- CreateIndex
CREATE INDEX "devices_account_state_idx" ON "devices"("account_id", "state");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_created_idx" ON "otp_challenges"("phone_number", "created_at");

-- CreateIndex
CREATE INDEX "auth_sessions_family_idx" ON "auth_sessions"("family_id");

-- CreateIndex
CREATE INDEX "auth_sessions_device_kind_idx" ON "auth_sessions"("device_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "prekey_bundles_device_signed_prekey_key" ON "prekey_bundles"("device_id", "signed_prekey_id");

-- CreateIndex
CREATE INDEX "one_time_prekeys_device_consumed_idx" ON "one_time_prekeys"("device_id", "consumed_at");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_prekeys_device_key_key" ON "one_time_prekeys"("device_id", "key_id");

-- CreateIndex
CREATE INDEX "ciphertext_messages_recipient_queue_idx" ON "ciphertext_messages"("recipient_device_id", "delivered_at", "created_at");

-- CreateIndex
CREATE INDEX "ciphertext_messages_expiry_idx" ON "ciphertext_messages"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "ciphertext_messages_sender_client_msg_key" ON "ciphertext_messages"("sender_device_id", "client_message_id");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prekey_bundles" ADD CONSTRAINT "prekey_bundles_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_prekeys" ADD CONSTRAINT "one_time_prekeys_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciphertext_messages" ADD CONSTRAINT "ciphertext_messages_sender_device_id_fkey" FOREIGN KEY ("sender_device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciphertext_messages" ADD CONSTRAINT "ciphertext_messages_recipient_device_id_fkey" FOREIGN KEY ("recipient_device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
