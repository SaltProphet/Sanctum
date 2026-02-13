import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

export type VaultRole = 'creator' | 'admin' | 'compliance' | 'system';

export interface VaultActor {
  id: string;
  role: VaultRole;
}

export interface VerificationMetadata {
  captureTimestamp: string;
  documentCountry: string;
  documentType: string;
  verificationDecision: string;
  providerReferenceIds: string[];
}

export interface SensitiveVerificationFields {
  piiPointer?: string;
  legalName?: string;
  dobFragment?: string;
}

export interface VaultWriteInput {
  creatorId: string;
  verificationSessionId: string;
  artifact: Uint8Array;
  metadata: VerificationMetadata;
  sensitive?: SensitiveVerificationFields;
}

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface VaultRecord {
  creatorId: string;
  verificationSessionId: string;
  objectKey: string;
  integritySha256: string;
  metadata: VerificationMetadata;
  encryptedSensitive?: EncryptedPayload;
  createdAt: string;
}

export interface VaultAuditEntry {
  actorId: string;
  actorRole: VaultRole;
  action: 'write' | 'read' | 'delete';
  creatorId: string;
  verificationSessionId: string;
  objectKey?: string;
  success: boolean;
  reason?: string;
  timestamp: string;
}

export interface VaultAuditLogger {
  log(entry: VaultAuditEntry): Promise<void>;
}

export interface VerificationVaultRepository {
  save(record: VaultRecord): Promise<void>;
  get(creatorId: string, verificationSessionId: string): Promise<VaultRecord | undefined>;
  delete(creatorId: string, verificationSessionId: string): Promise<void>;
}

export interface VaultStorageClient {
  putObject(
    key: string,
    payload: Uint8Array,
    metadata: Record<string, string>,
  ): Promise<void>;
  getObject(key: string): Promise<Uint8Array>;
  deleteObject(key: string): Promise<void>;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const isReadAllowed = (role: VaultRole) => role === 'admin' || role === 'compliance' || role === 'system';
const isDeleteAllowed = (role: VaultRole) => role === 'admin' || role === 'compliance' || role === 'system';
const isWriteAllowed = (role: VaultRole) => Boolean(role);

const toMetadataHeaders = (metadata: VerificationMetadata): Record<string, string> => ({
  'capture-timestamp': metadata.captureTimestamp,
  'document-country': metadata.documentCountry,
  'document-type': metadata.documentType,
  'verification-decision': metadata.verificationDecision,
  'provider-reference-ids': metadata.providerReferenceIds.join(','),
});

const buildObjectKey = (creatorId: string, verificationSessionId: string) =>
  `verification-artifacts/${creatorId}/${verificationSessionId}`;

const hashArtifact = (artifact: Uint8Array) =>
  createHash('sha256').update(Buffer.from(artifact)).digest('hex');

const hasSensitiveFields = (input?: SensitiveVerificationFields) =>
  Boolean(input && (input.piiPointer || input.legalName || input.dobFragment));

class SensitiveFieldEncryptor {
  private readonly encryptionKeyBuffer: Buffer;

  constructor(keyMaterial: string) {
    const decodedKey = Buffer.from(keyMaterial, 'base64');
    if (decodedKey.byteLength !== 32) {
      throw new Error('Vault encryption key must be 32 bytes (base64 encoded).');
    }
    this.encryptionKeyBuffer = decodedKey;
  }

  encrypt(input: SensitiveVerificationFields): EncryptedPayload {
    const initializationVector = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKeyBuffer, initializationVector);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(input), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      iv: initializationVector.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  decrypt(input: EncryptedPayload): SensitiveVerificationFields {
    const decipher = createDecipheriv(
      ALGORITHM,
      this.encryptionKeyBuffer,
      Buffer.from(input.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(input.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return JSON.parse(plaintext.toString('utf8')) as SensitiveVerificationFields;
  }
}

export interface VerificationVaultServiceDeps {
  storage: VaultStorageClient;
  repository: VerificationVaultRepository;
  auditLogger: VaultAuditLogger;
  encryptionKey: string;
}

export interface VaultReadResult {
  record: VaultRecord;
  artifact: Uint8Array;
  sensitive?: SensitiveVerificationFields;
}

export class VerificationVaultService {
  private readonly encryptor: SensitiveFieldEncryptor;
  private readonly deps: VerificationVaultServiceDeps;

  constructor(deps: VerificationVaultServiceDeps) {
    this.deps = deps;
    this.encryptor = new SensitiveFieldEncryptor(deps.encryptionKey);
  }

  async writeArtifact(actor: VaultActor, input: VaultWriteInput): Promise<VaultRecord> {
    const objectKey = buildObjectKey(input.creatorId, input.verificationSessionId);

    if (!isWriteAllowed(actor.role)) {
      await this.logAudit(actor, 'write', input.creatorId, input.verificationSessionId, false, objectKey, 'forbidden');
      throw new Error('Actor is not allowed to write vault artifacts.');
    }

    const integritySha256 = hashArtifact(input.artifact);

    const record: VaultRecord = {
      creatorId: input.creatorId,
      verificationSessionId: input.verificationSessionId,
      objectKey,
      integritySha256,
      metadata: input.metadata,
      encryptedSensitive: hasSensitiveFields(input.sensitive)
        ? this.encryptor.encrypt(input.sensitive as SensitiveVerificationFields)
        : undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.deps.storage.putObject(objectKey, input.artifact, toMetadataHeaders(input.metadata));
      await this.deps.repository.save(record);
      await this.logAudit(actor, 'write', input.creatorId, input.verificationSessionId, true, objectKey);
      return record;
    } catch (error) {
      await this.logAudit(
        actor,
        'write',
        input.creatorId,
        input.verificationSessionId,
        false,
        objectKey,
        error instanceof Error ? error.message : 'unknown-error',
      );
      throw error;
    }
  }

  async readArtifact(actor: VaultActor, creatorId: string, verificationSessionId: string): Promise<VaultReadResult> {
    if (!isReadAllowed(actor.role)) {
      await this.logAudit(actor, 'read', creatorId, verificationSessionId, false, undefined, 'forbidden');
      throw new Error('Actor is not allowed to read vault artifacts.');
    }

    const record = await this.deps.repository.get(creatorId, verificationSessionId);
    if (!record) {
      await this.logAudit(actor, 'read', creatorId, verificationSessionId, false, undefined, 'not-found');
      throw new Error('Vault artifact not found.');
    }

    try {
      const artifact = await this.deps.storage.getObject(record.objectKey);
      const sensitive = record.encryptedSensitive
        ? this.encryptor.decrypt(record.encryptedSensitive)
        : undefined;

      await this.logAudit(actor, 'read', creatorId, verificationSessionId, true, record.objectKey);
      return { record, artifact, sensitive };
    } catch (error) {
      await this.logAudit(
        actor,
        'read',
        creatorId,
        verificationSessionId,
        false,
        record.objectKey,
        error instanceof Error ? error.message : 'unknown-error',
      );
      throw error;
    }
  }

  async deleteArtifact(actor: VaultActor, creatorId: string, verificationSessionId: string): Promise<void> {
    if (!isDeleteAllowed(actor.role)) {
      await this.logAudit(actor, 'delete', creatorId, verificationSessionId, false, undefined, 'forbidden');
      throw new Error('Actor is not allowed to delete vault artifacts.');
    }

    const record = await this.deps.repository.get(creatorId, verificationSessionId);
    if (!record) {
      await this.logAudit(actor, 'delete', creatorId, verificationSessionId, false, undefined, 'not-found');
      throw new Error('Vault artifact not found.');
    }

    try {
      await this.deps.storage.deleteObject(record.objectKey);
      await this.deps.repository.delete(creatorId, verificationSessionId);
      await this.logAudit(actor, 'delete', creatorId, verificationSessionId, true, record.objectKey);
    } catch (error) {
      await this.logAudit(
        actor,
        'delete',
        creatorId,
        verificationSessionId,
        false,
        record.objectKey,
        error instanceof Error ? error.message : 'unknown-error',
      );
      throw error;
    }
  }

  private async logAudit(
    actor: VaultActor,
    action: VaultAuditEntry['action'],
    creatorId: string,
    verificationSessionId: string,
    success: boolean,
    objectKey?: string,
    reason?: string,
  ): Promise<void> {
    await this.deps.auditLogger.log({
      actorId: actor.id,
      actorRole: actor.role,
      action,
      creatorId,
      verificationSessionId,
      objectKey,
      success,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}


interface R2ClientConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}

export class CloudflareR2VaultStorageClient implements VaultStorageClient {
  private readonly endpoint: string;
  private readonly config: R2ClientConfig;

  constructor(config: R2ClientConfig) {
    this.config = config;
    this.endpoint =
      config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`;
  }

  async putObject(key: string, payload: Uint8Array, metadata: Record<string, string>): Promise<void> {
    await this.signedRequest('PUT', key, payload, metadata);
  }

  async getObject(key: string): Promise<Uint8Array> {
    const response = await this.signedRequest('GET', key);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async deleteObject(key: string): Promise<void> {
    await this.signedRequest('DELETE', key);
  }

  private async signedRequest(
    method: 'PUT' | 'GET' | 'DELETE',
    key: string,
    payload?: Uint8Array,
    metadata?: Record<string, string>,
  ): Promise<Response> {
    const host = new URL(this.endpoint).host;
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const canonicalUri = `/${this.config.bucket}/${encodedKey}`;
    const url = `${this.endpoint}${canonicalUri}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = createHash('sha256')
      .update(Buffer.from(payload ?? []))
      .digest('hex');

    const headers = new Headers();
    headers.set('host', host);
    headers.set('x-amz-content-sha256', payloadHash);
    headers.set('x-amz-date', amzDate);

    if (metadata) {
      for (const [name, value] of Object.entries(metadata)) {
        headers.set(`x-amz-meta-${name.toLowerCase()}`, value);
      }
    }

    const { authorization } = this.signHeaders(
      method,
      canonicalUri,
      dateStamp,
      amzDate,
      payloadHash,
      headers,
    );

    headers.set('Authorization', authorization);

    const response = await fetch(url, {
      method,
      headers,
      body: payload ? Buffer.from(payload) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`R2 ${method} failed (${response.status}): ${errorText}`);
    }

    return response;
  }

  private signHeaders(
    method: string,
    canonicalUri: string,
    dateStamp: string,
    amzDate: string,
    payloadHash: string,
    headers: Headers,
  ): { authorization: string } {
    const canonicalHeaders = [...headers.entries()]
      .map(([name, value]) => [name.toLowerCase(), value.trim()] as const)
      .sort(([a], [b]) => a.localeCompare(b));

    const signedHeaders = canonicalHeaders.map(([name]) => name).join(';');
    const canonicalHeadersString = canonicalHeaders
      .map(([name, value]) => `${name}:${value}\n`)
      .join('');

    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeadersString,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const scope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { authorization };
  }

  private getSignatureKey(dateStamp: string): Buffer {
    const kDate = this.hmac(Buffer.from(`AWS4${this.config.secretAccessKey}`, 'utf8'), dateStamp);
    const kRegion = this.hmac(kDate, 'auto');
    const kService = this.hmac(kRegion, 's3');
    return this.hmac(kService, 'aws4_request');
  }

  private hmac(key: Buffer, data: string): Buffer {
    return createHmac('sha256', key).update(data, 'utf8').digest();
  }
}

export class InMemoryVerificationVaultRepository implements VerificationVaultRepository {
  private readonly records = new Map<string, VaultRecord>();

  async save(record: VaultRecord): Promise<void> {
    this.records.set(this.buildKey(record.creatorId, record.verificationSessionId), record);
  }

  async get(creatorId: string, verificationSessionId: string): Promise<VaultRecord | undefined> {
    return this.records.get(this.buildKey(creatorId, verificationSessionId));
  }

  async delete(creatorId: string, verificationSessionId: string): Promise<void> {
    this.records.delete(this.buildKey(creatorId, verificationSessionId));
  }

  private buildKey(creatorId: string, verificationSessionId: string): string {
    return `${creatorId}:${verificationSessionId}`;
  }
}

export class InMemoryVaultAuditLogger implements VaultAuditLogger {
  readonly entries: VaultAuditEntry[] = [];

  async log(entry: VaultAuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

export class InMemoryVaultStorageClient implements VaultStorageClient {
  readonly objects = new Map<string, { payload: Uint8Array; metadata: Record<string, string> }>();

  async putObject(key: string, payload: Uint8Array, metadata: Record<string, string>): Promise<void> {
    this.objects.set(key, { payload, metadata });
  }

  async getObject(key: string): Promise<Uint8Array> {
    const stored = this.objects.get(key);
    if (!stored) {
      throw new Error('Object not found.');
    }
    return stored.payload;
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
