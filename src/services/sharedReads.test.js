import apiService from "./api";
import { readCategories, readSettings, readShippingMethods, shareRead } from "./sharedReads";

// sharedReads (Prompt 32): reads started in the same moment share one request;
// nothing is kept once that moment has passed.

jest.mock("./api", () => ({
  __esModule: true,
  default: {
    categories: { getAll: jest.fn() },
    settings: { get: jest.fn() },
    shipping: { getMethods: jest.fn() },
  },
}));

// Lets the current moment end (the helper forgets a read on a microtask).
const nextMoment = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => jest.clearAllMocks());

test("reads started together make one request and get the same answer", async () => {
  const categories = [{ id: 1, name: "Sofas" }];
  apiService.categories.getAll.mockResolvedValue(categories);
  const [first, second, third] = await Promise.all([
    readCategories(),
    readCategories(),
    readCategories(),
  ]);
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(1);
  expect(first).toBe(categories);
  expect(second).toBe(categories);
  expect(third).toBe(categories);
});

test("a read after that moment asks the API again (nothing is cached)", async () => {
  apiService.settings.get.mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 });
  await expect(readSettings()).resolves.toEqual({ v: 1 });
  await nextMoment();
  await expect(readSettings()).resolves.toEqual({ v: 2 });
  expect(apiService.settings.get).toHaveBeenCalledTimes(2);
});

test("a read still waiting from an earlier moment is not reused", async () => {
  let answer;
  apiService.shipping.getMethods
    .mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    .mockResolvedValueOnce(["fresh"]);
  const earlier = readShippingMethods();
  await nextMoment();
  await expect(readShippingMethods()).resolves.toEqual(["fresh"]);
  answer(["late"]);
  await expect(earlier).resolves.toEqual(["late"]);
  expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(2);
});

test("different reads never share", async () => {
  apiService.settings.get.mockResolvedValue({ store: {} });
  apiService.shipping.getMethods.mockResolvedValue([]);
  await Promise.all([readSettings(), readShippingMethods()]);
  expect(apiService.settings.get).toHaveBeenCalledTimes(1);
  expect(apiService.shipping.getMethods).toHaveBeenCalledTimes(1);
});

test("a failure reaches every caller of that moment; a throw becomes a rejection", async () => {
  apiService.categories.getAll.mockRejectedValue(new Error("Network Error"));
  const results = await Promise.allSettled([readCategories(), readCategories()]);
  expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  expect(apiService.categories.getAll).toHaveBeenCalledTimes(1);
  await nextMoment();
  await expect(
    shareRead("boom", () => {
      throw new Error("sync");
    })
  ).rejects.toThrow("sync");
});
