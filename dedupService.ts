import { ParsedConfig } from "../parser/base.parser";
import { computeFingerprint } from "./fingerprint";
import { FingerprintRepo } from "../database/repositories/fingerprint.repo";
import { SettingsRepo } from "../database/repositories/settings.repo";

export interface DedupResult {
  isDuplicate: boolean;
  fingerprint: string;
}

export function checkDuplicate(config: ParsedConfig): DedupResult {
  const fingerprint = computeFingerprint(config);

  if (!SettingsRepo.getBool("duplicate_blocking_enabled")) {
    return { isDuplicate: false, fingerprint };
  }

  const existing = FingerprintRepo.find(fingerprint);
  if (existing) {
    FingerprintRepo.touch(fingerprint);
    return { isDuplicate: true, fingerprint };
  }

  return { isDuplicate: false, fingerprint };
}

export function registerFingerprint(fingerprint: string, configId: number): void {
  FingerprintRepo.save(fingerprint, configId);
}
