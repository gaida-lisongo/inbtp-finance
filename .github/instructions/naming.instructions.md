# Naming and organization rules

Apply these rules when creating or renaming files, folders, exports, props, and helpers.

## Files and exports
- Components: PascalCase file names, default export only when it matches local project style in nearby files
- Hooks: `useFeatureName.ts`
- Contexts: `FeatureContext.tsx`
- Utility files: name them by purpose, such as `formatCurrency.ts` or `buildChartOptions.ts`

## Props and variables
- Prefer descriptive prop names like `items`, `title`, `onSubmit`, `isOpen`, `selectedValue`
- Avoid vague names such as `data`, `value`, or `item` when a more specific name is available
- Boolean props should read naturally, such as `isLoading`, `hasError`, `showIcon`

## Folders
- Put shared UI in existing shared folders
- Keep route-only code near the route unless it has clear reuse potential
- Do not create deep folder nesting without a concrete organizational reason

## Consistency
- Mirror naming used by adjacent files when extending an existing feature area
- Prefer renaming new code to match the repository over forcing the repository to match a new naming style
