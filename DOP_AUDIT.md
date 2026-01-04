# DOP System Audit & Optimization

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOP Learning System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  dopLearning.ts        dopIntelligence.ts     useDOPLogic.ts   │
│  ├── recordPrompt      ├── analyzeAndEnhance  ├── analyzeRaccord│
│  ├── approvePrompt     ├── predictSuccess     ├── validateVision│
│  ├── rejectPrompt      ├── getInsights        ├── makeDecision │
│  └── searchSimilar     └── getModelRec        └── classifyErrors│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Bottlenecks Identified

### 1. Generation Speed Issues
| Step | Current Time | Bottleneck |
|------|--------------|------------|
| Reference fetch | 2-5s each | HTTP to Supabase |
| Embedding generation | 3-5s | Gemini API call |
| DOP recording | 5-10s | Blocking before used |
| Raccord validation | 5-10s | Gemini Vision call |
| Actual generation | 25-35s | Gemini model |

**TOTAL WORST CASE: 50-65s per image**

### 2. Learning Not Applied
- `analyzeAndEnhance` exists but NOT called during generation
- Successful patterns NOT used to improve prompts
- Model recommendations NOT considered

### 3. Raccord Too Lenient (FIXED)
- Now strict face matching ✅

## Optimization Plan

### Phase 1: Speed (Immediate)

1. **Make DOP recording fully async** ✅
   - Fire and forget, don't await

2. **Pre-warm cache** ✅
   - Load references before first generation

3. **Skip embedding for speed**
   - Record without embedding first
   - Generate embedding in background

4. **Parallel processing**
   - Load references in parallel ✅
   - Consider validation in background

### Phase 2: Intelligence (Apply Learnings)

1. **Use learned keywords**
   - Call `getSuggestedKeywords` before generation
   - Auto-append successful keywords to prompt

2. **Look up similar successes**
   - Call `searchSimilarPrompts` 
   - Use patterns from top results

3. **Model recommendation**
   - Suggest best model based on learnings

### Phase 3: Learning Feedback Loop

1. **Auto-approve on generation success**
   - Already partially implemented

2. **Track rejection reasons**
   - Store failure patterns

3. **Avoid known failures**
   - Check `dop_failure_patterns` before generation
   - Warn if prompt matches failure pattern

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| DOP Recording | ✅ Async | Non-blocking |
| Cache Pre-warm | ✅ Done | On batch start |
| Strict Raccord | ✅ Done | Face matching |
| Auto-retry | ✅ 1 max | With identity lock |
| Apply Learnings | ❌ TODO | Not using intelligence |
| Failure Avoidance | ❌ TODO | Not implemented |

## Recommended Quick Wins

### 1. Skip Embedding Initially
```typescript
// In recordPrompt: Save without embedding first
const record = {
    ...data,
    embedding: null // Skip for speed
};

// Then generate embedding in background
setTimeout(() => generateAndUpdateEmbedding(recordId), 100);
```

### 2. Apply Suggested Keywords
```typescript
// Before generation
const suggestedKeywords = await getSuggestedKeywords(modelId, 'scene');
const enhancedPrompt = addMissingKeywords(prompt, suggestedKeywords);
```

### 3. Parallel Validation (Non-blocking)
```typescript
// Don't await validation, let user see image while checking
performImageGeneration(sceneId);
validateInBackground(sceneId).then(result => {
    if (!result.isValid) showWarning();
});
```
