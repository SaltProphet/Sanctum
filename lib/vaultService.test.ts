import test from 'node:test';
import assert from 'node:assert/strict';

import {
  InMemoryVaultAuditLogger,
  InMemoryVaultStorageClient,
  InMemoryVerificationVaultRepository,
  VerificationVaultService,
  type VaultActor,
} from './vaultService.ts';

const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

const creatorActor: VaultActor = { id: 'creator-user', role: 'creator' };
const adminActor: VaultActor = { id: 'admin-user', role: 'admin' };
const complianceActor: VaultActor = { id: 'compliance-user', role: 'compliance' };

const createService = () => {
  const storage = new InMemoryVaultStorageClient();
  const repository = new InMemoryVerificationVaultRepository();
  const auditLogger = new InMemoryVaultAuditLogger();

  const service = new VerificationVaultService({
    storage,
    repository,
    auditLogger,
    encryptionKey: ENCRYPTION_KEY,
  });

  return { service, storage, repository, auditLogger };
};

test('writes deterministic object keys, metadata to storage, and integrity hash to DB record', async () => {
  const { service, storage } = createService();
  const artifact = new Uint8Array([1, 2, 3, 4]);

  const record = await service.writeArtifact(creatorActor, {
    creatorId: 'a0f5b03d-4554-4e18-bc59-f6ae3f8f6dcb',
    verificationSessionId: 'f288f92e-5f32-4876-ad3f-a86f3ee911c5',
    artifact,
    metadata: {
      captureTimestamp: '2026-01-01T00:00:00.000Z',
      documentCountry: 'US',
      documentType: 'passport',
      verificationDecision: 'approved',
      providerReferenceIds: ['ref-1', 'ref-2'],
    },
    sensitive: {
      piiPointer: 'pii://bucket/doc/123',
      legalName: 'Jane Example',
      dobFragment: '1990-01',
    },
  });

  assert.equal(
    record.objectKey,
    'verification-artifacts/a0f5b03d-4554-4e18-bc59-f6ae3f8f6dcb/f288f92e-5f32-4876-ad3f-a86f3ee911c5',
  );
  assert.equal(record.integritySha256.length, 64);
  assert.ok(record.encryptedSensitive);
  assert.notEqual(record.encryptedSensitive?.ciphertext, Buffer.from('Jane Example').toString('base64'));

  const stored = storage.objects.get(record.objectKey);
  assert.ok(stored);
  assert.deepEqual(stored?.metadata, {
    'capture-timestamp': '2026-01-01T00:00:00.000Z',
    'document-country': 'US',
    'document-type': 'passport',
    'verification-decision': 'approved',
    'provider-reference-ids': 'ref-1,ref-2',
  });
});

test('blocks creators from reading raw artifacts and emits audit log for denied attempts', async () => {
  const { service, auditLogger } = createService();

  await service.writeArtifact(creatorActor, {
    creatorId: 'creator-1',
    verificationSessionId: 'session-1',
    artifact: new Uint8Array([5]),
    metadata: {
      captureTimestamp: '2026-01-01T00:00:00.000Z',
      documentCountry: 'GB',
      documentType: 'id_card',
      verificationDecision: 'approved',
      providerReferenceIds: ['provider-id'],
    },
  });

  await assert.rejects(
    service.readArtifact(creatorActor, 'creator-1', 'session-1'),
    /not allowed to read vault artifacts/,
  );

  const deniedRead = auditLogger.entries.find(
    (entry) => entry.action === 'read' && !entry.success && entry.reason === 'forbidden',
  );
  assert.ok(deniedRead);
});

test('allows admin/compliance reads and decrypts sensitive fields', async () => {
  const { service } = createService();

  await service.writeArtifact(creatorActor, {
    creatorId: 'creator-2',
    verificationSessionId: 'session-2',
    artifact: new Uint8Array([9, 9, 9]),
    metadata: {
      captureTimestamp: '2026-03-04T01:02:03.000Z',
      documentCountry: 'CA',
      documentType: 'driver_license',
      verificationDecision: 'manual_review',
      providerReferenceIds: ['check-xyz'],
    },
    sensitive: {
      piiPointer: 'pii://vault/pointer/2',
      legalName: 'John Example',
      dobFragment: '1988-07',
    },
  });

  const adminRead = await service.readArtifact(adminActor, 'creator-2', 'session-2');
  assert.equal(adminRead.sensitive?.legalName, 'John Example');

  const complianceRead = await service.readArtifact(complianceActor, 'creator-2', 'session-2');
  assert.equal(complianceRead.record.metadata.documentType, 'driver_license');
});

test('logs write/read/delete attempts including failures', async () => {
  const { service, auditLogger } = createService();

  await service.writeArtifact(creatorActor, {
    creatorId: 'creator-3',
    verificationSessionId: 'session-3',
    artifact: new Uint8Array([1]),
    metadata: {
      captureTimestamp: '2026-01-01T00:00:00.000Z',
      documentCountry: 'DE',
      documentType: 'passport',
      verificationDecision: 'rejected',
      providerReferenceIds: ['provider-3'],
    },
  });

  await assert.rejects(
    service.deleteArtifact(creatorActor, 'creator-3', 'session-3'),
    /not allowed to delete/,
  );

  await service.deleteArtifact(adminActor, 'creator-3', 'session-3');

  assert.equal(
    auditLogger.entries.filter((entry) => entry.action === 'write').length,
    1,
  );
  assert.equal(
    auditLogger.entries.filter((entry) => entry.action === 'delete').length,
    2,
  );
  assert.ok(
    auditLogger.entries.some(
      (entry) => entry.action === 'delete' && !entry.success && entry.reason === 'forbidden',
    ),
  );
  assert.ok(
    auditLogger.entries.some((entry) => entry.action === 'delete' && entry.success),
  );
});
