import { registration, scenarioInput, decisionInput } from "./index";
test("self registration rejects privilege escalation", () => {
  expect(
    registration.safeParse({
      name: "Ana",
      document: "123",
      email: "ana@example.com",
      company: "Academia",
      password: "a-long-password",
      role: "LIDER",
    }).success,
  ).toBe(false);
});
test("decisions reject fractions, negative values and score injection", () => {
  for (const body of [
    { day: 0, quantity: -1 },
    { day: 0, quantity: 1.2 },
    { day: 0, quantity: 2, score: 100 },
  ])
    expect(decisionInput.safeParse(body).success).toBe(false);
});
test("bcrypt input is limited in bytes, including multibyte passwords", () => {
  expect(
    registration.safeParse({
      name: "Ana",
      document: "123",
      email: "ana@example.com",
      company: "Academia",
      password: "😀".repeat(30),
    }).success,
  ).toBe(false);
});
test("scenario requires a nonempty realistic horizon", () => {
  expect(
    scenarioInput.safeParse({
      title: "a",
      description: "a",
      initialStock: 0,
      demand: [0, 0, 0],
      leadTime: 2,
      unitCost: 1,
      salePrice: 2,
      holdingCost: 0,
      shortageCost: 0,
      orderCost: 0,
      maxOrder: 20,
      published: true,
    }).success,
  ).toBe(false);
});
