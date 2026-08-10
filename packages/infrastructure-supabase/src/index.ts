// Concrete adapters implementing ports defined in @duomatch/application
// (repositories, RPC callers, realtime subscriptions). Depends on domain
// types only — application wires the concrete adapter in, this package
// never imports application.
export { SupabaseAchievementsRepository } from "./supabase-achievements-repository.js";
export type { SupabaseAchievementInputs } from "./supabase-achievements-repository.js";
export { SupabaseRoundRulesRepository } from "./supabase-round-rules-repository.js";
export type { SupabaseRoundRuleInputs } from "./supabase-round-rules-repository.js";
