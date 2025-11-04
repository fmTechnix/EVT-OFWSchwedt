import type { User, AssignmentHistory, Settings } from "@shared/schema";
import type { IStorage } from "./storage";

export interface FairnessScoreOptions {
  position: string;
  vehicleName: string;
  requiredQuals: string[];
  assignedForDate: string;
  rotationWindow: number;
  rotationWeights?: Record<string, number>;
}

export interface ScoredUser {
  user: User;
  score: number;
  breakdown: {
    recencyPenalty: number;
    scarcityBonus: number;
    positionWeight: number;
    totalAssignments: number;
    finalScore: number;
  };
}

/**
 * Fairness-Scoring System für gleichmäßige Positionsverteilung
 * 
 * Scoring-Komponenten:
 * 1. Recency Penalty: Strafe für kürzlich vergebene gleiche Position
 * 2. Scarcity Bonus: Bonus für seltene Qualifikationen
 * 3. Position Weight: Gewichtung nach Position (Fahrer rotieren schneller)
 * 4. Total Assignments: Berücksichtigt Gesamtzahl der Zuteilungen
 * 
 * Niedrigerer Score = höhere Priorität für Zuteilung
 */
export class FairnessScorer {
  private storage: IStorage;
  
  // Cached data for performance optimization
  private userHistoryCache: Map<string, AssignmentHistory[]> = new Map();
  private userMetricsCache: Map<string, AssignmentHistory> | null = null;
  private fairnessMetricsCache: Map<string, any> = new Map();
  
  // Default position weights (higher = rotates faster)
  private static DEFAULT_POSITION_WEIGHTS: Record<string, number> = {
    'Maschinist': 3.0,           // Fahrer rotieren am schnellsten
    'Staffelführer': 2.0,        // Führungspositionen rotieren mittel
    'Gruppenführer': 2.0,
    'Truppführer': 1.5,
    'Angriffstrupp': 1.0,        // Standard-Positionen
    'Wassertrupp': 1.0,
    'Schlauchtrupp': 1.0,
    'Sicherheitstrupp': 1.0,
    'Melder': 1.0,
  };

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Preload history and metrics for all users (performance optimization)
   * Call this before scoring multiple positions to avoid O(users × slots) queries
   */
  async preloadUserData(userIds: string[], rotationWindow: number): Promise<void> {
    // Batch-load all histories in parallel
    const historyPromises = userIds.map(userId => 
      this.storage.getAssignmentHistory(userId, rotationWindow)
        .then(history => ({ userId, history }))
    );
    
    const histories = await Promise.all(historyPromises);
    
    // Cache results
    this.userHistoryCache.clear();
    for (const { userId, history } of histories) {
      this.userHistoryCache.set(userId, history);
    }
    
    // Batch-load all fairness metrics
    const metricsPromises = userIds.map(userId =>
      this.storage.getFairnessMetrics(userId)
        .then(metrics => ({ userId, metrics }))
    );
    
    const allMetrics = await Promise.all(metricsPromises);
    
    this.fairnessMetricsCache.clear();
    for (const { userId, metrics } of allMetrics) {
      if (metrics) {
        this.fairnessMetricsCache.set(userId, metrics);
      }
    }
  }

  /**
   * Clear cache (call after completing all assignments for a run)
   */
  clearCache(): void {
    this.userHistoryCache.clear();
    this.fairnessMetricsCache.clear();
  }

  /**
   * Berechnet Fairness-Scores für alle qualifizierten Benutzer
   */
  async scoreUsersForPosition(
    availableUsers: User[],
    options: FairnessScoreOptions
  ): Promise<ScoredUser[]> {
    const scoredUsers: ScoredUser[] = [];
    
    // Ermittle alle Benutzer mit benötigten Qualifikationen
    const qualifiedUsers = availableUsers.filter(user => 
      this.hasRequiredQualifications(user, options.requiredQuals)
    );

    if (qualifiedUsers.length === 0) {
      return [];
    }

    // Berechne Scarcity für Position basierend auf Qualifikationen
    const scarcityBonus = await this.calculateScarcityBonus(
      qualifiedUsers.length,
      availableUsers.length
    );

    // Position Weight aus Konfiguration oder Default
    const positionWeights = options.rotationWeights || FairnessScorer.DEFAULT_POSITION_WEIGHTS;
    const positionWeight = positionWeights[options.position] || 1.0;

    for (const user of qualifiedUsers) {
      // Use cached data if available, otherwise fetch
      const history = this.userHistoryCache.get(user.id) || 
        await this.storage.getAssignmentHistory(user.id, options.rotationWindow);
      
      // Filter history for this specific position
      const positionHistory = history.filter(h => h.position === options.position);

      // Berechne Recency Penalty
      const recencyPenalty = this.calculateRecencyPenalty(
        positionHistory,
        options.assignedForDate,
        options.rotationWindow
      );

      // Use cached fairness metrics if available
      const fairnessMetrics = this.fairnessMetricsCache.get(user.id) ||
        await this.storage.getFairnessMetrics(user.id);
      const totalAssignments = fairnessMetrics?.total_assignments || 0;

      // Berechne finalen Score
      // Niedrigerer Score = höhere Priorität
      const finalScore = 
        totalAssignments +                    // Basis: Gesamtzahl der Zuteilungen
        (recencyPenalty * positionWeight) -   // Penalty für kürzliche Zuteilungen (gewichtet)
        scarcityBonus;                        // Bonus für seltene Qualifikationen

      scoredUsers.push({
        user,
        score: finalScore,
        breakdown: {
          recencyPenalty,
          scarcityBonus,
          positionWeight,
          totalAssignments,
          finalScore,
        },
      });
    }

    // Sortiere nach Score (niedrigster zuerst = höchste Priorität)
    return scoredUsers.sort((a, b) => a.score - b.score);
  }

  /**
   * Prüft ob Benutzer alle erforderlichen Qualifikationen hat
   */
  private hasRequiredQualifications(user: User, requiredQuals: string[]): boolean {
    if (requiredQuals.length === 0) return true;
    return requiredQuals.every(qual => user.qualifikationen.includes(qual));
  }

  /**
   * Berechnet Recency Penalty basierend auf kürzlichen Zuteilungen
   * 
   * Logik:
   * - Kürzlichste Zuteilung hat höchste Strafe
   * - Strafe nimmt ab je länger die letzte Zuteilung her ist
   * - Innerhalb des Rotations-Fensters: 0-10 Punkte Strafe
   */
  private calculateRecencyPenalty(
    positionHistory: AssignmentHistory[],
    currentDate: string,
    rotationWindow: number
  ): number {
    if (positionHistory.length === 0) {
      return 0; // Keine Strafe wenn noch nie zugeteilt
    }

    // Sortiere nach Datum (neueste zuerst)
    const sortedHistory = [...positionHistory].sort(
      (a, b) => new Date(b.assigned_for_date).getTime() - new Date(a.assigned_for_date).getTime()
    );

    const mostRecentAssignment = sortedHistory[0];
    const daysSinceLastAssignment = this.calculateDaysBetween(
      mostRecentAssignment.assigned_for_date,
      currentDate
    );

    // Rotationsfenster in Tagen
    const windowDays = rotationWindow * 7;

    if (daysSinceLastAssignment >= windowDays) {
      return 0; // Außerhalb des Rotations-Fensters
    }

    // Lineare Strafe: 10 Punkte bei 0 Tagen, 0 Punkte bei windowDays
    const penalty = 10 * (1 - daysSinceLastAssignment / windowDays);
    
    // Zusätzliche Strafe für mehrfache Zuteilungen im Fenster
    const assignmentsInWindow = sortedHistory.filter(a => 
      this.calculateDaysBetween(a.assigned_for_date, currentDate) < windowDays
    ).length;
    
    const repeatPenalty = (assignmentsInWindow - 1) * 2; // +2 Punkte pro zusätzlicher Zuteilung

    return penalty + repeatPenalty;
  }

  /**
   * Berechnet Scarcity Bonus
   * 
   * Logik:
   * - Wenn nur wenige Benutzer qualifiziert sind, gibt's einen Bonus
   * - Verhindert dass seltene Spezialisten zu oft eingeteilt werden
   */
  private async calculateScarcityBonus(
    qualifiedCount: number,
    totalAvailable: number
  ): Promise<number> {
    if (totalAvailable === 0) return 0;
    
    const scarcityRatio = qualifiedCount / totalAvailable;
    
    // Wenn weniger als 30% qualifiziert sind -> Bonus
    if (scarcityRatio < 0.3) {
      return 3; // Hoher Bonus für sehr seltene Qualifikationen
    } else if (scarcityRatio < 0.5) {
      return 1.5; // Mittlerer Bonus
    }
    
    return 0; // Kein Bonus wenn viele qualifiziert sind
  }

  /**
   * Berechnet Tage zwischen zwei Datumsangaben
   */
  private calculateDaysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Aktualisiert Fairness-Metriken nach Zuteilung
   */
  async updateAfterAssignment(
    userId: string,
    position: string,
    vehicleName: string,
    assignedForDate: string
  ): Promise<void> {
    // Erstelle History-Eintrag
    await this.storage.createAssignmentHistory({
      user_id: userId,
      position,
      vehicle_name: vehicleName,
      assigned_for_date: assignedForDate,
    });

    // Aktualisiere Fairness-Metriken
    await this.storage.updateFairnessMetrics(userId, position);
  }
}
