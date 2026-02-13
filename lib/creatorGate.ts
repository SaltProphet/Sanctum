import { getDepositByCreatorId } from './payments';

export type PaymentSettlementState = 'settled' | 'unsettled';
export type VerificationState = 'verified' | 'unverified';

export type PreflightFailureCode =
  | 'PAYMENT_UNSETTLED'
  | 'PAYMENT_FAILED_RETRYABLE'
  | 'PAYMENT_REFUNDED_RETRYABLE'
  | 'IDENTITY_UNVERIFIED';

export type CreatorPreflightFailure = {
  gate: 'payment' | 'verification';
  code: PreflightFailureCode;
  message: string;
};

export type CreatorPreflightResult = {
  ok: boolean;
  failures: CreatorPreflightFailure[];
};

export interface PaymentProvider {
  getSettlementState(creatorIdentityId: string): Promise<PaymentSettlementState>;
  getFailureCode?(creatorIdentityId: string): Promise<PreflightFailureCode | null>;
}

export interface VerificationProvider {
  getVerificationState(creatorIdentityId: string): Promise<VerificationState>;
}

type EvaluateCreatorPreflightParams = {
  creatorIdentityId: string;
  paymentProvider: PaymentProvider;
  verificationProvider: VerificationProvider;
};

const PAYMENT_UNSETTLED_MESSAGE = 'Deposit is pending settlement. Wait for provider confirmation webhook.';
const PAYMENT_FAILED_RETRYABLE_MESSAGE = 'Deposit failed. Retry by initiating a new deposit.';
const PAYMENT_REFUNDED_RETRYABLE_MESSAGE = 'Deposit was refunded. Initiate a new deposit to continue.';
const IDENTITY_UNVERIFIED_MESSAGE = 'Creator identity verification is incomplete.';

function toFailureMessage(code: PreflightFailureCode): string {
  if (code === 'PAYMENT_FAILED_RETRYABLE') {
    return PAYMENT_FAILED_RETRYABLE_MESSAGE;
  }

  if (code === 'PAYMENT_REFUNDED_RETRYABLE') {
    return PAYMENT_REFUNDED_RETRYABLE_MESSAGE;
  }

  return PAYMENT_UNSETTLED_MESSAGE;
}

export async function evaluateCreatorPreflight({
  creatorIdentityId,
  paymentProvider,
  verificationProvider,
}: EvaluateCreatorPreflightParams): Promise<CreatorPreflightResult> {
  const [paymentSettlementState, verificationState, paymentFailureCode] = await Promise.all([
    paymentProvider.getSettlementState(creatorIdentityId),
    verificationProvider.getVerificationState(creatorIdentityId),
    paymentProvider.getFailureCode?.(creatorIdentityId) ?? Promise.resolve(null),
  ]);

  const failures: CreatorPreflightFailure[] = [];

  if (paymentSettlementState !== 'settled') {
    const code = paymentFailureCode ?? 'PAYMENT_UNSETTLED';
    failures.push({
      gate: 'payment',
      code,
      message: toFailureMessage(code),
    });
  }

  if (verificationState !== 'verified') {
    failures.push({
      gate: 'verification',
      code: 'IDENTITY_UNVERIFIED',
      message: IDENTITY_UNVERIFIED_MESSAGE,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

class MockPaymentProvider implements PaymentProvider {
  async getSettlementState(creatorIdentityId: string): Promise<PaymentSettlementState> {
    const deposit = getDepositByCreatorId(creatorIdentityId);

    if (!deposit) {
      return process.env.PAYMENT_MOCK_STATE === 'unsettled' ? 'unsettled' : 'settled';
    }

    return deposit.status === 'deposit_paid' ? 'settled' : 'unsettled';
  }

  async getFailureCode(creatorIdentityId: string): Promise<PreflightFailureCode | null> {
    const deposit = getDepositByCreatorId(creatorIdentityId);

    if (!deposit) {
      return null;
    }

    if (deposit.status === 'deposit_failed') {
      return 'PAYMENT_FAILED_RETRYABLE';
    }

    if (deposit.status === 'deposit_refunded') {
      return 'PAYMENT_REFUNDED_RETRYABLE';
    }

    return null;
  }
}

class MockVerificationProvider implements VerificationProvider {
  async getVerificationState(): Promise<VerificationState> {
    const configuredState = process.env.VERIFICATION_MOCK_STATE;
    return configuredState === 'unverified' ? 'unverified' : 'verified';
  }
}

export function createPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}

export function createVerificationProvider(): VerificationProvider {
  return new MockVerificationProvider();
}
