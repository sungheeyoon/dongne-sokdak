const eslintConfig = [
  {
    ignores: [".next/**", "coverage/**", "node_modules/**", "out/**", "build/**"]
  },
  {
    rules: {
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
