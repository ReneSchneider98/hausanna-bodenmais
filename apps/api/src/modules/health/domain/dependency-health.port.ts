/**
 * Port: prüft, ob eine externe Abhängigkeit (Datenbank, Kanal, …) erreichbar ist.
 * Adapter liegen in ../infrastructure.
 */
export interface DependencyHealthPort {
  readonly name: string;
  isHealthy(): Promise<boolean>;
}

export const DEPENDENCY_HEALTH_CHECKS = Symbol('DEPENDENCY_HEALTH_CHECKS');
