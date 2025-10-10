## ShadCN Migration Follow-ups

- **Board polish**: review drag handles/add-stage interactions for additional microstates (skeletons, hover cues) and consider shadcn `Separator` between columns when scrollable.
- **Form controls**: replace bespoke checkboxes, toggles, and selects across `SettingsPage` and other forms with the shared `Switch`, `Checkbox`, and upcoming `Select` primitives.
- **Feedback patterns**: consolidate toasts, alerts, and empty states using shadcn `Alert`/`Toast` once scaffolding is in place, aligning messaging with the new palette.
- **Theming**: revisit `src/index.css` after the remaining screens migrate to fine-tune color tokens, surface layering, and spacing scale.
