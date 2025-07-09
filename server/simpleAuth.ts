import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { loginSchema, signupSchema } from "@shared/schema";

// Password-based authentication system
export function setupSimpleAuth(app: Express) {
  // Login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const existingUsers = await storage.getUsers();
      const user = existingUsers.find(u => u.email === validatedData.email);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if user has password (for migration compatibility)
      if (!user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Set session
      (req as any).session.userId = user.id;
      (req as any).session.user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      };

      res.json({ success: true, user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Signup endpoint
  app.post('/api/signup', async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUsers = await storage.getUsers();
      const existingUser = existingUsers.find(u => u.email === validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create new user
      const userId = `user-${Buffer.from(validatedData.email).toString('base64').slice(0, 10)}`;
      const user = await storage.upsertUser({
        id: userId,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(validatedData.firstName + ' ' + validatedData.lastName)}&background=random`,
      });

      // Set session
      (req as any).session.userId = user.id;
      (req as any).session.user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      };

      res.json({ success: true, user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Debug route for checking users (temporary)
  app.get('/api/debug/users', async (req, res) => {
    try {
      const users = await storage.getUsers();
      const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        hasPassword: !!u.password,
        firstName: u.firstName,
        lastName: u.lastName
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Debug users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
}

// Simple authentication check
export const isAuthenticatedSimple: RequestHandler = (req: any, res, next) => {
  if (req.session && req.session.userId) {
    req.user = req.session.user;
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
};