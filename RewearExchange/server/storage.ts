import { users, items, swaps, type User, type InsertUser, type Item, type InsertItem, type Swap, type InsertSwap } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<void>;

}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        points: 100, // Starting points
      })
      .returning();
    return user;
  }

  async updateUserPoints(userId: number, points: number): Promise<void> {
    await db.update(users).set({ points }).where(eq(users.id, userId));
  }

}

export const storage = new DatabaseStorage();
