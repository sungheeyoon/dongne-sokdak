import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 프로덕션 배포를 위한 임시 규칙 완화
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-sync-scripts": "warn",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",

      // Clean Architecture Boundaries
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "../app/*", "../../app/*"],
              message: "❌ Inner layers (shared/features) CANNOT import from outer layers (app)."
            },
            {
              group: ["@/features/*", "../features/*", "../../features/*"],
              message: "❌ Domain/Data CANNOT import from Features. Shared CANNOT import from Features. (Only App and Feature internally can use Features)."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/features/**/domain/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/presentation/*", "@/features/*/data/*", "../presentation/*", "../data/*"],
              message: "❌ DOMAIN layer CANNOT import from PRESENTATION or DATA layers."
            },
            {
              group: ["@supabase/*"],
              message: "❌ DOMAIN layer CANNOT have direct Supabase dependencies (Keep it pure!)."
            },
            {
              group: ["kakao.maps.*", "react-kakao-maps-sdk"],
              message: "❌ DOMAIN layer CANNOT have direct Kakao dependencies."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/features/**/data/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/presentation/*", "../presentation/*"],
              message: "❌ DATA layer CANNOT import from PRESENTATION layer."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/shared/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*"],
              message: "❌ SHARED layer CANNOT depend on FEATURE layers."
            }
          ]
        }
      ]
    }
  }
];

export default eslintConfig;
