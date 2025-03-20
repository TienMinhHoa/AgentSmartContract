import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
	js.configs.recommended,
	{
		plugins: {
			prettier,
			import: importPlugin,
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				process: 'readonly',
			},
		},
		rules: {
			'prettier/prettier': [
				'error',
				{
					singleQuote: true,
					semi: true,
					trailingComma: 'all',
					printWidth: 100,
				},
			],
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'no-console': 'off',
			'import/order': [
				'error',
				{
					'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
					'newlines-between': 'always',
				},
			],
		},
		settings: {
			'import/resolver': {
				node: {
					extensions: ['.js', '.jsx', '.ts', '.tsx'],
				},
			},
		},
	},
];
