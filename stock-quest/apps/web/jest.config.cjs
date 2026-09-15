module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: { module: "CommonJS", moduleResolution: "Node" } },
    ],
  },
};
