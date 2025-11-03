import type { User, VehicleConfig } from "@shared/schema";

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

export function assignCrewToVehicles(
  users: User[],
  vehicleConfigs: VehicleConfig[]
): CrewAssignmentResult {
  const availableUsers = [...users];
  const assignments: VehicleAssignment[] = [];
  const globalWarnings: string[] = [];
  
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
        // Sort by score (prefer qualifications)
        eligibleUsers.sort((a, b) => calculateUserScore(b, slot) - calculateUserScore(a, slot));
        
        // Assign best match
        const bestUser = eligibleUsers[0];
        slotAssignment.assignedUser = bestUser;
        
        // Remove from available pool
        const index = availableUsers.indexOf(bestUser);
        if (index > -1) {
          availableUsers.splice(index, 1);
        }
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
  
  return {
    assignments,
    unassignedUsers: availableUsers,
    totalFulfilled,
    totalVehicles: vehicleConfigs.length,
    warnings: globalWarnings,
  };
}
