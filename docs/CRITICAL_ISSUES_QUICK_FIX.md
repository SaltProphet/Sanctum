# Critical Issues - Quick Fix Guide

**⚠️ PRODUCTION BLOCKER - Application Currently Cannot Build or Run**

This document provides immediate fixes for the 3 critical issues preventing the application from building and running.

---

## 🔴 Issue #1: Syntax Error in Dashboard Page

**File**: `/app/dashboard/page.tsx`  
**Lines**: 242-286  
**Error**: `await` used in non-async function; malformed try-catch block

### Current Code (BROKEN):
```typescript
const handleRegister = useCallback(
  (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthFeedback('');
    
    // ... validation code ...
    
    setIsLoading(true);
    
    try {
      const passwordHash = await hashPassword(registerPassword);  // ❌ await without async
      const nextAccount: CreatorAccount = {
        // ... account creation ...
      };
      
      writeStoredAccount(nextAccount);
      // ... more code ...
      
    } finally {
      setIsLoading(false);
    });  // ❌ Missing closing brace for try block
  },
  [registerEmail, registerName, registerPassword, registerSlug],
);
```

### Fixed Code:
```typescript
const handleRegister = useCallback(
  async (event: React.FormEvent<HTMLFormElement>) => {  // ✅ Added async
    event.preventDefault();
    setAuthFeedback('');
    
    // ... validation code ...
    
    setIsLoading(true);
    
    try {
      const passwordHash = await hashPassword(registerPassword);  // ✅ Now valid
      const nextAccount: CreatorAccount = {
        // ... account creation ...
      };
      
      writeStoredAccount(nextAccount);
      // ... more code ...
      
    } finally {
      setIsLoading(false);
    }  // ✅ Fixed closing brace
  },
  [registerEmail, registerName, registerPassword, registerSlug],
);
```

### Apply Fix:
```bash
# Edit /app/dashboard/page.tsx
# Line 242: Change to: async (event: React.FormEvent<HTMLFormElement>) => {
# Line 286: Change to: }
```

---

## 🔴 Issue #2: Variable Redeclaration in Watermark Module

**File**: `/lib/watermark.ts`  
**Lines**: 148-159  
**Error**: Variable `watermarkId` declared twice; unreachable code

### Current Code (BROKEN):
```typescript
export function getWatermarkMetadata(sessionId: string, clientIpHash: string, roomId: string) {
  const watermarkId = hashValue(`${sessionId}:${clientIpHash}:${roomId}`);
  return { sessionId, clientIpHash, roomId, watermarkId };
  const watermarkId = computeHmacHash(`${sessionId}:${clientIpHash}:${roomId}`);  // ❌ Redeclaration + dead code
  
  return {  // ❌ Unreachable
    sessionId,
    clientIpHash,
    roomId,
    watermarkId,
  };
}
```

### Fixed Code:
```typescript
export function getWatermarkMetadata(sessionId: string, clientIpHash: string, roomId: string) {
  const watermarkId = hashValue(`${sessionId}:${clientIpHash}:${roomId}`);
  return { sessionId, clientIpHash, roomId, watermarkId };
}
```

### Apply Fix:
```bash
# Edit /lib/watermark.ts
# Delete lines 151-158 (everything after the first return statement)
```

---

## 🔴 Issue #3: Missing Import in Meeting Token Route

**File**: `/app/api/meeting-token/route.ts`  
**Line**: 36  
**Error**: `MAX_TOKEN_TTL_SECONDS` used but not imported

### Current Code (BROKEN):
```typescript
import type { NextRequest } from 'next/server';
import { parseJsonResponse, isValidString } from '@/lib/jsonUtils';

// ... other code ...

function getTokenExpiration(nowEpochSeconds: number, roomExpiration: number): number | null {
  const maxTokenExpiration = nowEpochSeconds + MAX_TOKEN_TTL_SECONDS;  // ❌ Not imported
  // ...
}
```

### Fixed Code:
```typescript
import type { NextRequest } from 'next/server';
import { parseJsonResponse, isValidString } from '@/lib/jsonUtils';
import { MAX_TOKEN_TTL_SECONDS } from '@/lib/meetingToken';  // ✅ Added import

// ... other code ...

function getTokenExpiration(nowEpochSeconds: number, roomExpiration: number): number | null {
  const maxTokenExpiration = nowEpochSeconds + MAX_TOKEN_TTL_SECONDS;  // ✅ Now valid
  // ...
}
```

### Apply Fix:
```bash
# Edit /app/api/meeting-token/route.ts
# Add after line 2: import { MAX_TOKEN_TTL_SECONDS } from '@/lib/meetingToken';
```

---

## 🔴 Bonus Fix: Test Import Issue (Non-blocking)

**File**: `/lib/creatorGate.ts`  
**Line**: 1  
**Error**: Module import missing `.ts` extension causes test failure

### Current Code:
```typescript
import { getDepositByCreatorId } from './payments';  // ❌ Missing extension
```

### Fixed Code:
```typescript
import { getDepositByCreatorId } from './payments.ts';  // ✅ Added extension
```

### Apply Fix:
```bash
# Edit /lib/creatorGate.ts
# Line 1: Change to: import { getDepositByCreatorId } from './payments.ts';
```

---

## Verification Steps

After applying all fixes:

### 1. Build the application
```bash
npm run build
```
**Expected**: Build should complete successfully with no errors

### 2. Run tests
```bash
npm test
```
**Expected**: All 47 tests should pass (previously 45/47 passed)

### 3. Verify lint
```bash
npm run lint
```
**Expected**: No linting errors

### 4. Check for TypeScript errors
```bash
npx tsc --noEmit
```
**Expected**: No type errors

---

## Next Steps

After fixing these critical issues:

1. **Address high-severity security issues** (see `SECURITY_AUDIT_REPORT.md`)
2. **Upgrade vulnerable dependencies**:
   ```bash
   npm install next@latest
   npm audit fix
   ```
3. **Add authentication to unprotected endpoints**
4. **Review environment variable configuration**

---

## Emergency Contact

If you encounter issues applying these fixes:
- Review the full audit report: `docs/SECURITY_AUDIT_REPORT.md`
- Check syntax carefully (brackets, parentheses, semicolons)
- Ensure you're editing the correct files and line numbers

**Last Updated**: 2026-02-13
