import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import apiService from "../services/api";
import { AuthProvider, useAuth } from "./AuthContext";
import { OrderProvider, useOrder } from "./OrderContext";

// OrderContext (the duplicate-read follow-up, Prompt 32): it no longer reads
// the customer's orders on every signed-in page load. Nothing used that list;
// My orders reads its own, so /orders read them twice.
jest.mock("../services/api", () => ({
  __esModule: true,
  default: {
    auth: { login: jest.fn(), logout: jest.fn() },
    orders: { create: jest.fn(), getByUserId: jest.fn() },
  },
  getErrorMessage: (error) => error?.message,
}));
jest.mock("sweetalert2", () => ({ __esModule: true, default: { fire: jest.fn(() => Promise.resolve({})) } }));

const CUSTOMER = { id: 1, email: "user@example.com", firstName: "John" };

let latest;
const Probe = () => {
  latest = { order: useOrder(), auth: useAuth() };
  return <p data-testid="who">{latest.auth.user ? latest.auth.user.email : "guest"}</p>;
};

const renderOrders = () => {
  sessionStorage.setItem("user", JSON.stringify(CUSTOMER));
  sessionStorage.setItem("token", "mock-token-1-1");
  return render(
    <AuthProvider>
      <OrderProvider>
        <Probe />
      </OrderProvider>
    </AuthProvider>
  );
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  apiService.auth.logout.mockResolvedValue(undefined);
  apiService.orders.getByUserId.mockResolvedValue([]);
  apiService.orders.create.mockImplementation((order) => Promise.resolve({ ...order, id: 9 }));
});

test("a signed-in page load reads no orders", async () => {
  renderOrders();
  await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent(CUSTOMER.email));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(apiService.orders.getByUserId).not.toHaveBeenCalled();
  expect(latest.order.orders).toEqual([]);
});

test("createOrder saves the order as before, and loadUserOrders reads them when asked", async () => {
  renderOrders();
  await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent(CUSTOMER.email));
  let result;
  await act(async () => {
    result = await latest.order.createOrder({ total: 1324 });
  });
  expect(result.success).toBe(true);
  expect(apiService.orders.create).toHaveBeenCalledWith(
    expect.objectContaining({ userId: CUSTOMER.id, total: 1324, paymentStatus: "pending", fulfillmentStatus: "unfulfilled" })
  );
  expect(latest.order.orders).toHaveLength(1);
  expect(latest.order.currentOrder).toMatchObject({ id: 9 });

  apiService.orders.getByUserId.mockResolvedValue([
    { id: 1, createdAt: "2026-10-01T10:00:00.000Z" },
    { id: 2, createdAt: "2026-10-05T10:00:00.000Z" },
  ]);
  await act(async () => {
    await latest.order.loadUserOrders();
  });
  expect(apiService.orders.getByUserId).toHaveBeenCalledWith(CUSTOMER.id);
  expect(latest.order.orders.map((order) => order.id)).toEqual([2, 1]);
});

test("signing out clears the orders held", async () => {
  renderOrders();
  await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent(CUSTOMER.email));
  await act(async () => {
    await latest.order.createOrder({ total: 1 });
  });
  expect(latest.order.orders).toHaveLength(1);
  await act(async () => {
    latest.auth.logout();
  });
  expect(screen.getByTestId("who")).toHaveTextContent("guest");
  expect(latest.order.orders).toEqual([]);
});
