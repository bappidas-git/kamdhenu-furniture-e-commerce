// The storefront reads that used to answer a failure with an empty value
// (read errors, Prompt 32): a failure now reaches the caller, so a page can
// tell "none" from "could not load"; a 404 still means "nothing there". Both
// API modes, against a stubbed axios instance.

const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
};
jest.mock("axios", () => ({ __esModule: true, default: { create: () => mockHttp } }));

let mockIsMock = true;
jest.mock("./baseURL", () => ({
  __esModule: true,
  default: "http://localhost:3001",
  get IS_MOCK_API() {
    return mockIsMock;
  },
}));

// Loaded here, once the stubbed axios instance above exists (an import would
// be hoisted above it).
const apiService = require("./api").default;

const httpError = (status) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data: {} } });
const networkError = () => new Error("Network Error");

let consoleError;
beforeEach(() => {
  mockIsMock = true;
  // The reads log what failed; the tests assert what they answer.
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe.each([
  ["JSON Server", true],
  ["Laravel", false],
])("%s mode", (_, isMock) => {
  beforeEach(() => {
    mockIsMock = isMock;
  });

  const READS = [
    ["wallet.getBalance", () => apiService.wallet.getBalance(7), 0],
    ["wallet.getTransactions", () => apiService.wallet.getTransactions(7), []],
    ["coupons.getActive", () => apiService.coupons.getActive(), []],
    ["deals.getConfig", () => apiService.deals.getConfig(), { enabled: true }],
  ];

  test.each(READS)("%s: a failure reaches the caller", async (_, read) => {
    mockHttp.get.mockRejectedValueOnce(networkError());
    await expect(read()).rejects.toThrow("Network Error");
    mockHttp.get.mockRejectedValueOnce(httpError(500));
    await expect(read()).rejects.toThrow("status code 500");
  });

  test.each(READS)("%s: 404 is the empty answer, as before", async (_, read, empty) => {
    mockHttp.get.mockRejectedValueOnce(httpError(404));
    await expect(read()).resolves.toEqual(empty);
  });
});

describe("answers that work are unchanged", () => {
  test("JSON Server: the balance sums the ledger, never below 0; the rest come as served", async () => {
    mockHttp.get.mockResolvedValueOnce({
      data: [
        { type: "credit", amount: 1500 },
        { type: "debit", amount: 400 },
      ],
    });
    await expect(apiService.wallet.getBalance(7)).resolves.toBe(1100);
    expect(mockHttp.get).toHaveBeenLastCalledWith("/walletTransactions", { params: { userId: 7 } });

    mockHttp.get.mockResolvedValueOnce({ data: [{ type: "debit", amount: 50 }] });
    await expect(apiService.wallet.getBalance(7)).resolves.toBe(0);

    const ledger = [{ id: 2 }, { id: 1 }];
    mockHttp.get.mockResolvedValueOnce({ data: ledger });
    await expect(apiService.wallet.getTransactions(7)).resolves.toEqual(ledger);

    mockHttp.get.mockResolvedValueOnce({ data: [{ code: "WELCOME500" }] });
    await expect(apiService.coupons.getActive()).resolves.toEqual([{ code: "WELCOME500" }]);
    expect(mockHttp.get).toHaveBeenLastCalledWith("/coupons", { params: { isActive: true } });

    mockHttp.get.mockResolvedValueOnce({ data: { enabled: false } });
    await expect(apiService.deals.getConfig()).resolves.toEqual({ enabled: false });
  });

  test("Laravel: { success, data } is unwrapped", async () => {
    mockIsMock = false;
    mockHttp.get.mockResolvedValueOnce({ data: { success: true, data: { balance: 2302 } } });
    await expect(apiService.wallet.getBalance(7)).resolves.toBe(2302);
    expect(mockHttp.get).toHaveBeenLastCalledWith("/wallet/balance");

    mockHttp.get.mockResolvedValueOnce({ data: { success: true, data: { enabled: true, hero: {} } } });
    await expect(apiService.deals.getConfig()).resolves.toEqual({ enabled: true, hero: {} });
  });
});
