import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/auth/session/route";
import { withSuppressedConsoleError } from "./test-utils";

// Mock next/headers
const mockCookies = {
  set: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookies)),
}));

describe("/api/auth/session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should set session cookie successfully", async () => {
      const mockToken = "mock-firebase-token-12345";
      const request = new NextRequest(
        "http://localhost:3000/api/auth/session",
        {
          method: "POST",
          body: JSON.stringify({ token: mockToken }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockCookies.set).toHaveBeenCalledWith(
        "firebase-session-token",
        mockToken,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 5, // 5 days
          path: "/",
        }
      );
    });
    it("should handle invalid JSON", async () => {
      await withSuppressedConsoleError(async () => {
        const request = new NextRequest(
          "http://localhost:3000/api/auth/session",
          {
            method: "POST",
            body: "invalid-json",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to set session" });
      });
    });
    it("should set secure cookie in production", async () => {
      // Mock process.env using jest.replaceProperty
      const originalEnv = process.env.NODE_ENV;
      jest.replaceProperty(process, "env", {
        ...process.env,
        NODE_ENV: "production",
      });

      const mockToken = "mock-firebase-token-12345";
      const request = new NextRequest(
        "http://localhost:3000/api/auth/session",
        {
          method: "POST",
          body: JSON.stringify({ token: mockToken }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCookies.set).toHaveBeenCalledWith(
        "firebase-session-token",
        mockToken,
        expect.objectContaining({
          secure: true,
        })
      );

      // Restore original env
      jest.replaceProperty(process, "env", {
        ...process.env,
        NODE_ENV: originalEnv,
      });
    });
    it("should set non-secure cookie in development", async () => {
      // Mock process.env using jest.replaceProperty
      const originalEnv = process.env.NODE_ENV;
      jest.replaceProperty(process, "env", {
        ...process.env,
        NODE_ENV: "development",
      });

      const mockToken = "mock-firebase-token-12345";
      const request = new NextRequest(
        "http://localhost:3000/api/auth/session",
        {
          method: "POST",
          body: JSON.stringify({ token: mockToken }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCookies.set).toHaveBeenCalledWith(
        "firebase-session-token",
        mockToken,
        expect.objectContaining({
          secure: false,
        })
      );

      // Restore original env
      jest.replaceProperty(process, "env", {
        ...process.env,
        NODE_ENV: originalEnv,
      });
    });
  });

  describe("DELETE", () => {
    it("should delete session cookie successfully", async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockCookies.delete).toHaveBeenCalledWith("firebase-session-token");
    });
    it("should handle cookie deletion errors gracefully", async () => {
      await withSuppressedConsoleError(async () => {
        mockCookies.delete.mockImplementationOnce(() => {
          throw new Error("Cookie deletion failed");
        });

        const response = await DELETE();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to delete session" });
      });
    });
  });
});
