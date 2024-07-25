import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [{
    files: ["**/*.ts"],
    rules: {
      "prefer-const": ["off"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error",{
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
      }]
    },
},{
    languageOptions: { 
        globals: globals.browser
    }
}, pluginJs.configs.recommended, ...tseslint.configs.recommended,];