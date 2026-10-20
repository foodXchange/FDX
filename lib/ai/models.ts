/**
 * Centralized AI Model Configurations.
 * gemini-3.5-flash is Google's primary production flash model with standard Free Tier & Paid Tier support.
 * Can be overridden via process.env.GEMINI_MODEL.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";
