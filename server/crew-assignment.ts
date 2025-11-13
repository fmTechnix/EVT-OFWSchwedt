import type { User, VehicleConfig, Settings } from "@shared/schema";
import type { IStorage } from "./storage";
import { FairnessScorer } from "./fairness-scoring";

export interface SlotAssignment {
  position: string;
  assignedUser: User | null;
  required: string[];
  prefer: string[];
  addons_required: string[];
  allow_fallback: boolean;
}

export interface VehicleAssignment {
  vehicle: string;
  type: string;
  slots: SlotAssignment[];
  fulfilled: boolean;
  constraintsMet: boolean;
  warnings: string[];
}

export interface CrewAssignmentResult {
  assignments: VehicleAssignment[];
  unassignedUsers: User[];
  totalFulfilled: number;
  totalVehicles: number;
  warnings: string[];
}

function hasQualification(user: User, qual: string): boolean {
  return user.qualifikationen.includes(qual);
}

function hasAnyQualification(user: User, quals: string[]): boolean {
  return quals.some(q => hasQualification(user, q));
}

function hasAllQualifications(user: User, quals: string[]): boolean {
  return quals.every(q => hasQualification(user, q));
}

function calculateUserScore(user: User, slot: any): number {
  let score = 0;
  
  // Required qualifications must be met (handled before scoring)
  
  // Prefer qualifications add to score
  if (slot.prefer) {
    for (const pref of slot.prefer) {
      if (hasQualification(user, pref)) {
        score += 10;
      }
    }
  }
  
  // Addon qualifications add bonus points
  if (slot.addons_required) {
    for (const addon of slot.addons_required) {
      if (hasQualification(user, addon)) {
        score += 5;
      }
    }
  }
  
  return score;
}

function canFulfillSlot(user: User, slot: any): boolean {
  // Check requires (all required)
  if (slot.requires && slot.requires.length > 0) {
    if (!hasAllQualifications(user, slot.requires)) {
      return false;
    }
  }
  
  // Check requires_any (at least one required)
  if (slot.requires_any && slot.requires_any.length > 0) {
    if (!hasAnyQualification(user, slot.requires_any)) {
      return false;
    }
  }
  
  // Check addons_required if slot doesn't allow fallback
  if (!slot.allow_fallback && slot.addons_required && slot.addons_required.length > 0) {
    if (!hasAllQualifications(user, slot.addons_required)) {
      return false;
    }
  }
  
  return true;
}

function checkVehicleConstraints(
  vehicleConfig: VehicleConfig,
  assignments: SlotAssignment[]
): { met: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const constraints = vehicleConfig.constraints as any;
  
  if (!constraints) {
    return { met: true, warnings: [] };
  }
  
  const assignedUsers = assignments
    .filter(a => a.assignedUser !== null)
    .map(a => a.assignedUser!);
  
  // Check min_agt_total
  if (constraints.min_agt_total !== undefined) {
    const agtCount = assignedUsers.filter(u => hasQualification(u, "AGT")).length;
    if (agtCount < constraints.min_agt_total) {
      warnings.push(
        `Nicht genug AGT: ${agtCount}/${constraints.min_agt_total} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  // Check min_agt_watertrupp
  if (constraints.min_agt_watertrupp !== undefined) {
    // Find Wassertrupp positions - check for both full names and abbreviations
    // WT = Wassertrupp (WTF, WTM), AT = Angriffstrupp (ATF, ATM)
    const waterTruppSlots = assignments.filter(a => {
      const pos = a.position.toLowerCase();
      return pos.includes("wassertrupp") || 
             pos.includes("angriffstrupp") ||
             pos.startsWith("wt") ||  // WTF, WTM
             pos.startsWith("at");    // ATF, ATM
    });
    const waterAgtCount = waterTruppSlots.filter(
      a => a.assignedUser && hasQualification(a.assignedUser, "AGT")
    ).length;
    if (waterAgtCount < constraints.min_agt_watertrupp) {
      warnings.push(
        `Nicht genug AGT im Wassertrupp: ${waterAgtCount}/${constraints.min_agt_watertrupp}`
      );
    }
  }
  
  // Check min_maschinist_total
  if (constraints.min_maschinist_total !== undefined) {
    const maschinistCount = assignedUsers.filter(u => hasQualification(u, "MASCH")).length;
    if (maschinistCount < constraints.min_maschinist_total) {
      warnings.push(
        `Nicht genug MASCH: ${maschinistCount}/${constraints.min_maschinist_total} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  // Check min_gf_total
  if (constraints.min_gf_total !== undefined) {
    const gfCount = assignedUsers.filter(u => hasQualification(u, "GF")).length;
    if (gfCount < constraints.min_gf_total) {
      warnings.push(
        `Nicht genug GF: ${gfCount}/${constraints.min_gf_total} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  // Check min_funk_total
  if (constraints.min_funk_total !== undefined) {
    const funkCount = assignedUsers.filter(u => hasQualification(u, "FUNK")).length;
    if (funkCount < constraints.min_funk_total) {
      warnings.push(
        `Nicht genug FUNK: ${funkCount}/${constraints.min_funk_total} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  // Check prefer_th_total
  if (constraints.prefer_th_total !== undefined) {
    const thCount = assignedUsers.filter(u => hasQualification(u, "TH")).length;
    if (thCount < constraints.prefer_th_total) {
      warnings.push(
        `Empfohlen: ${constraints.prefer_th_total} TH, aktuell: ${thCount} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  // Check prefer_fueass_total
  if (constraints.prefer_fueass_total !== undefined) {
    const fueassCount = assignedUsers.filter(u => hasQualification(u, "FUEASS")).length;
    if (fueassCount < constraints.prefer_fueass_total) {
      warnings.push(
        `Empfohlen: ${constraints.prefer_fueass_total} FUEASS, aktuell: ${fueassCount} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  // Check min_cbrn_erkkw_total
  if (constraints.min_cbrn_erkkw_total !== undefined) {
    const cbrnCount = assignedUsers.filter(u => hasQualification(u, "CBRN_ERKKW")).length;
    if (cbrnCount < constraints.min_cbrn_erkkw_total) {
      warnings.push(
        `Nicht genug CBRN_ERKKW: ${cbrnCount}/${constraints.min_cbrn_erkkw_total} (${vehicleConfig.vehicle})`
      );
    }
  }
  
  const met = warnings.length === 0;
  return { met, warnings };
}

export async function assignCrewToVehicles(
  users: User[],
  vehicleConfigs: VehicleConfig[],
  storage: IStorage,
  assignedForDate: string
): Promise<CrewAssignmentResult> {
  // Filter out system_admin users - they should never be assigned to crew positions
  // Note: Regular "admin" role (operative admins) ARE included in assignments
  const operationalUsers = users.filter(u => u.role !== "system_admin");
  const availableUsers = [...operationalUsers];
  const assignments: VehicleAssignment[] = [];
  const globalWarnings: string[] = [];
  
  // Initialize fairness scorer
  const fairnessScorer = new FairnessScorer(storage);
  
  // Get settings for rotation configuration
  const settings = await storage.getSettings();
  const rotationWindow = settings.rotation_window || 4;
  const rotationWeights = settings.rotation_weights as Record<string, number> | undefined;
  
  // Preload all user history and metrics for performance (single batch query)
  const allUserIds = operationalUsers.map(u => u.id);
  await fairnessScorer.preloadUserData(allUserIds, rotationWindow);
  
  let totalFulfilled = 0;
  
  for (const vehicleConfig of vehicleConfigs) {
    const vehicleAssignment: VehicleAssignment = {
      vehicle: vehicleConfig.vehicle,
      type: vehicleConfig.type,
      slots: [],
      fulfilled: false,
      constraintsMet: false,
      warnings: [],
    };
    
    const slots = vehicleConfig.slots as any[];
    
    for (const slot of slots) {
      const slotAssignment: SlotAssignment = {
        position: slot.position,
        assignedUser: null,
        required: slot.requires || [],
        prefer: slot.prefer || [],
        addons_required: slot.addons_required || [],
        allow_fallback: slot.allow_fallback !== false,
      };
      
      // Find eligible users for this slot
      const eligibleUsers = availableUsers.filter(user => canFulfillSlot(user, slot));
      
      if (eligibleUsers.length > 0) {
        // Calculate qualification scores (prefer qualifications)
        const usersWithQualScore = eligibleUsers.map(user => ({
          user,
          qualScore: calculateUserScore(user, slot),
        }));
        
        // Calculate fairness scores
        const requiredQuals = [
          ...(slot.requires || []),
          ...(slot.requires_any || []),
        ];
        
        const scoredUsers = await fairnessScorer.scoreUsersForPosition(
          eligibleUsers,
          {
            position: slot.position,
            vehicleName: vehicleConfig.vehicle,
            requiredQuals,
            assignedForDate,
            rotationWindow,
            rotationWeights,
          }
        );
        
        // Combine qualification and fairness scores
        // Higher qualification score = better match
        // Lower fairness score = higher priority
        // We normalize and combine them
        const combinedScores = scoredUsers.map(scored => {
          const qualUser = usersWithQualScore.find(u => u.user.id === scored.user.id);
          const qualScore = qualUser?.qualScore || 0;
          
          // Combined score: Qualification bonus - Fairness penalty
          // This ensures qualified users are preferred, but fairness balances the load
          const combinedScore = qualScore - (scored.score * 0.5);
          
          return {
            user: scored.user,
            combinedScore,
            qualScore,
            fairnessScore: scored.score,
            breakdown: scored.breakdown,
          };
        });
        
        // Sort by combined score (higher is better)
        combinedScores.sort((a, b) => b.combinedScore - a.combinedScore);
        
        // Assign best match
        const bestMatch = combinedScores[0];
        slotAssignment.assignedUser = bestMatch.user;
        
        // Remove from available pool
        const index = availableUsers.indexOf(bestMatch.user);
        if (index > -1) {
          availableUsers.splice(index, 1);
        }
        
        // Update fairness metrics (async, but we don't await to improve performance)
        fairnessScorer.updateAfterAssignment(
          bestMatch.user.id,
          slot.position,
          vehicleConfig.vehicle,
          assignedForDate
        ).catch(err => {
          console.error("Error updating fairness metrics:", err);
        });
      }
      
      vehicleAssignment.slots.push(slotAssignment);
    }
    
    // Check if all slots are filled
    const allSlotsFilled = vehicleAssignment.slots.every(s => s.assignedUser !== null);
    vehicleAssignment.fulfilled = allSlotsFilled;
    
    if (allSlotsFilled) {
      totalFulfilled++;
    }
    
    // Check constraints
    const constraintCheck = checkVehicleConstraints(vehicleConfig, vehicleAssignment.slots);
    vehicleAssignment.constraintsMet = constraintCheck.met;
    vehicleAssignment.warnings = constraintCheck.warnings;
    
    globalWarnings.push(...constraintCheck.warnings);
    
    assignments.push(vehicleAssignment);
  }
  
  // Clear cache after assignment run
  fairnessScorer.clearCache();
  
  return {
    assignments,
    unassignedUsers: availableUsers,
    totalFulfilled,
    totalVehicles: vehicleConfigs.length,
    warnings: globalWarnings,
  };
}
