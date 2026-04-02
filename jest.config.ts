import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Use commonjs for Jest compatibility
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts", "**/*.test.tsx"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  collectCoverageFrom: [
    "lib/**/*.ts",
    "app/api/**/*.ts",
    "components/**/*.tsx",
    "!**/*.d.ts",
  ],
};

export default config;
