export type PaymentSettlementState = 'settled' | 'unsettled';
export type VerificationState = 'verified' | 'unverified';

export type PreflightFailureCode = 'PAYMENT_UNSETTLED' | 'IDENTITY_UNVERIFIED';

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
}

export interface VerificationProvider {
  getVerificationState(creatorIdentityId: string): Promise<VerificationState>;
}

type EvaluateCreatorPreflightParams = {
  creatorIdentityId: string;
  paymentProvider: PaymentProvider;
  verificationProvider: VerificationProvider;
};

const PAYMENT_UNSETTLED_MESSAGE = 'Payment settlement is not complete for this creator identity.';
const IDENTITY_UNVERIFIED_MESSAGE = 'Creator identity verification is incomplete.';

export async function evaluateCreatorPreflight({
  creatorIdentityId,
  paymentProvider,
  verificationProvider,
}: EvaluateCreatorPreflightParams): Promise<CreatorPreflightResult> {
  const [paymentSettlementState, verificationState] = await Promise.all([
    paymentProvider.getSettlementState(creatorIdentityId),
    verificationProvider.getVerificationState(creatorIdentityId),
  ]);

  const failures: CreatorPreflightFailure[] = [];

  if (paymentSettlementState !== 'settled') {
    failures.push({
      gate: 'payment',
      code: 'PAYMENT_UNSETTLED',
      message: PAYMENT_UNSETTLED_MESSAGE,
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
  async getSettlementState(): Promise<PaymentSettlementState> {
    const configuredState = process.env.PAYMENT_MOCK_STATE;
    return configuredState === 'unsettled' ? 'unsettled' : 'settled';
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
