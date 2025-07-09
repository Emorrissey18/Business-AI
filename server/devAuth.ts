import type { RequestHandler } from "express";
import { storage } from "./storage";

// Development authentication bypass - creates a test user
export const devAuthMiddleware: RequestHandler = async (req: any, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  try {
    // Create or get test user
    const testUserId = "dev-user-123";
    let user = await storage.getUser(testUserId);
    
    if (!user) {
      user = await storage.upsertUser({
        id: testUserId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        profileImageUrl: "https://via.placeholder.com/150",
      });
    }

    // Mock the user object to match Replit Auth structure
    req.user = {
      claims: {
        sub: testUserId,
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        profile_image_url: "https://via.placeholder.com/150"
      }
    };

    next();
  } catch (error) {
    console.error("Dev auth error:", error);
    res.status(500).json({ message: "Dev auth failed" });
  }
};

// Simple authentication check for development
export const isAuthenticatedDev: RequestHandler = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};