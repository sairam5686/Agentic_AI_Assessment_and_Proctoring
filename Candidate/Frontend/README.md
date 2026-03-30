# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```



{
  "_id": {
    "$oid": "69ad8853fed1505dc3e5603c"
  },
  "assessment_id": "f78e6445-e030-4680-bdfc-4b7673e4f73a",
  "question_id": "SQL_Q1",
  "testcases": [
    {
      "test_case_id": 1,
      "setup_sql": "CREATE TABLE employees (id INT, name VARCHAR(50), department VARCHAR(50), salary INT);\nINSERT INTO employees VALUES (1, 'Alice', 'Engineering', 60000);\nINSERT INTO employees VALUES (2, 'Bob', 'Marketing', 40000);\nINSERT INTO employees VALUES (3, 'Charlie', 'Engineering', 70000);\nINSERT INTO employees VALUES (4, 'Diana', 'HR', 45000);\nINSERT INTO employees VALUES (5, 'Eve', 'Engineering', 80000);",
      "expected_output": [
        [
          1,
          "Alice",
          "Engineering",
          60000
        ],
        [
          3,
          "Charlie",
          "Engineering",
          70000
        ],
        [
          5,
          "Eve",
          "Engineering",
          80000
        ]
      ],
      "marks": 10
    }
  ]
}