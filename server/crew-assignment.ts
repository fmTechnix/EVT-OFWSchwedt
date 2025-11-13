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

/**
 * Multi-Pass Crew Assignment Algorithm
 * 
 * Ensures tactical vehicles (LF/HLF) are prioritized over support vehicles (MTF/ELW).
 * Prevents qualified personnel from sitting idle on low-priority vehicles while
 * critical positions remain empty on high-priority vehicles.
 * 
 * Algorithm:
 * 1. Group vehicles by priority tier (1=tactical, 2=special, 3=support)
 * 2. Pass 1: Assign crew to Priority 1 vehicles (LF/HLF/TLF)
 * 3. Pass 2: Assign crew to Priority 2 vehicles (DL/RW)
 * 4. Pass 3: Assign crew to Priority 3 vehicles (MTF/ELW)
 * 5. Reassignment: Move qualified personnel from low-priority to high-priority gaps
 */
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
  
  // Get current mission type to determine correct vehicle priorities
  const einsatz = await storage.getEinsatz();
  const missionType = einsatz.einsatzart || 'standard';
  
  // Get vehicle priorities from database
  const vehiclePriorities = await storage.getAllVehiclePriorities();
  const priorityMap = new Map<string, number>();
  
  // Build priority map based on current mission type
  for (const vp of vehiclePriorities) {
    let priority: number;
    switch (missionType) {
      case 'brandeinsatz':
        priority = vp.brandeinsatz_priority;
        break;
      case 'technische_hilfeleistung':
        priority = vp.th_priority;
        break;
      case 'gefahrgut':
        priority = vp.gefahrgut_priority;
        break;
      default:
        priority = vp.standard_priority;
    }
    priorityMap.set(vp.vehicle_type, priority);
  }
  
  // Group vehicles by priority tier
  const vehiclesByPriority = new Map<number, VehicleConfig[]>();
  for (const config of vehicleConfigs) {
    const priority = priorityMap.get(config.type) || 3; // Default to lowest priority
    if (!vehiclesByPriority.has(priority)) {
      vehiclesByPriority.set(priority, []);
    }
    vehiclesByPriority.get(priority)!.push(config);
  }
  
  // Sort priority tiers (1 = highest, 3 = lowest)
  const sortedPriorities = Array.from(vehiclesByPriority.keys()).sort((a, b) => a - b);
  
  let totalFulfilled = 0;
  
  // MULTI-PASS ASSIGNMENT: Process each priority tier sequentially
  for (const priority of sortedPriorities) {
    const vehiclesInTier = vehiclesByPriority.get(priority) || [];
    
    for (const vehicleConfig of vehiclesInTier) {
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
  }
  
  // REASSIGNMENT PHASE: Move qualified personnel from low to high-priority gaps
  // This ensures tactical vehicles are fully staffed before support vehicles
  let reassignmentsMade = 0;
  const affectedVehicleNames = new Set<string>();
  
  // Build map of original slot definitions from vehicleConfigs for accurate qualification checking
  const slotDefinitionsMap = new Map<string, any[]>();
  for (const vc of vehicleConfigs) {
    slotDefinitionsMap.set(vc.vehicle, vc.slots as any[]);
  }
  
  // Process priority tiers from highest to lowest
  for (const targetPriority of sortedPriorities) {
    if (targetPriority === 3) break; // Don't reassign TO priority 3 vehicles
    
    const targetVehicles = assignments.filter(va => {
      const vPriority = priorityMap.get(va.type) || 3;
      return vPriority === targetPriority && !va.fulfilled;
    });
    
    for (const targetVehicle of targetVehicles) {
      // Find empty slots in this vehicle
      const emptySlotIndices = targetVehicle.slots
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => slot.assignedUser === null);
      
      for (const { slot: emptySlot, index: emptySlotIndex } of emptySlotIndices) {
        // Get original slot definition with all qualification rules
        const originalSlotDef = slotDefinitionsMap.get(targetVehicle.vehicle)?.[emptySlotIndex];
        if (!originalSlotDef) continue;
        
        // Search for qualified personnel in lower-priority vehicles (priority 3)
        const sourcePriority = 3;
        const sourceVehicles = assignments.filter(va => {
          const vPriority = priorityMap.get(va.type) || 3;
          return vPriority === sourcePriority;
        });
        
        // Find candidates: users assigned to source vehicles who could fill this slot
        const candidates: Array<{ user: User; sourceVehicle: VehicleAssignment; sourceSlotIndex: number }> = [];
        
        for (const sourceVehicle of sourceVehicles) {
          sourceVehicle.slots.forEach((sourceSlot, slotIndex) => {
            if (sourceSlot.assignedUser !== null) {
              // Use original slot definition for accurate qualification checking
              if (canFulfillSlot(sourceSlot.assignedUser, originalSlotDef)) {
                candidates.push({
                  user: sourceSlot.assignedUser,
                  sourceVehicle,
                  sourceSlotIndex: slotIndex,
                });
              }
            }
          });
        }
        
        if (candidates.length > 0) {
          // Score candidates using fairness
          const requiredQuals = [
            ...(originalSlotDef.requires || []),
            ...(originalSlotDef.requires_any || []),
          ];
          
          const scoredCandidates = await fairnessScorer.scoreUsersForPosition(
            candidates.map(c => c.user),
            {
              position: emptySlot.position,
              vehicleName: targetVehicle.vehicle,
              requiredQuals,
              assignedForDate,
              rotationWindow,
              rotationWeights,
            }
          );
          
          // Find best candidate (lowest fairness score = most in need of assignment)
          const bestScored = scoredCandidates.reduce((best, current) =>
            current.score < best.score ? current : best
          );
          
          const bestCandidate = candidates.find(c => c.user.id === bestScored.user.id)!;
          
          // REASSIGN: Move user from source to target
          emptySlot.assignedUser = bestCandidate.user;
          bestCandidate.sourceVehicle.slots[bestCandidate.sourceSlotIndex].assignedUser = null;
          
          reassignmentsMade++;
          affectedVehicleNames.add(targetVehicle.vehicle);
          affectedVehicleNames.add(bestCandidate.sourceVehicle.vehicle);
          
          // Update fairness history: modify existing entry instead of creating duplicate
          fairnessScorer.updateAfterReassignment(
            bestCandidate.user.id,
            emptySlot.position,
            targetVehicle.vehicle,
            assignedForDate
          ).catch(err => {
            console.error("Error updating fairness history during reassignment:", err);
          });
        }
      }
    }
  }
  
  // Re-evaluate all affected vehicles (both targets and sources)
  for (const vehicleName of affectedVehicleNames) {
    const vehicle = assignments.find(va => va.vehicle === vehicleName);
    if (!vehicle) continue;
    
    const vehicleConfig = vehicleConfigs.find(vc => vc.vehicle === vehicleName)!;
    
    // Re-check fulfillment
    const wasFulfilled = vehicle.fulfilled;
    const allSlotsFilled = vehicle.slots.every(s => s.assignedUser !== null);
    vehicle.fulfilled = allSlotsFilled;
    
    // Update totalFulfilled count
    if (allSlotsFilled && !wasFulfilled) {
      totalFulfilled++;
    } else if (!allSlotsFilled && wasFulfilled) {
      totalFulfilled--;
    }
    
    // Re-check constraints
    const constraintCheck = checkVehicleConstraints(vehicleConfig, vehicle.slots);
    vehicle.constraintsMet = constraintCheck.met;
    vehicle.warnings = constraintCheck.warnings;
    
    // Update global warnings
    globalWarnings.push(...constraintCheck.warnings);
  }
  
  if (reassignmentsMade > 0) {
    globalWarnings.unshift(
      `Reassignment: ${reassignmentsMade} Personen von Support-Fahrzeugen auf taktische Fahrzeuge verschoben`
    );
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
