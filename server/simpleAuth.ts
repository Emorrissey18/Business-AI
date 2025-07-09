import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple authentication system for testing multi-user functionality
export function setupSimpleAuth(app: Express) {
  // Simple login endpoint that creates/finds a user by email
  app.post('/api/login', async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // First, try to find user by email
      const existingUsers = await storage.getUsers();
      let user = existingUsers.find(u => u.email === email);
      
      if (!user) {
        // Create new user
        const userId = `user-${Buffer.from(email).toString('base64').slice(0, 10)}`;
        const [firstName, lastName] = (name || email.split('@')[0]).split(' ');
        user = await storage.upsertUser({
          id: userId,
          email: email,
          firstName: firstName || 'User',
          lastName: lastName || '',
          profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=random`,
        });
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

      res.json({ success: true, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
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
}

// Simple authentication check
export const isAuthenticatedSimple: RequestHandler = (req: any, res, next) => {
  if (req.session && req.session.userId) {
    req.user = req.session.user;
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
};