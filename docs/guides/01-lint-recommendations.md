# Lint Recommendations

Quick reference for ESLint fixes. For the full audit with detailed findings by file, see [ESLint Audit (Mar 2026)](../reports/03-eslint-audit-2026-03.md).

## Immediate: Exclude Build Directories

Add to `.eslintignore` or ESLint config `ignores`:
```
release-builds/
release-builds-v2/
```

## Quick Mechanical Fixes

- `prefer-const` on `main.ts:207` — change `let` to `const`
- `@ts-ignore` → `@ts-expect-error` on `nefViewer.ts:314`
- Prefix unused vars with `_` or remove
- Replace `require()` with `import` in `main.ts:277`
- Remove empty interface in `db.ts:640`

## React Hooks Issues

- Refactor synchronous setState in effects (`useDatabase.ts`, `useFolders.ts`)
- Fix `useCallback` dependency in `useDatabase.ts:237`
- Address missing dependency warnings in `useEffect`/`useCallback`

## Type Safety

- Tackle `any` elimination file-by-file, starting with `electron.d.ts` and `preload.ts`
