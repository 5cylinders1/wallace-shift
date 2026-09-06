import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  /*
   * React Three Fiber's frame loop is imperative by design.
   *
   * `react-hooks/immutability` is a React Compiler rule: it assumes a
   * component only ever describes UI, so any write to an object it did
   * not create locally is a purity violation. Inside `useFrame` that
   * assumption does not hold — the callback runs once per animation
   * frame, outside React's render, and its entire job is to write to
   * three.js objects (camera transforms, shader uniforms, render target
   * bindings) and to the mutable channels the scene shares. Routing that
   * through React state is the one thing a 60fps render loop must not do.
   *
   * Scoped to the experiment's directory, and only to that rule. Every
   * other hook rule — including render-phase purity, which caught a real
   * bug here — still applies, and the production site is untouched.
   */
  {
    files: ['src/components/experiments/water-hero/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
)
